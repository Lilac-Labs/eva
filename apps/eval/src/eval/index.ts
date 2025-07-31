import {
  bulkCreateEvalResults,
  completeEvalRun,
  createEvalRun,
  type EvalResultExpected,
  type EvalResultInput,
  type EvalResultMetadata,
  type EvalResultOutput,
  type EvalRun,
  type EvalScore,
  failEvalRun,
  findOrCreateEvalContext,
  type TypedEvalResultData,
  updateEvalRunProgress,
} from '@repo/db';
import { Presets, SingleBar } from 'cli-progress';
import pLimit from 'p-limit';

import type { BaseScore, DataItem, EvalConfig } from './eval.types';

export class Eval<Input, Expected, Output, Score extends BaseScore> {
  readonly #dataProvider: () =>
    | Array<DataItem<Input, Expected>>
    | Promise<Array<DataItem<Input, Expected>>>;
  readonly #taskFn: ({
    data,
  }: {
    data: DataItem<Input, Expected>;
  }) => Output | Promise<Output>;
  readonly #scorers: Array<
    ({
      output,
      data,
    }: {
      output: Output;
      data: DataItem<Input, Expected>;
    }) => Score | Promise<Score>
  >;
  readonly #config: EvalConfig;
  #currentEvalRun: EvalRun | null = null;

  constructor({
    dataProvider,
    taskFn,
    scorers,
    config,
  }: {
    dataProvider: () =>
      | Array<DataItem<Input, Expected>>
      | Promise<Array<DataItem<Input, Expected>>>;
    taskFn: ({
      data,
    }: {
      data: DataItem<Input, Expected>;
    }) => Output | Promise<Output>;
    scorers: Array<
      ({
        output,
        data,
      }: {
        output: Output;
        data: DataItem<Input, Expected>;
      }) => Score | Promise<Score>
    >;
    config: EvalConfig;
  }) {
    this.#dataProvider = dataProvider;
    this.#taskFn = taskFn;
    this.#scorers = scorers;
    this.#config = config;
  }

  async evaluate(): Promise<{ scores: Score[][] }> {
    const data = await this.#dataProvider();

    // Set up database context if configured
    if (this.#config.projectName !== undefined) {
      try {
        const context = await findOrCreateEvalContext({
          projectName: this.#config.projectName,
          evalName: this.#config.name,
          evalDescription: this.#config.evalDescription,
        });

        const evalRun = await createEvalRun({
          evalNameId: context.evalName.id,
          maxConcurrency: this.#config.maxConcurrency,
          totalItems: data.length,
          outputDir: this.#config.outputDir,
        });

        this.#currentEvalRun = evalRun;
      } catch (error) {
        console.error('Failed to set up database context:', error);
        throw error;
      }
    }

    // Create a concurrency limiter
    const limit = pLimit(this.#config.maxConcurrency);

    const progressBar = new SingleBar(
      {
        format: `${
          this.#config.name
        } [{bar}] {percentage}% | ETA: {eta}s | {value}/{total} items`,
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
      },
      Presets.shades_classic,
    );

    progressBar.start(data.length, 0);
    let completed = 0;
    const results: TypedEvalResultData[] = [];
    const progressUpdateInterval = Math.max(1, Math.floor(data.length / 20)); // Update progress at most 20 times

    // Prepare output file if outputDir is specified
    let outputFilePath: string | undefined;
    if (this.#config.outputDir !== undefined) {
      const fs = await import('fs/promises');
      const path = await import('path');

      outputFilePath = path.join(
        this.#config.outputDir,
        `${this.#config.name}-evaluation-results.jsonl`,
      );

      // Ensure directory exists
      await fs.mkdir(this.#config.outputDir, { recursive: true });

      // Create or clear the file
      await fs.writeFile(outputFilePath, '');
    }

    // Process all items concurrently with limited concurrency
    const promises = data.map((item, index): Promise<Score[]> => {
      return limit(async (): Promise<Score[]> => {
        try {
          const output = await this.#taskFn({ data: item });
          const scores = await Promise.all(
            this.#scorers.map((scorer): Score | Promise<Score> => {
              return scorer({ output, data: item });
            }),
          );

          // Write individual score to JSONL file if outputDir is specified
          if (outputFilePath !== undefined) {
            await this.#appendScoreToJsonl(
              scores,
              index,
              item,
              output,
              outputFilePath,
            );
          }

          // Collect result for batch storage if database is configured
          if (
            this.#currentEvalRun !== null &&
            this.#config.projectName !== undefined
          ) {
            results.push({
              evalRunId: this.#currentEvalRun.id,
              itemIndex: index,
              input: this.#convertToEvalResultInput(item.input),
              expected:
                item.expected !== undefined
                  ? this.#convertToEvalResultExpected(item.expected)
                  : undefined,
              output: this.#convertToEvalResultOutput(output),
              scores: this.#convertToEvalScores(scores),
              metadata:
                item.metadata !== undefined
                  ? this.#convertToEvalResultMetadata(item.metadata)
                  : undefined,
            });
          }

          completed++;
          progressBar.update(completed);

          // Update progress in database less frequently
          if (
            this.#currentEvalRun !== null &&
            progressUpdateInterval > 0 &&
            (completed % progressUpdateInterval === 0 ||
              completed === data.length)
          ) {
            try {
              await updateEvalRunProgress(this.#currentEvalRun.id, completed);
            } catch (error) {
              console.error('Failed to update eval run progress:', error);
              // Continue execution even if progress update fails
            }
          }

          return scores;
        } catch (error) {
          // Mark eval run as failed if database is configured
          if (this.#currentEvalRun !== null) {
            try {
              await failEvalRun(this.#currentEvalRun.id);
            } catch (dbError) {
              console.error('Failed to mark eval run as failed:', dbError);
            }
          }
          throw error;
        }
      });
    });

    try {
      // Wait for all items to be processed
      const allScores = await Promise.all(promises);
      progressBar.stop();

      // Ensure final progress update
      if (this.#currentEvalRun !== null && completed === data.length) {
        try {
          await updateEvalRunProgress(this.#currentEvalRun.id, completed);
        } catch (error) {
          console.error('Failed to update final progress:', error);
        }
      }

      // Bulk store all results and complete eval run
      if (this.#currentEvalRun !== null && results.length > 0) {
        try {
          await bulkCreateEvalResults(results);
          await completeEvalRun(this.#currentEvalRun.id);
        } catch (error) {
          console.error(
            'Failed to store results or mark eval run as completed:',
            error,
          );
          // Try to mark as failed
          try {
            await failEvalRun(this.#currentEvalRun.id);
          } catch (failError) {
            console.error('Failed to mark eval run as failed:', failError);
          }
        }
      } else if (this.#currentEvalRun !== null) {
        // No results to store, just mark as completed
        try {
          await completeEvalRun(this.#currentEvalRun.id);
        } catch (error) {
          console.error('Failed to mark eval run as completed:', error);
        }
      }

      return { scores: allScores };
    } catch (error) {
      progressBar.stop();

      // Mark eval run as failed if database is configured
      if (this.#currentEvalRun !== null) {
        try {
          await failEvalRun(this.#currentEvalRun.id);
        } catch (dbError) {
          console.error('Failed to mark eval run as failed:', dbError);
        }
      }

      throw error;
    }
  }

  // Helper methods to convert generic types to database types
  #convertToEvalResultInput(input: Input): EvalResultInput {
    if (input === null || input === undefined) {
      return {};
    }
    if (typeof input === 'object') {
      return input as EvalResultInput;
    }
    return { value: input };
  }

  #convertToEvalResultExpected(expected: Expected): EvalResultExpected {
    if (expected === null || expected === undefined) {
      return {};
    }
    if (typeof expected === 'object') {
      return expected as EvalResultExpected;
    }
    return { value: expected };
  }

  #convertToEvalResultOutput(output: Output): EvalResultOutput {
    if (output === null || output === undefined) {
      return {};
    }
    if (typeof output === 'object') {
      return output as EvalResultOutput;
    }
    return { value: output };
  }

  #convertToEvalScores(scores: Score[]): EvalScore[] {
    return scores.map((score): EvalScore => {
      return {
        name: score.name,
        value: score.value,
        // Include any additional properties from the score
        ...(typeof score === 'object' && score !== null ? score : {}),
      };
    });
  }

  #convertToEvalResultMetadata(
    metadata: Record<string, unknown>,
  ): EvalResultMetadata {
    return metadata as EvalResultMetadata;
  }

  // Helper method to append a score to the JSONL file
  async #appendScoreToJsonl(
    scores: Score[],
    index: number,
    item: DataItem<Input, Expected>,
    output: Output,
    filePath: string,
  ): Promise<void> {
    const fs = await import('fs/promises');

    // Create a record that includes the score, the index, and relevant metadata
    const record = {
      scores,
      index,
      input: item.input,
      expected: item.expected,
      metadata: item.metadata,
      output,
    };

    // Append as a single line (JSONL format)
    await fs.appendFile(filePath, `${JSON.stringify(record)}\n`);
  }
}

import { Presets, SingleBar } from "cli-progress";
import pLimit from "p-limit";

import type { BaseScore, DataItem, EvalConfig } from "./eval.types";

export type { BaseScore, DataItem, EvalConfig } from "./eval.types";

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

    // Create a concurrency limiter
    const limit = pLimit(this.#config.maxConcurrency);

    const progressBar = new SingleBar(
      {
        format: `${
          this.#config.name
        } [{bar}] {percentage}% | ETA: {eta}s | {value}/{total} items`,
        barCompleteChar: "\u2588",
        barIncompleteChar: "\u2591",
      },
      Presets.shades_classic,
    );

    progressBar.start(data.length, 0);
    let completed = 0;

    // Prepare output file if outputDir is specified
    let outputFilePath: string | undefined;
    if (this.#config.outputDir !== undefined) {
      const fs = await import("fs/promises");
      const path = await import("path");

      outputFilePath = path.join(
        this.#config.outputDir,
        `${this.#config.name}-evaluation-results.jsonl`,
      );

      // Ensure directory exists
      await fs.mkdir(this.#config.outputDir, { recursive: true });

      // Create or clear the file
      await fs.writeFile(outputFilePath, "");
    }

    // Process all items concurrently with limited concurrency
    const promises = data.map((item, index): Promise<Score[]> => {
      return limit(async (): Promise<Score[]> => {
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

        completed++;
        progressBar.update(completed);

        return scores;
      });
    });

    // Wait for all items to be processed
    const allScores = await Promise.all(promises);
    progressBar.stop();
    // Return scores and statistics
    return { scores: allScores };
  }

  // Helper method to append a score to the JSONL file
  async #appendScoreToJsonl(
    scores: Score[],
    index: number,
    item: DataItem<Input, Expected>,
    output: Output,
    filePath: string,
  ): Promise<void> {
    const fs = await import("fs/promises");

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

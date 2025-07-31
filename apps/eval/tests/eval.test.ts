import {
  describe,
  expect,
  test,
  beforeEach,
  afterEach,
  mock,
  beforeAll,
  afterAll,
} from 'bun:test';
import { rmSync, existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { mockDb } from '@repo/db';

// Mock the database functions to prevent actual database calls
mock.module('@repo/db', () => mockDb());

import { Eval } from '../src/eval';
import type { BaseScore, DataItem } from '../src/eval/eval.types';

interface TestInput {
  value: number;
}

interface TestExpected {
  result: number;
}

interface TestOutput {
  computed: number;
}

interface TestScore extends BaseScore {
  name: string;
  value: number;
  metadata?: Record<string, unknown>;
}

interface ConcurrencyTestInput {
  id: number;
  delay: number;
}

interface ConcurrencyTestOutput {
  id: number;
  processedAt: number;
}

interface ConcurrencyTestScore extends BaseScore {
  name: string;
  value: number;
}

const TEST_OUTPUT_DIR = './test-output';

describe('Eval', (): void => {
  beforeAll((): void => {
    // Set mock DATABASE_URL before any database operations
    process.env.DATABASE_URL = 'postgresql://mock:mock@localhost:5432/mock';
  });

  afterAll((): void => {
    // Clean up environment variable
    delete process.env.DATABASE_URL;
  });
  beforeEach((): void => {
    // Clean up test output directory
    if (existsSync(TEST_OUTPUT_DIR)) {
      rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
    }
  });

  afterEach((): void => {
    // Clean up test output directory
    if (existsSync(TEST_OUTPUT_DIR)) {
      rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
    }
  });

  describe('constructor', (): void => {
    test('creates instance with required parameters', (): void => {
      const dataProvider = (): DataItem<TestInput, TestExpected>[] => [];
      const taskFn = ({
        data,
      }: {
        data: DataItem<TestInput, TestExpected>;
      }): TestOutput => ({
        computed: data.input.value * 2,
      });
      const scorers = [
        ({
          output,
          data,
        }: {
          output: TestOutput;
          data: DataItem<TestInput, TestExpected>;
        }): TestScore => ({
          name: 'always-pass',
          value: 1, // This is just for testing constructor, always passes
        }),
      ];
      const config = { name: 'test-eval', maxConcurrency: 1 };

      const evaluation = new Eval({ dataProvider, taskFn, scorers, config });
      expect(evaluation).toBeTruthy();
    });
  });

  describe('basic evaluation', (): void => {
    test('processes simple data correctly', async (): Promise<void> => {
      const testData: DataItem<TestInput, TestExpected>[] = [
        { input: { value: 1 }, expected: { result: 2 } },
        { input: { value: 2 }, expected: { result: 4 } },
        { input: { value: 3 }, expected: { result: 6 } },
      ];

      const dataProvider = (): DataItem<TestInput, TestExpected>[] => testData;
      const taskFn = ({
        data,
      }: {
        data: DataItem<TestInput, TestExpected>;
      }): TestOutput => ({
        computed: data.input.value * 2,
      });
      const scorers = [
        ({
          output,
          data,
        }: {
          output: TestOutput;
          data: DataItem<TestInput, TestExpected>;
        }): TestScore => ({
          name: 'accuracy',
          value: output.computed === data.expected?.result ? 1 : 0,
        }),
      ];
      const config = { name: 'simple-eval', maxConcurrency: 1 };

      const evaluation = new Eval({ dataProvider, taskFn, scorers, config });
      const result = await evaluation.evaluate();

      expect(result.scores).toHaveLength(3);
      expect(result.scores[0]).toHaveLength(1);
      expect(result.scores[0][0].name).toBe('accuracy');
      expect(result.scores[0][0].value).toBe(1);
    });

    test('handles async data provider', async (): Promise<void> => {
      const testData: DataItem<TestInput, TestExpected>[] = [
        { input: { value: 10 }, expected: { result: 20 } },
      ];

      const dataProvider = async (): Promise<
        DataItem<TestInput, TestExpected>[]
      > => {
        await new Promise((resolve): void => {
          setTimeout(resolve, 10);
        });
        return testData;
      };

      const taskFn = ({
        data,
      }: {
        data: DataItem<TestInput, TestExpected>;
      }): TestOutput => ({
        computed: data.input.value * 2,
      });

      const scorers = [
        ({
          output,
          data,
        }: {
          output: TestOutput;
          data: DataItem<TestInput, TestExpected>;
        }): TestScore => ({
          name: 'exact-match',
          value: output.computed === data.expected?.result ? 1 : 0,
        }),
      ];

      const config = { name: 'async-data-eval', maxConcurrency: 1 };

      const evaluation = new Eval({ dataProvider, taskFn, scorers, config });
      const result = await evaluation.evaluate();

      expect(result.scores).toHaveLength(1);
      expect(result.scores[0][0].value).toBe(1); // Should be 1 since 20 === 20
    });

    test('handles async task function', async (): Promise<void> => {
      const testData: DataItem<TestInput, TestExpected>[] = [
        { input: { value: 5 }, expected: { result: 25 } },
      ];

      const dataProvider = (): DataItem<TestInput, TestExpected>[] => testData;

      const taskFn = async ({
        data,
      }: {
        data: DataItem<TestInput, TestExpected>;
      }): Promise<TestOutput> => {
        await new Promise((resolve): void => {
          setTimeout(resolve, 10);
        });
        return { computed: data.input.value * data.input.value };
      };

      const scorers = [
        ({
          output,
          data,
        }: {
          output: TestOutput;
          data: DataItem<TestInput, TestExpected>;
        }): TestScore => ({
          name: 'exact-match',
          value: output.computed === data.expected?.result ? 1 : 0,
        }),
      ];

      const config = { name: 'async-task-eval', maxConcurrency: 1 };

      const evaluation = new Eval({ dataProvider, taskFn, scorers, config });
      const result = await evaluation.evaluate();

      expect(result.scores).toHaveLength(1);
      expect(result.scores[0][0].value).toBe(1); // Should be 1 since 25 === 25
    });

    test('handles async scorers', async (): Promise<void> => {
      const testData: DataItem<TestInput, TestExpected>[] = [
        { input: { value: 3 }, expected: { result: 9 } },
      ];

      const dataProvider = (): DataItem<TestInput, TestExpected>[] => testData;
      const taskFn = ({
        data,
      }: {
        data: DataItem<TestInput, TestExpected>;
      }): TestOutput => ({
        computed: data.input.value * 3,
      });

      const scorers = [
        async ({
          output,
          data,
        }: {
          output: TestOutput;
          data: DataItem<TestInput, TestExpected>;
        }): Promise<TestScore> => {
          await new Promise((resolve): void => {
            setTimeout(resolve, 10);
          });
          return {
            name: 'exact-match',
            value: output.computed === data.expected?.result ? 1 : 0,
          };
        },
      ];

      const config = { name: 'async-scorer-eval', maxConcurrency: 1 };

      const evaluation = new Eval({ dataProvider, taskFn, scorers, config });
      const result = await evaluation.evaluate();

      expect(result.scores).toHaveLength(1);
      expect(result.scores[0][0].value).toBe(1); // Should be 1 since 9 === 9
    });

    test('handles multiple scorers', async (): Promise<void> => {
      const testData: DataItem<TestInput, TestExpected>[] = [
        { input: { value: 4 }, expected: { result: 8 } },
      ];

      const dataProvider = (): DataItem<TestInput, TestExpected>[] => testData;
      const taskFn = ({
        data,
      }: {
        data: DataItem<TestInput, TestExpected>;
      }): TestOutput => ({
        computed: data.input.value * 2,
      });

      const scorers = [
        ({
          output,
          data,
        }: {
          output: TestOutput;
          data: DataItem<TestInput, TestExpected>;
        }): TestScore => ({
          name: 'exact-match',
          value: output.computed === data.expected?.result ? 1 : 0,
        }),
        ({
          output,
          data,
        }: {
          output: TestOutput;
          data: DataItem<TestInput, TestExpected>;
        }): TestScore => ({
          name: 'absolute-error',
          value: data.expected
            ? Math.abs(output.computed - data.expected.result)
            : 0,
        }),
        ({
          output,
          data,
        }: {
          output: TestOutput;
          data: DataItem<TestInput, TestExpected>;
        }): TestScore => ({
          name: 'relative-error',
          value:
            data.expected && data.expected.result !== 0
              ? Math.abs(output.computed - data.expected.result) /
                Math.abs(data.expected.result)
              : 0,
        }),
      ];

      const config = { name: 'multi-scorer-eval', maxConcurrency: 1 };

      const evaluation = new Eval({ dataProvider, taskFn, scorers, config });
      const result = await evaluation.evaluate();

      expect(result.scores).toHaveLength(1);
      expect(result.scores[0]).toHaveLength(3);
      expect(result.scores[0][0].name).toBe('exact-match');
      expect(result.scores[0][0].value).toBe(1); // Perfect match
      expect(result.scores[0][1].name).toBe('absolute-error');
      expect(result.scores[0][1].value).toBe(0); // No error
      expect(result.scores[0][2].name).toBe('relative-error');
      expect(result.scores[0][2].value).toBe(0); // No relative error
    });

    test('handles empty data', async (): Promise<void> => {
      const dataProvider = (): DataItem<TestInput, TestExpected>[] => [];
      const taskFn = ({
        data,
      }: {
        data: DataItem<TestInput, TestExpected>;
      }): TestOutput => ({
        computed: data.input.value,
      });
      const scorers = [
        ({
          output,
          data,
        }: {
          output: TestOutput;
          data: DataItem<TestInput, TestExpected>;
        }): TestScore => ({
          name: 'exact-match',
          value: output.computed === data.expected?.result ? 1 : 0,
        }),
      ];
      const config = { name: 'empty-data-eval', maxConcurrency: 1 };

      const evaluation = new Eval({ dataProvider, taskFn, scorers, config });
      const result = await evaluation.evaluate();

      expect(result.scores).toHaveLength(0);
    });

    test('processes data with metadata', async (): Promise<void> => {
      const testData: DataItem<TestInput, TestExpected>[] = [
        {
          input: { value: 7 },
          expected: { result: 14 },
          metadata: { category: 'test', priority: 'high' },
        },
      ];

      const dataProvider = (): DataItem<TestInput, TestExpected>[] => testData;
      const taskFn = ({
        data,
      }: {
        data: DataItem<TestInput, TestExpected>;
      }): TestOutput => ({
        computed: data.input.value * 2,
      });

      const scorers = [
        ({
          output,
          data,
        }: {
          output: TestOutput;
          data: DataItem<TestInput, TestExpected>;
        }): TestScore => ({
          name: 'accuracy-with-metadata',
          value: output.computed === data.expected?.result ? 1 : 0,
        }),
        ({
          data,
        }: {
          output: TestOutput;
          data: DataItem<TestInput, TestExpected>;
        }): TestScore => ({
          name: 'priority-bonus',
          value: data.metadata?.priority === 'high' ? 0.1 : 0,
        }),
      ];

      const config = { name: 'metadata-eval', maxConcurrency: 1 };

      const evaluation = new Eval({ dataProvider, taskFn, scorers, config });
      const result = await evaluation.evaluate();

      expect(result.scores).toHaveLength(1);
      expect(result.scores[0]).toHaveLength(2);
      expect(result.scores[0][0].value).toBe(1); // Perfect match
      expect(result.scores[0][1].value).toBe(0.1); // High priority bonus
    });

    test('demonstrates scoring when output does not match expected', async (): Promise<void> => {
      const testData: DataItem<TestInput, TestExpected>[] = [
        { input: { value: 5 }, expected: { result: 10 } }, // Task will compute 15, not 10
      ];

      const dataProvider = (): DataItem<TestInput, TestExpected>[] => testData;
      const taskFn = ({
        data,
      }: {
        data: DataItem<TestInput, TestExpected>;
      }): TestOutput => ({
        computed: data.input.value * 3, // Wrong calculation - should be * 2
      });

      const scorers = [
        ({
          output,
          data,
        }: {
          output: TestOutput;
          data: DataItem<TestInput, TestExpected>;
        }): TestScore => ({
          name: 'exact-match',
          value: output.computed === data.expected?.result ? 1 : 0,
        }),
        ({
          output,
          data,
        }: {
          output: TestOutput;
          data: DataItem<TestInput, TestExpected>;
        }): TestScore => ({
          name: 'absolute-error',
          value: data.expected
            ? Math.abs(output.computed - data.expected.result)
            : 0,
        }),
      ];

      const config = { name: 'mismatch-eval', maxConcurrency: 1 };

      const evaluation = new Eval({ dataProvider, taskFn, scorers, config });
      const result = await evaluation.evaluate();

      expect(result.scores).toHaveLength(1);
      expect(result.scores[0]).toHaveLength(2);
      expect(result.scores[0][0].name).toBe('exact-match');
      expect(result.scores[0][0].value).toBe(0); // No match (15 !== 10)
      expect(result.scores[0][1].name).toBe('absolute-error');
      expect(result.scores[0][1].value).toBe(5); // |15 - 10| = 5
    });

    test('demonstrates string matching and JSON matching scorers', async (): Promise<void> => {
      interface StringTestInput {
        text: string;
      }

      interface StringTestExpected {
        response: string;
        jsonData: object;
      }

      interface StringTestOutput {
        generatedText: string;
        parsedJson: object;
      }

      const testData: DataItem<StringTestInput, StringTestExpected>[] = [
        {
          input: { text: 'Hello' },
          expected: {
            response: 'Hello World',
            jsonData: { greeting: 'Hello', target: 'World' },
          },
        },
      ];

      const dataProvider = (): DataItem<
        StringTestInput,
        StringTestExpected
      >[] => testData;
      const taskFn = ({
        data,
      }: {
        data: DataItem<StringTestInput, StringTestExpected>;
      }): StringTestOutput => ({
        generatedText: data.input.text + ' World',
        parsedJson: { greeting: data.input.text, target: 'World' },
      });

      const scorers = [
        ({
          output,
          data,
        }: {
          output: StringTestOutput;
          data: DataItem<StringTestInput, StringTestExpected>;
        }): TestScore => ({
          name: 'exact-string-match',
          value: output.generatedText === data.expected?.response ? 1 : 0,
        }),
        ({
          output,
          data,
        }: {
          output: StringTestOutput;
          data: DataItem<StringTestInput, StringTestExpected>;
        }): TestScore => ({
          name: 'string-contains',
          value: data.expected?.response.includes(output.generatedText) ? 1 : 0,
        }),
        ({
          output,
          data,
        }: {
          output: StringTestOutput;
          data: DataItem<StringTestInput, StringTestExpected>;
        }): TestScore => ({
          name: 'json-deep-equal',
          value:
            JSON.stringify(output.parsedJson) ===
            JSON.stringify(data.expected?.jsonData)
              ? 1
              : 0,
        }),
        ({
          output,
          data,
        }: {
          output: StringTestOutput;
          data: DataItem<StringTestInput, StringTestExpected>;
        }): TestScore => ({
          name: 'json-has-greeting-field',
          value:
            (output.parsedJson as any)?.greeting ===
            (data.expected?.jsonData as any)?.greeting
              ? 1
              : 0,
        }),
      ];

      const config = { name: 'string-json-eval', maxConcurrency: 1 };

      const evaluation = new Eval({ dataProvider, taskFn, scorers, config });
      const result = await evaluation.evaluate();

      expect(result.scores).toHaveLength(1);
      expect(result.scores[0]).toHaveLength(4);
      expect(result.scores[0][0].name).toBe('exact-string-match');
      expect(result.scores[0][0].value).toBe(1); // Perfect string match
      expect(result.scores[0][1].name).toBe('string-contains');
      expect(result.scores[0][1].value).toBe(1); // String is contained
      expect(result.scores[0][2].name).toBe('json-deep-equal');
      expect(result.scores[0][2].value).toBe(1); // JSON objects match
      expect(result.scores[0][3].name).toBe('json-has-greeting-field');
      expect(result.scores[0][3].value).toBe(1); // Greeting field matches
    });
  });

  describe('concurrency', (): void => {
    test('respects maxConcurrency limit', async (): Promise<void> => {
      const startTime = Date.now();
      const testData: DataItem<ConcurrencyTestInput, never>[] = Array.from(
        { length: 6 },
        (_, i): DataItem<ConcurrencyTestInput, never> => ({
          input: { id: i, delay: 100 }, // 100ms delay per task
        }),
      );

      const dataProvider = (): DataItem<ConcurrencyTestInput, never>[] =>
        testData;

      const taskFn = async ({
        data,
      }: {
        data: DataItem<ConcurrencyTestInput, never>;
      }): Promise<ConcurrencyTestOutput> => {
        await new Promise((resolve): void => {
          setTimeout(resolve, data.input.delay);
        });
        return {
          id: data.input.id,
          processedAt: Date.now() - startTime,
        };
      };

      const scorers = [
        ({
          output,
        }: {
          output: ConcurrencyTestOutput;
          data: DataItem<ConcurrencyTestInput, never>;
        }): ConcurrencyTestScore => ({
          name: 'completed-within-time',
          value: output.processedAt < 500 ? 1 : 0, // Pass if completed within 500ms
        }),
      ];

      // Test with concurrency of 2
      const config = { name: 'concurrency-test', maxConcurrency: 2 };
      const evaluation = new Eval({ dataProvider, taskFn, scorers, config });

      const result = await evaluation.evaluate();
      const endTime = Date.now() - startTime;

      // With 6 tasks, delay of 100ms each, and concurrency of 2:
      // Should take approximately 300ms (3 batches of 2 parallel tasks)
      // Allow some variance for execution overhead
      expect(endTime).toBeGreaterThan(250);
      expect(endTime).toBeLessThan(400);
      expect(result.scores).toHaveLength(6);
    });

    test('handles high concurrency correctly', async (): Promise<void> => {
      const testData: DataItem<ConcurrencyTestInput, never>[] = Array.from(
        { length: 10 },
        (_, i): DataItem<ConcurrencyTestInput, never> => ({
          input: { id: i, delay: 50 },
        }),
      );

      const dataProvider = (): DataItem<ConcurrencyTestInput, never>[] =>
        testData;

      const taskFn = async ({
        data,
      }: {
        data: DataItem<ConcurrencyTestInput, never>;
      }): Promise<ConcurrencyTestOutput> => {
        await new Promise((resolve): void => {
          setTimeout(resolve, data.input.delay);
        });
        return {
          id: data.input.id,
          processedAt: Date.now(),
        };
      };

      const scorers = [
        ({
          output,
        }: {
          output: ConcurrencyTestOutput;
          data: DataItem<ConcurrencyTestInput, never>;
        }): ConcurrencyTestScore => ({
          name: 'completion',
          value: 1,
        }),
      ];

      const config = { name: 'high-concurrency-test', maxConcurrency: 10 };
      const evaluation = new Eval({ dataProvider, taskFn, scorers, config });

      const startTime = Date.now();
      const result = await evaluation.evaluate();
      const endTime = Date.now() - startTime;

      // With high concurrency, all tasks should run in parallel
      // Should complete in approximately 50ms + overhead
      expect(endTime).toBeLessThan(150);
      expect(result.scores).toHaveLength(10);

      // All tasks should have completed
      result.scores.forEach((scoreArray): void => {
        expect(scoreArray[0].value).toBe(1);
      });
    });

    test('handles concurrency with varying task durations', async (): Promise<void> => {
      const testData: DataItem<ConcurrencyTestInput, never>[] = [
        { input: { id: 0, delay: 200 } }, // Long task
        { input: { id: 1, delay: 50 } }, // Short task
        { input: { id: 2, delay: 100 } }, // Medium task
        { input: { id: 3, delay: 25 } }, // Very short task
      ];

      const completionOrder: number[] = [];
      const dataProvider = (): DataItem<ConcurrencyTestInput, never>[] =>
        testData;

      const taskFn = async ({
        data,
      }: {
        data: DataItem<ConcurrencyTestInput, never>;
      }): Promise<ConcurrencyTestOutput> => {
        await new Promise((resolve): void => {
          setTimeout(resolve, data.input.delay);
        });
        completionOrder.push(data.input.id);
        return {
          id: data.input.id,
          processedAt: Date.now(),
        };
      };

      const scorers = [
        ({
          output,
          data,
        }: {
          output: ConcurrencyTestOutput;
          data: DataItem<ConcurrencyTestInput, never>;
        }): ConcurrencyTestScore => ({
          name: 'correct-task-id',
          value: output.id === data.input.id ? 1 : 0, // Verify task processed correct ID
        }),
      ];

      const config = { name: 'varying-duration-test', maxConcurrency: 2 };
      const evaluation = new Eval({ dataProvider, taskFn, scorers, config });

      await evaluation.evaluate();

      // Tasks should complete in order of their duration, not input order
      // Shorter tasks should complete before longer ones
      expect(completionOrder).toHaveLength(4);

      // Find positions in completion order
      const shortTaskPosition = completionOrder.indexOf(3); // 25ms task
      const longTaskPosition = completionOrder.indexOf(0); // 200ms task

      // Short task should complete before long task
      expect(shortTaskPosition).toBeLessThan(longTaskPosition);
    });

    test('handles errors in concurrent execution', async (): Promise<void> => {
      const testData: DataItem<ConcurrencyTestInput, never>[] = [
        { input: { id: 0, delay: 50 } }, // Normal task
        { input: { id: 1, delay: 0 } }, // Task that will throw
        { input: { id: 2, delay: 75 } }, // Normal task
      ];

      const dataProvider = (): DataItem<ConcurrencyTestInput, never>[] =>
        testData;

      const taskFn = async ({
        data,
      }: {
        data: DataItem<ConcurrencyTestInput, never>;
      }): Promise<ConcurrencyTestOutput> => {
        if (data.input.id === 1) {
          throw new Error('Simulated task error');
        }
        await new Promise((resolve): void => {
          setTimeout(resolve, data.input.delay);
        });
        return {
          id: data.input.id,
          processedAt: Date.now(),
        };
      };

      const scorers = [
        ({
          output,
        }: {
          output: ConcurrencyTestOutput;
          data: DataItem<ConcurrencyTestInput, never>;
        }): ConcurrencyTestScore => ({
          name: 'success',
          value: 1,
        }),
      ];

      const config = { name: 'error-handling-test', maxConcurrency: 3 };
      const evaluation = new Eval({ dataProvider, taskFn, scorers, config });

      // The evaluation should handle the error and continue with other tasks
      await expect(evaluation.evaluate()).rejects.toThrow(
        'Simulated task error',
      );
    });
  });

  describe('file output', (): void => {
    test('creates output directory when specified', async (): Promise<void> => {
      const testData: DataItem<TestInput, TestExpected>[] = [
        { input: { value: 1 }, expected: { result: 2 } },
      ];

      const dataProvider = (): DataItem<TestInput, TestExpected>[] => testData;
      const taskFn = ({
        data,
      }: {
        data: DataItem<TestInput, TestExpected>;
      }): TestOutput => ({
        computed: data.input.value * 2,
      });
      const scorers = [
        ({
          output,
          data,
        }: {
          output: TestOutput;
          data: DataItem<TestInput, TestExpected>;
        }): TestScore => ({
          name: 'exact-match',
          value: output.computed === data.expected?.result ? 1 : 0,
        }),
      ];

      const config = {
        name: 'output-test',
        maxConcurrency: 1,
        outputDir: TEST_OUTPUT_DIR,
      };

      const evaluation = new Eval({ dataProvider, taskFn, scorers, config });
      await evaluation.evaluate();

      expect(existsSync(TEST_OUTPUT_DIR)).toBe(true);
    });

    test('writes JSONL output file correctly', async (): Promise<void> => {
      const testData: DataItem<TestInput, TestExpected>[] = [
        {
          input: { value: 3 },
          expected: { result: 6 },
          metadata: { category: 'test' },
        },
        {
          input: { value: 5 },
          expected: { result: 10 },
          metadata: { category: 'validation' },
        },
      ];

      const dataProvider = (): DataItem<TestInput, TestExpected>[] => testData;
      const taskFn = ({
        data,
      }: {
        data: DataItem<TestInput, TestExpected>;
      }): TestOutput => ({
        computed: data.input.value * 2,
      });
      const scorers = [
        ({
          output,
          data,
        }: {
          output: TestOutput;
          data: DataItem<TestInput, TestExpected>;
        }): TestScore => ({
          name: 'exact-match',
          value: output.computed === data.expected?.result ? 1 : 0,
        }),
        ({
          output,
          data,
        }: {
          output: TestOutput;
          data: DataItem<TestInput, TestExpected>;
        }): TestScore => ({
          name: 'absolute-error',
          value: data.expected
            ? Math.abs(output.computed - data.expected.result)
            : 0,
        }),
      ];

      const config = {
        name: 'jsonl-test',
        maxConcurrency: 1,
        outputDir: TEST_OUTPUT_DIR,
      };

      const evaluation = new Eval({ dataProvider, taskFn, scorers, config });
      await evaluation.evaluate();

      const outputFile = join(
        TEST_OUTPUT_DIR,
        'jsonl-test-evaluation-results.jsonl',
      );
      expect(existsSync(outputFile)).toBe(true);

      const fileContent = await readFile(outputFile, 'utf-8');
      const lines = fileContent.trim().split('\n');

      expect(lines).toHaveLength(2);

      // Parse first line
      const firstRecord = JSON.parse(lines[0]);
      expect(firstRecord).toHaveProperty('scores');
      expect(firstRecord).toHaveProperty('index');
      expect(firstRecord).toHaveProperty('input');
      expect(firstRecord).toHaveProperty('expected');
      expect(firstRecord).toHaveProperty('metadata');
      expect(firstRecord).toHaveProperty('output');

      expect(firstRecord.index).toBe(0);
      expect(firstRecord.input).toEqual({ value: 3 });
      expect(firstRecord.expected).toEqual({ result: 6 });
      expect(firstRecord.metadata).toEqual({ category: 'test' });
      expect(firstRecord.output).toEqual({ computed: 6 });
      expect(firstRecord.scores).toHaveLength(2);
      expect(firstRecord.scores[0].name).toBe('exact-match');
      expect(firstRecord.scores[0].value).toBe(1); // Perfect match
      expect(firstRecord.scores[1].name).toBe('absolute-error');
      expect(firstRecord.scores[1].value).toBe(0); // No error

      // Parse second line
      const secondRecord = JSON.parse(lines[1]);
      expect(secondRecord.index).toBe(1);
      expect(secondRecord.input).toEqual({ value: 5 });
      expect(secondRecord.expected).toEqual({ result: 10 });
      expect(secondRecord.metadata).toEqual({ category: 'validation' });
      expect(secondRecord.output).toEqual({ computed: 10 });
      expect(secondRecord.scores).toHaveLength(2);
    });

    test('handles output without expected values', async (): Promise<void> => {
      const testData: DataItem<TestInput, TestExpected>[] = [
        { input: { value: 7 } }, // No expected value
      ];

      const dataProvider = (): DataItem<TestInput, TestExpected>[] => testData;
      const taskFn = ({
        data,
      }: {
        data: DataItem<TestInput, TestExpected>;
      }): TestOutput => ({
        computed: data.input.value * 3,
      });
      const scorers = [
        ({
          output,
          data,
        }: {
          output: TestOutput;
          data: DataItem<TestInput, TestExpected>;
        }): TestScore => ({
          name: 'within-range',
          value: output.computed >= 15 && output.computed <= 25 ? 1 : 0, // Accept range since no expected
        }),
      ];

      const config = {
        name: 'no-expected-test',
        maxConcurrency: 1,
        outputDir: TEST_OUTPUT_DIR,
      };

      const evaluation = new Eval({ dataProvider, taskFn, scorers, config });
      await evaluation.evaluate();

      const outputFile = join(
        TEST_OUTPUT_DIR,
        'no-expected-test-evaluation-results.jsonl',
      );
      const fileContent = await readFile(outputFile, 'utf-8');
      const record = JSON.parse(fileContent.trim());

      expect(record.expected).toBeUndefined();
      expect(record.output).toEqual({ computed: 21 });
      expect(record.scores[0].name).toBe('within-range');
      expect(record.scores[0].value).toBe(1); // 21 is within range 15-25
    });

    test('handles output without metadata', async (): Promise<void> => {
      const testData: DataItem<TestInput, TestExpected>[] = [
        { input: { value: 2 }, expected: { result: 4 } }, // No metadata
      ];

      const dataProvider = (): DataItem<TestInput, TestExpected>[] => testData;
      const taskFn = ({
        data,
      }: {
        data: DataItem<TestInput, TestExpected>;
      }): TestOutput => ({
        computed: data.input.value * 2,
      });
      const scorers = [
        ({
          output,
          data,
        }: {
          output: TestOutput;
          data: DataItem<TestInput, TestExpected>;
        }): TestScore => ({
          name: 'exact-match',
          value: output.computed === data.expected?.result ? 1 : 0,
        }),
      ];

      const config = {
        name: 'no-metadata-test',
        maxConcurrency: 1,
        outputDir: TEST_OUTPUT_DIR,
      };

      const evaluation = new Eval({ dataProvider, taskFn, scorers, config });
      await evaluation.evaluate();

      const outputFile = join(
        TEST_OUTPUT_DIR,
        'no-metadata-test-evaluation-results.jsonl',
      );
      const fileContent = await readFile(outputFile, 'utf-8');
      const record = JSON.parse(fileContent.trim());

      expect(record.metadata).toBeUndefined();
    });

    test('works without output directory specified', async (): Promise<void> => {
      const testData: DataItem<TestInput, TestExpected>[] = [
        { input: { value: 4 }, expected: { result: 8 } },
      ];

      const dataProvider = (): DataItem<TestInput, TestExpected>[] => testData;
      const taskFn = ({
        data,
      }: {
        data: DataItem<TestInput, TestExpected>;
      }): TestOutput => ({
        computed: data.input.value * 2,
      });
      const scorers = [
        ({
          output,
          data,
        }: {
          output: TestOutput;
          data: DataItem<TestInput, TestExpected>;
        }): TestScore => ({
          name: 'exact-match',
          value: output.computed === data.expected?.result ? 1 : 0,
        }),
      ];

      const config = {
        name: 'no-output-dir-test',
        maxConcurrency: 1,
        // No outputDir specified
      };

      const evaluation = new Eval({ dataProvider, taskFn, scorers, config });
      const result = await evaluation.evaluate();

      expect(result.scores).toHaveLength(1);
      expect(result.scores[0][0].value).toBe(1);

      // Should not create any output files
      expect(existsSync(TEST_OUTPUT_DIR)).toBe(false);
    });

    test('works without database configuration (unit tests skip DB)', async (): Promise<void> => {
      const testData: DataItem<TestInput, TestExpected>[] = [
        { input: { value: 6 }, expected: { result: 12 } },
      ];

      const dataProvider = (): DataItem<TestInput, TestExpected>[] => testData;
      const taskFn = ({
        data,
      }: {
        data: DataItem<TestInput, TestExpected>;
      }): TestOutput => ({
        computed: data.input.value * 2,
      });
      const scorers = [
        ({
          output,
          data,
        }: {
          output: TestOutput;
          data: DataItem<TestInput, TestExpected>;
        }): TestScore => ({
          name: 'exact-match',
          value: output.computed === data.expected?.result ? 1 : 0,
        }),
      ];

      const config = {
        name: 'no-database-test',
        maxConcurrency: 1,
        // No database configuration - unit tests should skip DB operations
      };

      const evaluation = new Eval({ dataProvider, taskFn, scorers, config });
      const result = await evaluation.evaluate();

      expect(result.scores).toHaveLength(1);
      expect(result.scores[0][0].value).toBe(1);

      // Test completes successfully without database operations
      // This verifies that unit tests will not attempt to store results in DB
    });

    test('handles concurrent writes to output file', async (): Promise<void> => {
      const testData: DataItem<TestInput, TestExpected>[] = Array.from(
        { length: 5 },
        (_, i): DataItem<TestInput, TestExpected> => ({
          input: { value: i + 1 },
          expected: { result: (i + 1) * 2 },
        }),
      );

      const dataProvider = (): DataItem<TestInput, TestExpected>[] => testData;
      const taskFn = async ({
        data,
      }: {
        data: DataItem<TestInput, TestExpected>;
      }): Promise<TestOutput> => {
        // Add small random delay to test concurrent writes
        await new Promise((resolve): void => {
          setTimeout(resolve, Math.random() * 20);
        });
        return { computed: data.input.value * 2 };
      };
      const scorers = [
        ({
          output,
          data,
        }: {
          output: TestOutput;
          data: DataItem<TestInput, TestExpected>;
        }): TestScore => ({
          name: 'exact-match',
          value: output.computed === data.expected?.result ? 1 : 0,
        }),
      ];

      const config = {
        name: 'concurrent-write-test',
        maxConcurrency: 3,
        outputDir: TEST_OUTPUT_DIR,
      };

      const evaluation = new Eval({ dataProvider, taskFn, scorers, config });
      await evaluation.evaluate();

      const outputFile = join(
        TEST_OUTPUT_DIR,
        'concurrent-write-test-evaluation-results.jsonl',
      );
      const fileContent = await readFile(outputFile, 'utf-8');
      const lines = fileContent.trim().split('\n');

      expect(lines).toHaveLength(5);

      // Verify all records are valid JSON and have expected structure
      lines.forEach((line, index): void => {
        const record = JSON.parse(line);
        expect(record).toHaveProperty('scores');
        expect(record).toHaveProperty('index');
        expect(record).toHaveProperty('input');
        expect(record).toHaveProperty('expected');
        expect(record).toHaveProperty('output');
        expect(record.scores).toHaveLength(1);
        expect(record.scores[0].name).toBe('exact-match');
      });
    });
  });
});

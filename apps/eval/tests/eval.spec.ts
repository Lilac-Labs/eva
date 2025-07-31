import { describe, expect, test, beforeAll, afterAll } from 'bun:test';
import { Eval } from '../src/eval';
import type { BaseScore, DataItem } from '../src/eval/eval.types';
import {
  createProject,
  getProjectByName,
  getEvalNameByName,
  getEvalResults,
  getEvalRuns,
} from '@repo/db';

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

const TEST_PROJECT_NAME = 'test';
const TEST_EVAL_NAME = 'test';

describe('Eval End-to-End Database Integration', (): void => {
  let testProjectId: string;

  beforeAll(async (): Promise<void> => {
    // Ensure test project exists, create if it doesn't
    let project = await getProjectByName(TEST_PROJECT_NAME);
    if (!project) {
      project = await createProject({
        name: TEST_PROJECT_NAME,
        description: 'Test project for end-to-end evaluation testing',
      });
    }
    testProjectId = project.id;
  });

  afterAll(async (): Promise<void> => {
    // Note: We intentionally don't clean up test data to allow inspection
    // In a real test environment, you might want to clean up or use a test database
    console.log(`Test completed. Project ID: ${testProjectId}`);
  });

  test('creates project if it does not exist', async (): Promise<void> => {
    const project = await getProjectByName(TEST_PROJECT_NAME);
    expect(project).toBeTruthy();
    expect(project?.name).toBe(TEST_PROJECT_NAME);
    expect(project?.description).toBe('Test project for end-to-end evaluation testing');
  });

  test('automatically creates evalName and stores results in database', async (): Promise<void> => {
    const testData: DataItem<TestInput, TestExpected>[] = [
      { input: { value: 1 }, expected: { result: 2 }, metadata: { testCase: 'simple' } },
      { input: { value: 5 }, expected: { result: 10 }, metadata: { testCase: 'medium' } },
      { input: { value: 10 }, expected: { result: 20 }, metadata: { testCase: 'large' } },
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
      name: TEST_EVAL_NAME,
      maxConcurrency: 2,
      projectName: TEST_PROJECT_NAME,
      evalDescription: 'End-to-end test evaluation with database storage',
    };

    // Run the evaluation
    const evaluation = new Eval({ dataProvider, taskFn, scorers, config });
    const result = await evaluation.evaluate();

    // Verify in-memory results
    expect(result.scores).toHaveLength(3);
    expect(result.scores[0]).toHaveLength(2);
    expect(result.scores[0][0].name).toBe('exact-match');
    expect(result.scores[0][0].value).toBe(1); // Should match exactly
    expect(result.scores[0][1].name).toBe('absolute-error');
    expect(result.scores[0][1].value).toBe(0); // No error

    // Verify evalName was created in database
    const evalName = await getEvalNameByName(testProjectId, TEST_EVAL_NAME);
    expect(evalName).toBeTruthy();
    expect(evalName?.name).toBe(TEST_EVAL_NAME);
    expect(evalName?.description).toBe('End-to-end test evaluation with database storage');

    // Verify eval runs were created
    const evalRuns = await getEvalRuns(evalName!.id, { limit: 10, orderBy: 'newest' });
    expect(evalRuns.length).toBeGreaterThan(0);
    
    const latestRun = evalRuns[0];
    expect(latestRun.status).toBe('completed');
    expect(latestRun.totalItems).toBe(3);
    expect(latestRun.completedItems).toBe(3);
    expect(latestRun.maxConcurrency).toBe(2);

    // Verify eval results were stored in database
    const evalResults = await getEvalResults(latestRun.id);
    expect(evalResults.length).toBe(3);

    // Check first result in detail
    const firstResult = evalResults.find(r => r.itemIndex === 0);
    expect(firstResult).toBeTruthy();
    expect(firstResult!.input).toEqual({ value: 1 });
    expect(firstResult!.expected).toEqual({ result: 2 });
    expect(firstResult!.output).toEqual({ computed: 2 });
    expect(firstResult!.metadata).toEqual({ testCase: 'simple' });
    expect(firstResult!.scores).toHaveLength(2);
    expect(firstResult!.scores[0].name).toBe('exact-match');
    expect(firstResult!.scores[0].value).toBe(1);
    expect(firstResult!.scores[1].name).toBe('absolute-error');
    expect(firstResult!.scores[1].value).toBe(0);

    // Check second result
    const secondResult = evalResults.find(r => r.itemIndex === 1);
    expect(secondResult).toBeTruthy();
    expect(secondResult!.input).toEqual({ value: 5 });
    expect(secondResult!.expected).toEqual({ result: 10 });
    expect(secondResult!.output).toEqual({ computed: 10 });
    expect(secondResult!.metadata).toEqual({ testCase: 'medium' });

    // Check third result
    const thirdResult = evalResults.find(r => r.itemIndex === 2);
    expect(thirdResult).toBeTruthy();
    expect(thirdResult!.input).toEqual({ value: 10 });
    expect(thirdResult!.expected).toEqual({ result: 20 });
    expect(thirdResult!.output).toEqual({ computed: 20 });
    expect(thirdResult!.metadata).toEqual({ testCase: 'large' });
  });

  test('handles evaluation with wrong results and stores scores correctly', async (): Promise<void> => {
    const testData: DataItem<TestInput, TestExpected>[] = [
      { input: { value: 3 }, expected: { result: 6 } }, // Task will compute 9, not 6
      { input: { value: 4 }, expected: { result: 8 } }, // Task will compute 12, not 8
    ];

    const dataProvider = (): DataItem<TestInput, TestExpected>[] => testData;
    
    // Wrong task function - multiplies by 3 instead of 2
    const taskFn = ({
      data,
    }: {
      data: DataItem<TestInput, TestExpected>;
    }): TestOutput => ({
      computed: data.input.value * 3, // Intentionally wrong
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
        value: data.expected && data.expected.result !== 0
          ? Math.abs(output.computed - data.expected.result) / Math.abs(data.expected.result)
          : 0,
      }),
    ];

    const config = {
      name: 'test-wrong-results',
      maxConcurrency: 1,
      projectName: TEST_PROJECT_NAME,
      evalDescription: 'Test with intentionally wrong results to verify error scoring',
    };

    // Run the evaluation
    const evaluation = new Eval({ dataProvider, taskFn, scorers, config });
    const result = await evaluation.evaluate();

    // Verify in-memory results show errors
    expect(result.scores).toHaveLength(2);
    expect(result.scores[0]).toHaveLength(3);
    expect(result.scores[0][0].name).toBe('exact-match');
    expect(result.scores[0][0].value).toBe(0); // No match (9 !== 6)
    expect(result.scores[0][1].name).toBe('absolute-error');
    expect(result.scores[0][1].value).toBe(3); // |9 - 6| = 3
    expect(result.scores[0][2].name).toBe('relative-error');
    expect(result.scores[0][2].value).toBe(0.5); // 3/6 = 0.5

    // Verify evalName was created
    const evalName = await getEvalNameByName(testProjectId, 'test-wrong-results');
    expect(evalName).toBeTruthy();

    // Verify results stored correctly in database
    const evalRuns = await getEvalRuns(evalName!.id, { limit: 1, orderBy: 'newest' });
    const latestRun = evalRuns[0];
    expect(latestRun.status).toBe('completed');

    const evalResults = await getEvalResults(latestRun.id);
    expect(evalResults.length).toBe(2);

    // Check that error scores are stored correctly
    const firstResult = evalResults.find(r => r.itemIndex === 0);
    expect(firstResult!.scores[0].value).toBe(0); // exact-match failed
    expect(firstResult!.scores[1].value).toBe(3); // absolute error
    expect(firstResult!.scores[2].value).toBe(0.5); // relative error
  });

  test('handles concurrent evaluation runs for same project', async (): Promise<void> => {
    const testData: DataItem<TestInput, TestExpected>[] = [
      { input: { value: 7 }, expected: { result: 14 } },
      { input: { value: 8 }, expected: { result: 16 } },
    ];

    const dataProvider = (): DataItem<TestInput, TestExpected>[] => testData;
    
    const taskFn = async ({
      data,
    }: {
      data: DataItem<TestInput, TestExpected>;
    }): Promise<TestOutput> => {
      // Add small delay to simulate real work
      await new Promise(resolve => setTimeout(resolve, 50));
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
        name: 'accuracy',
        value: output.computed === data.expected?.result ? 1 : 0,
      }),
    ];

    // Run two evaluations concurrently
    const config1 = {
      name: 'concurrent-test-1',
      maxConcurrency: 2,
      projectName: TEST_PROJECT_NAME,
      evalDescription: 'First concurrent test run',
    };

    const config2 = {
      name: 'concurrent-test-2', 
      maxConcurrency: 2,
      projectName: TEST_PROJECT_NAME,
      evalDescription: 'Second concurrent test run',
    };

    const evaluation1 = new Eval({ dataProvider, taskFn, scorers, config: config1 });
    const evaluation2 = new Eval({ dataProvider, taskFn, scorers, config: config2 });

    // Run both evaluations concurrently
    const [result1, result2] = await Promise.all([
      evaluation1.evaluate(),
      evaluation2.evaluate(),
    ]);

    // Verify both completed successfully
    expect(result1.scores).toHaveLength(2);
    expect(result2.scores).toHaveLength(2);

    // Verify both evalNames exist
    const evalName1 = await getEvalNameByName(testProjectId, 'concurrent-test-1');
    const evalName2 = await getEvalNameByName(testProjectId, 'concurrent-test-2');
    expect(evalName1).toBeTruthy();
    expect(evalName2).toBeTruthy();

    // Verify both have their own separate runs
    const runs1 = await getEvalRuns(evalName1!.id);
    const runs2 = await getEvalRuns(evalName2!.id);
    expect(runs1.length).toBeGreaterThan(0);
    expect(runs2.length).toBeGreaterThan(0);
    expect(runs1[0].id).not.toBe(runs2[0].id); // Different run IDs
  });

  test('handles database connection failure gracefully', async (): Promise<void> => {
    // Test with non-existent project name to trigger error
    const testData: DataItem<TestInput, TestExpected>[] = [
      { input: { value: 1 }, expected: { result: 2 } },
    ];

    const dataProvider = (): DataItem<TestInput, TestExpected>[] => testData;
    const taskFn = ({ data }: { data: DataItem<TestInput, TestExpected> }): TestOutput => ({
      computed: data.input.value * 2,
    });
    const scorers = [
      ({ output, data }: { output: TestOutput; data: DataItem<TestInput, TestExpected> }): TestScore => ({
        name: 'test',
        value: output.computed === data.expected?.result ? 1 : 0,
      }),
    ];

    const config = {
      name: 'db-error-test',
      maxConcurrency: 1,
      projectName: 'non-existent-project-name-12345',
      evalDescription: 'Test database error handling',
    };

    const evaluation = new Eval({ dataProvider, taskFn, scorers, config });

    // Should throw error when project doesn't exist
    expect(evaluation.evaluate()).rejects.toThrow('Project "non-existent-project-name-12345" not found');
  });
});
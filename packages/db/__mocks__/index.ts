// Mock implementation of @repo/db for unit tests
// This ensures tests can run without database connectivity

export const findOrCreateEvalContext = () => Promise.resolve({
  project: { id: 'mock-project-id', name: 'mock-project' },
  evalName: { id: 'mock-eval-name-id', name: 'mock-eval' }
});

export const createEvalRun = () => Promise.resolve({
  id: 'mock-eval-run-id',
  status: 'running'
});

export const updateEvalRunProgress = () => Promise.resolve(undefined);

export const bulkCreateEvalResults = () => Promise.resolve(undefined);

export const completeEvalRun = () => Promise.resolve(undefined);

export const failEvalRun = () => Promise.resolve(undefined);

// Define types inline to avoid importing from the real module
export interface EvalRun {
  id: string;
  status: string;
}

export interface EvalResultInput {
  [key: string]: unknown;
}

export interface EvalResultExpected {
  [key: string]: unknown;
}

export interface EvalResultOutput {
  [key: string]: unknown;
}

export interface EvalResultMetadata {
  [key: string]: unknown;
}

export interface EvalScore {
  name: string;
  value: number;
  [key: string]: unknown;
}

export interface TypedEvalResultData {
  evalRunId: string;
  itemIndex: number;
  input: EvalResultInput;
  expected?: EvalResultExpected;
  output: EvalResultOutput;
  scores: EvalScore[];
  metadata?: EvalResultMetadata;
}
export interface EvalConfig {
  name: string;
  maxConcurrency: number;
  outputDir?: string;
}

export interface BaseScore {
  name: string;
  value: number;
}

// Define the DataItem interface that enforces the structure
export interface DataItem<Input, Expected> {
  input: Input;
  expected?: Expected;
  metadata?: Record<string, unknown>;
}

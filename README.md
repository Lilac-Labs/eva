# Eva 🧪

[![npm version](https://badge.fury.io/js/@lilac-labs%2Feva.svg)](https://badge.fury.io/js/@lilac-labs%2Feva)
[![CI](https://github.com/lilac-labs/eva/actions/workflows/ci.yml/badge.svg)](https://github.com/lilac-labs/eva/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A powerful TypeScript evaluation framework for running concurrent evaluations with progress tracking and result persistence. Perfect for testing AI models, APIs, data processing pipelines, and any system that needs systematic evaluation against expected results.

## ✨ Features

- 🚀 **Concurrent Processing** - Configurable concurrency limits for optimal performance
- 📊 **Progress Tracking** - Visual progress bars with real-time updates
- 📁 **Result Persistence** - JSONL output for detailed analysis
- 🔍 **Flexible Scoring** - Support for string matching, JSON comparison, numerical analysis
- 🎯 **Type Safety** - Full TypeScript support with generic types
- ⚡ **Async Support** - Handle async data providers, tasks, and scorers
- 🛡️ **Error Handling** - Robust error handling in concurrent execution

## 📦 Installation

```bash
npm install @lilac-labs/eva
```

## 🚀 Quick Start

```typescript
import { Eval } from '@lilac-labs/eva';
import type { DataItem, BaseScore } from '@lilac-labs/eva';

// Define your evaluation types
interface MyInput {
  question: string;
}

interface MyExpected {
  answer: string;
}

interface MyOutput {
  response: string;
}

interface MyScore extends BaseScore {
  name: string;
  value: number;
}

// Create and run evaluation
const evaluation = new Eval<MyInput, MyExpected, MyOutput, MyScore>({
  // Provide test data
  dataProvider: () => [
    { 
      input: { question: "What is 2+2?" }, 
      expected: { answer: "4" } 
    },
    { 
      input: { question: "What is the capital of France?" }, 
      expected: { answer: "Paris" } 
    }
  ],
  
  // Define the task to evaluate
  taskFn: async ({ data }) => {
    // Your system under test (e.g., API call, model inference)
    const response = await myAIModel.generate(data.input.question);
    return { response };
  },
  
  // Define scoring functions
  scorers: [
    ({ output, data }) => ({
      name: 'exact-match',
      value: output.response.toLowerCase() === data.expected?.answer.toLowerCase() ? 1 : 0
    }),
    ({ output, data }) => ({
      name: 'contains-answer',
      value: output.response.toLowerCase().includes(data.expected?.answer.toLowerCase() || '') ? 1 : 0
    })
  ],
  
  // Configuration
  config: {
    name: 'ai-model-evaluation',
    maxConcurrency: 3,
    outputDir: './results'
  }
});

// Run the evaluation
const results = await evaluation.evaluate();
console.log(`Completed ${results.scores.length} evaluations`);
```

## 📚 Core Concepts

### DataItem
Represents a single evaluation case:
```typescript
interface DataItem<Input, Expected> {
  input: Input;           // The input to your system
  expected?: Expected;    // Expected output (optional)
  metadata?: Record<string, unknown>; // Additional context
}
```

### Scorers
Functions that evaluate output quality:
```typescript
type Scorer<Output, Score> = ({
  output,
  data
}: {
  output: Output;
  data: DataItem<Input, Expected>;
}) => Score | Promise<Score>;
```

### Configuration
```typescript
interface EvalConfig {
  name: string;           // Evaluation name
  maxConcurrency: number; // Concurrent task limit
  outputDir?: string;     // Optional JSONL output directory
}
```

## 🎯 Scoring Examples

### String Matching
```typescript
// Exact string match
({ output, data }) => ({
  name: 'exact-match',
  value: output.text === data.expected?.text ? 1 : 0
})

// Fuzzy string matching
({ output, data }) => ({
  name: 'similarity',
  value: calculateStringSimilarity(output.text, data.expected?.text || '')
})
```

### JSON Comparison
```typescript
// Deep JSON equality
({ output, data }) => ({
  name: 'json-match',
  value: JSON.stringify(output.data) === JSON.stringify(data.expected?.data) ? 1 : 0
})

// Field-specific validation
({ output, data }) => ({
  name: 'has-required-fields',
  value: output.data.id && output.data.name ? 1 : 0
})
```

### Numerical Analysis
```typescript
// Absolute error
({ output, data }) => ({
  name: 'absolute-error',
  value: Math.abs(output.value - (data.expected?.value || 0))
})

// Relative error
({ output, data }) => ({
  name: 'relative-error',
  value: data.expected?.value 
    ? Math.abs(output.value - data.expected.value) / Math.abs(data.expected.value)
    : 0
})
```

## 🔧 Advanced Usage

### Async Data Provider
```typescript
const evaluation = new Eval({
  dataProvider: async () => {
    const response = await fetch('/api/test-cases');
    return await response.json();
  },
  // ... rest of configuration
});
```

### Custom Metadata Scoring
```typescript
const scorers = [
  // Score based on input context
  ({ output, data }) => ({
    name: 'difficulty-adjusted',
    value: data.metadata?.difficulty === 'hard' 
      ? output.score * 2  // Double points for hard questions
      : output.score
  })
];
```

### Error Handling
```typescript
const taskFn = async ({ data }) => {
  try {
    return await riskyApiCall(data.input);
  } catch (error) {
    return { error: error.message, success: false };
  }
};

const scorers = [
  ({ output }) => ({
    name: 'success-rate',
    value: output.success ? 1 : 0
  })
];
```

## 📊 Output Format

When `outputDir` is specified, Eva generates JSONL files with detailed results:

```json
{"scores":[{"name":"exact-match","value":1}],"index":0,"input":{"question":"What is 2+2?"},"expected":{"answer":"4"},"metadata":{},"output":{"response":"4"}}
{"scores":[{"name":"exact-match","value":0}],"index":1,"input":{"question":"Capital of France?"},"expected":{"answer":"Paris"},"metadata":{},"output":{"response":"The capital is Paris"}}
```

## 🏗️ Architecture

Eva is built with performance and flexibility in mind:

- **Concurrent Execution**: Uses `p-limit` for controlled concurrency
- **Progress Tracking**: Real-time progress bars via `cli-progress`
- **Type Safety**: Full TypeScript generics support
- **Memory Efficient**: Streams results to disk for large evaluations
- **Error Resilient**: Continues evaluation even if individual tasks fail

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Run tests (`npm test`)
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with TypeScript for type safety
- Uses `cli-progress` for beautiful progress bars
- Powered by `p-limit` for concurrency control

---

Made with ❤️ by [Lilac Labs](https://github.com/lilac-labs)
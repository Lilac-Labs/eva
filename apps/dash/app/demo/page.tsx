import { EvalResultsTable } from '@/components/eval-results-table';
import type { EvalResult } from '@repo/db';

// Mock data for demonstration
const mockResults: EvalResult[] = [
  {
    id: '1',
    evalRunId: 'run-1',
    itemIndex: 0,
    input: { text: 'What is 2+2?' },
    expected: { answer: '4' },
    output: { answer: '4' },
    scores: [
      { name: 'accuracy', value: 1.0 },
      { name: 'similarity', value: 0.95 },
      { name: 'latency', value: 120 },
    ],
    metadata: { tags: ['math', 'basic'] },
    createdAt: new Date(),
  },
  {
    id: '2',
    evalRunId: 'run-1',
    itemIndex: 1,
    input: { text: 'What is the capital of France?' },
    expected: { answer: 'Paris' },
    output: { answer: 'Paris' },
    scores: [
      { name: 'accuracy', value: 1.0 },
      { name: 'similarity', value: 1.0 },
      { name: 'latency', value: 85 },
    ],
    metadata: { tags: ['geography'] },
    createdAt: new Date(),
  },
  {
    id: '3',
    evalRunId: 'run-1',
    itemIndex: 2,
    input: { text: 'Explain quantum computing' },
    expected: { answer: 'Complex explanation...' },
    output: { answer: 'Quantum computing uses quantum bits...' },
    scores: [
      { name: 'accuracy', value: 0.85 },
      { name: 'similarity', value: 0.78 },
      { name: 'latency', value: 350 },
    ],
    metadata: { tags: ['physics', 'complex'] },
    createdAt: new Date(),
  },
  {
    id: '4',
    evalRunId: 'run-1',
    itemIndex: 3,
    input: { text: 'What is machine learning?' },
    expected: { answer: 'ML is a subset of AI...' },
    output: { answer: 'Machine learning is...' },
    scores: [
      { name: 'accuracy', value: 0.92 },
      { name: 'similarity', value: 0.88 },
      { name: 'latency', value: 200 },
    ],
    metadata: { tags: ['AI', 'technology'] },
    createdAt: new Date(),
  },
  {
    id: '5',
    evalRunId: 'run-1',
    itemIndex: 4,
    input: { text: 'Translate "Hello" to Spanish' },
    expected: { answer: 'Hola' },
    output: { answer: 'Hola' },
    scores: [
      { name: 'accuracy', value: 1.0 },
      { name: 'similarity', value: 1.0 },
      { name: 'latency', value: 45 },
    ],
    metadata: { tags: ['translation', 'basic'] },
    createdAt: new Date(),
  },
];

export default function DemoPage() {
  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Sortable Table Demo</h1>
        <p className="text-muted-foreground mt-2">
          Click on any column header to sort the results. Click again to reverse
          the sort order.
        </p>
      </div>

      <EvalResultsTable results={mockResults} />
    </div>
  );
}

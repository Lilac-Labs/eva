# Eva Workspace

This is a monorepo containing the Eva ecosystem of evaluation tools.

## Applications

### [`apps/eval`](./apps/eval) - Eva TypeScript Evaluation Framework

[![npm version](https://badge.fury.io/js/eva-ts.svg)](https://badge.fury.io/js/eva-ts)

A powerful TypeScript evaluation framework for running concurrent evaluations with progress tracking and result persistence. Perfect for testing AI models, APIs, data processing pipelines, and any system that needs systematic evaluation against expected results.

**[📖 Full Documentation →](./apps/eval/README.md)**

```bash
npm install eva-ts
```

### [`apps/dash`](./apps/dash) - Eva Dashboard (Coming Soon)

A web-based dashboard for visualizing and managing evaluation results.

## Development

This workspace uses [Turborepo](https://turbo.build/repo) for efficient monorepo management.

### Getting Started

```bash
# Install dependencies
npm install

# Build all apps
npm run build

# Test all apps
npm run test

# Lint all apps
npm run lint
```

### Scripts

- `npm run dev` - Start development mode for all apps
- `npm run build` - Build all apps
- `npm run test` - Run tests for all apps
- `npm run lint` - Lint all apps
- `npm run lint:fix` - Fix linting issues
- `npm run check-types` - Type check all apps
- `npm run clean` - Clean build artifacts

## License

MIT - see [LICENSE](LICENSE) for details.

---

Made with ❤️ by [Lilac Labs](https://github.com/lilac-labs)
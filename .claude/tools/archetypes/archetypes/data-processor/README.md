# Data Processor Archetype

Create a robust data transformation and processing plugin with validation and batch processing capabilities.

## Features

- Input/output validation with JSON Schema
- Batch processing with configurable chunk sizes
- Progress reporting and callbacks
- Error handling and recovery
- Streaming support for large datasets
- TypeScript type safety

## Usage

```bash
archetype create data-processor -o my-data-processor
```

## Generated Structure

```
my-data-processor/
├── src/
│   ├── processor.ts       # Main processor class
│   ├── validator.ts       # Data validation
│   ├── types.ts           # TypeScript types
│   └── index.ts           # Entry point
├── tests/
├── package.json
└── README.md
```

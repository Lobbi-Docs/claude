# /import-csv Command

Import customer data from CSV files with automatic schema detection and field mapping.

## Usage

```bash
/import-csv <file-path> [options]
```

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `file-path` | Yes | Path to CSV file or directory containing CSV files |

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `--customer` | Required | Customer name for this migration |
| `--target` | Required | Target entity (e.g., Customer, Contact, Order) |
| `--encoding` | auto | File encoding (auto, utf-8, utf-16, iso-8859-1) |
| `--delimiter` | auto | Field delimiter (auto, comma, tab, semicolon, pipe) |
| `--has-header` | true | First row contains column headers |
| `--skip-rows` | 0 | Number of rows to skip before header |
| `--batch-size` | 1000 | Records per batch |
| `--dry-run` | false | Run validation only, don't import |
| `--skip-validation` | false | Skip validation phase (not recommended) |
| `--mapping-file` | null | Use existing mapping file |
| `--output-dir` | ./migrations | Output directory for reports |

## Examples

### Basic Import
```bash
/import-csv /data/customers.csv --customer "Acme Corp" --target Customer
```

### Import with Options
```bash
/import-csv /data/legacy_data.csv \
  --customer "Acme Corp" \
  --target Customer \
  --encoding utf-8 \
  --delimiter comma \
  --batch-size 500 \
  --dry-run
```

### Import Multiple Files
```bash
/import-csv /data/customer_exports/ \
  --customer "Acme Corp" \
  --target Customer
```

### Resume Failed Import
```bash
/import-csv /data/customers.csv \
  --customer "Acme Corp" \
  --target Customer \
  --resume-from checkpoint-12345
```

## Workflow

1. **Analyze** - Detect encoding, delimiter, schema
2. **Map** - AI-assisted field mapping (pause for review)
3. **Validate** - Data quality checks
4. **Dry Run** - Simulate import
5. **Execute** - Perform actual import
6. **Verify** - Confirm data integrity
7. **Report** - Generate migration report

## Output

```
Importer: Starting CSV import for Acme Corp

Phase 1: Analyzing source file...
  - File: customers.csv (45.2 MB)
  - Encoding: UTF-8
  - Delimiter: comma
  - Records: 150,000
  - Columns: 15

Phase 2: Generating field mappings...
  - Auto-mapped: 11 fields (87% confidence)
  - Needs review: 4 fields
  [Pausing for mapping approval...]

Phase 3: Validating data...
  - Valid records: 147,823 (98.5%)
  - Errors: 1,543
  - Warnings: 634
  - Quality score: 85.5/100
  [Pausing for issue resolution...]

Phase 4: Dry run...
  - Simulated: 150,000 records
  - Would create: 145,234
  - Would skip: 766
  - Estimated time: 2h 30m

Phase 5: Executing migration...
  [========================================] 100%
  - Created: 145,234 records
  - Updated: 4,000 records
  - Skipped: 766 records
  - Duration: 2h 47m

Phase 6: Verifying...
  - Count match: OK
  - Sample check: OK (998/1000)
  - Integrity: OK

Migration Complete!
Report: /migrations/acme-corp/report-2024-01-15.pdf
```

## Error Handling

| Error | Resolution |
|-------|------------|
| File not found | Check path and permissions |
| Encoding error | Specify encoding manually |
| Mapping conflict | Review and approve mappings |
| Validation failure | Fix issues or skip records |
| Import failure | Resume from checkpoint |

## Related Commands

- `/analyze-source` - Analyze without importing
- `/generate-mapping` - Create mappings only
- `/validate-data` - Run validation only
- `/dry-run` - Simulate without importing
- `/resume-migration` - Resume failed migration
- `/migration-status` - Check progress

# Advanced Integration Validation

This guide explains how to run and extend integration contract validation for Jira, Automation, Confluence, and Harness orchestration.

## What the validator checks

`npm run validate:integrations` executes `scripts/validate-integrations.ts` against fixture scenarios in `tests/integration-contracts/fixtures/`.

Validation dimensions:

1. **Jira required fields/properties**
   - Required issue fields must exist in scenario payloads.
   - Required issue properties (integration metadata) must be present.
2. **Automation rule template completeness**
   - Required steps must be present in each template.
   - Each declared step should include an action.
3. **Confluence template schema**
   - Required template properties must exist.
   - Property types must match expected schema types.
4. **Harness transition map coverage**
   - Required Jira transitions must map to Harness execution stages.

## Contributor workflow

1. Update or add fixtures under `tests/integration-contracts/fixtures/*.json`.
2. Run validator locally:

   ```bash
   npm run validate:integrations
   ```

3. Review `sessions/reports/integration-health.json`.
4. Run focused tests:

   ```bash
   npm run test -- tests/integration-contracts/validate-integrations.test.ts
   ```

5. Run CI bundle before opening PR:

   ```bash
   npm run ci
   ```

## Report format

The validator emits `sessions/reports/integration-health.json` with:

- `summary.totalScenarios`
- `summary.passedScenarios`
- `summary.issuesBySeverity` (`info`, `warning`, `error`)
- `issues[]` entries with:
  - `scenario`
  - `area`
  - `severity`
  - `message`
  - `remediation`

## Adding new scenarios

Use existing fixtures as templates for new release states (for example, hotfix, partial rollback, or security exception workflows). Keep scenarios deterministic and avoid environment-specific IDs.

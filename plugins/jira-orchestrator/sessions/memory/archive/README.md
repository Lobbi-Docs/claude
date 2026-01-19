# Memory Graph Archive

This directory stores archived entities removed from the active knowledge graph.

## Archive Format

Archives are stored as JSON files with timestamp:
```
archive-2026-01-19T13-52-30.json
```

Each archive contains:
- Entity name, type, observations
- Related relations
- Archive timestamp and reason
- Metadata for restoration

## Archival Policy

Entities are archived when:
- Inactive for >30 days (configurable)
- Identified as orphaned (no relations)
- Manually archived during maintenance

## Restoration

To restore an archived entity:
1. Load the archive JSON file
2. Use Memory MCP `create_entities` to recreate
3. Use `create_relations` to restore connections

## Maintenance

Archives are retained indefinitely. Manual cleanup recommended:
- Review archives >90 days old
- Delete archives for obsolete data
- Compress older archives if needed

## Configuration

See `config/mcps/memory.json`:
- `orphanThresholdDays` - Days before archival
- `archivePath` - This directory

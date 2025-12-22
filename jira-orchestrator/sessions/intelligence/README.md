# Intelligence Module - Storage Directory

This directory contains all data and records for the **intelligence-analyzer** agent, which provides predictive analytics, learning capabilities, and data-driven insights for the jira-orchestrator system.

## Directory Structure

```
intelligence/
├── config/
│   └── intelligence-config.yaml       # Configuration for prediction algorithms
│
├── history/                            # Task completion history
│   ├── 2025/
│   │   ├── 12/
│   │   │   ├── PROJ-123.yaml
│   │   │   └── ...
│   │   └── ...
│   └── index.json                      # Quick lookup index
│
├── agents/                             # Agent performance tracking
│   ├── react-component-architect.yaml
│   ├── prisma-specialist.yaml
│   └── ...
│
├── velocity/                           # Team velocity and metrics
│   ├── lobbi-core-team/
│   │   ├── sprint-21.yaml
│   │   ├── sprint-22.yaml
│   │   └── ...
│   └── index.json
│
├── patterns/                           # Detected patterns and bottlenecks
│   ├── auth-integration-delay.yaml
│   ├── database-migration-complexity.yaml
│   └── index.json
│
├── sprint-briefings/                   # Pre-sprint intelligence reports
│   ├── sprint-25-briefing.yaml
│   └── ...
│
├── reports/                            # Generated reports
│   ├── weekly/
│   ├── monthly/
│   └── insights/
│
└── archives/                           # Archived old records
    └── ...
```

## File Naming Conventions

### Task History
- **Format:** `{ISSUE-KEY}.yaml`
- **Location:** `history/{YEAR}/{MONTH}/`
- **Example:** `history/2025/12/PROJ-123.yaml`

### Agent Performance
- **Format:** `{agent-name}.yaml`
- **Location:** `agents/`
- **Example:** `agents/react-component-architect.yaml`

### Velocity Records
- **Format:** `sprint-{N}.yaml`
- **Location:** `velocity/{team-id}/`
- **Example:** `velocity/lobbi-core-team/sprint-24.yaml`

### Pattern Records
- **Format:** `{pattern-id}.yaml`
- **Location:** `patterns/`
- **Example:** `patterns/auth-integration-delay.yaml`

### Sprint Briefings
- **Format:** `sprint-{N}-briefing.yaml`
- **Location:** `sprint-briefings/`
- **Example:** `sprint-briefings/sprint-25-briefing.yaml`

## Data Retention

As configured in `config/intelligence-config.yaml`:

- **Task History:** 2 years (730 days)
- **Agent Performance:** 2 years (730 days)
- **Velocity Records:** 3 years (1095 days)
- **Pattern Records:** 2 years (730 days)

Auto-archiving runs every 90 days and moves old records to `archives/`.

## Index Files

Index files (`index.json`) provide fast lookups without scanning all YAML files. They are automatically updated when new records are created.

### Example index.json
```json
{
  "last_updated": "2025-12-22T10:00:00Z",
  "total_records": 156,
  "records": {
    "PROJ-123": {
      "file_path": "2025/12/PROJ-123.yaml",
      "issue_type": "Story",
      "domain": "frontend",
      "complexity": 5,
      "completion_date": "2025-12-19"
    }
  }
}
```

## Usage Examples

### Example 1: Analyze an Issue

```bash
# Request
"Analyze PROJ-234 for complexity, risk, and priority"

# Process
1. Load similar historical issues from history/
2. Load domain complexity weights from config/
3. Load pattern database from patterns/
4. Run prediction algorithms
5. Generate intelligence report
6. Save to reports/insights/
```

### Example 2: Generate Sprint Briefing

```bash
# Request
"Generate sprint 25 intelligence briefing"

# Process
1. Load backlog issues from Jira
2. For each issue:
   - Predict complexity (using history/)
   - Assess risk (using patterns/)
   - Calculate priority (using config weights)
3. Load velocity forecast (using velocity/)
4. Generate briefing document
5. Save to sprint-briefings/sprint-25-briefing.yaml
```

### Example 3: Track Agent Performance

```bash
# Triggered when issue completes

# Process
1. Load task history for completed issue
2. Extract agent assignments and outcomes
3. Load existing agent performance record from agents/
4. Update performance metrics:
   - Success rate
   - Estimation accuracy
   - Quality scores
5. Save updated agent performance record
```

### Example 4: Detect Patterns

```bash
# Request
"Analyze patterns in delayed auth tasks"

# Process
1. Query history/ for auth domain issues
2. Filter by delayed or blocked status
3. Cluster similar issues
4. Calculate pattern statistics
5. Generate pattern record
6. Save to patterns/auth-integration-delay.yaml
```

## Integration with Other Agents

### Expert-Agent-Matcher Integration

Intelligence analyzer provides:
- Agent performance data from `agents/`
- Historical success rates
- Specialization scores
- Optimal agent pairings

Expert-agent-matcher uses this to:
- Boost scores for top-performing agents
- Adjust confidence thresholds
- Recommend backup experts

### Agent-Router Integration

Intelligence analyzer provides:
- Domain risk scores from `patterns/`
- Complexity mappings
- Historical routing success

Agent-router uses this to:
- Adjust minimum score thresholds
- Select agents based on risk level
- Learn from routing outcomes

## Maintenance

### Manual Cleanup

```bash
# Archive old records (older than retention period)
cd /home/user/claude/jira-orchestrator/sessions/intelligence
find history/ -type f -mtime +730 -exec mv {} archives/ \;

# Rebuild indexes
# (Intelligence analyzer has a rebuild-indexes command)
```

### Backup

```bash
# Backup entire intelligence directory
tar -czf intelligence-backup-$(date +%Y%m%d).tar.gz intelligence/

# Backup to external location
rsync -av intelligence/ /backup/location/intelligence/
```

### Validation

```bash
# Validate YAML files
find intelligence/ -name "*.yaml" -exec yamllint {} \;

# Check index consistency
# (Intelligence analyzer has a validate-indexes command)
```

## Configuration Changes

When updating `config/intelligence-config.yaml`:

1. **Backup existing config**
   ```bash
   cp config/intelligence-config.yaml config/intelligence-config.yaml.backup
   ```

2. **Make changes** to configuration file

3. **Validate** configuration
   ```bash
   yamllint config/intelligence-config.yaml
   ```

4. **Test** with a single issue before full deployment

5. **Monitor** prediction accuracy after changes

## Troubleshooting

### Predictions are inaccurate

**Possible causes:**
- Insufficient historical data (< 5 completed issues)
- Configuration weights need tuning
- Similar issues not being matched correctly

**Solutions:**
- Increase `historical_lookback_days` in config
- Adjust keyword weights in config
- Lower `similarity_threshold` to match more broadly

### Performance is slow

**Possible causes:**
- Too many historical records
- Large index files
- Complex similarity calculations

**Solutions:**
- Archive old records
- Rebuild indexes
- Reduce `historical_lookback_days`

### Missing data

**Possible causes:**
- Records not being saved after task completion
- Auto-archive too aggressive
- Directory permissions

**Solutions:**
- Check directory permissions
- Verify `data_retention` settings in config
- Check `archives/` for moved records

## Best Practices

1. **Keep historical data clean**
   - Archive old records regularly
   - Remove duplicate or corrupted records
   - Validate data quality

2. **Monitor prediction accuracy**
   - Review weekly/monthly reports
   - Compare predictions vs actuals
   - Adjust config when accuracy drops

3. **Update patterns regularly**
   - Run pattern detection monthly
   - Review and refine mitigation strategies
   - Remove outdated patterns

4. **Backup data**
   - Weekly backups of entire directory
   - Keep backups for 1 year
   - Test restore procedures

5. **Review configuration**
   - Quarterly review of weights and thresholds
   - Adjust based on team changes
   - Document configuration changes

## Contributing Data

To improve intelligence analyzer accuracy, ensure:

- ✅ All completed issues have accurate metadata
- ✅ Story points are updated if changed during sprint
- ✅ Issues are properly labeled with domains
- ✅ Agent assignments are recorded
- ✅ Lessons learned are documented

The more complete the data, the better the predictions!

---

**Last Updated:** 2025-12-22
**Module Version:** 1.0.0
**Maintainer:** Intelligence Analyzer Agent

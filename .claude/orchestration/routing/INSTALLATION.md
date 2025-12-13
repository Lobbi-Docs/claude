# Model Routing System - Installation & Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
cd .claude/orchestration/routing
npm install
```

This will install:
- `@anthropic-ai/sdk` - Anthropic Claude SDK
- `zod` - Runtime type validation
- TypeScript and build tools

### 2. Build the TypeScript Code

```bash
npm run build
```

This compiles the TypeScript files to JavaScript in the `dist/` directory.

### 3. Initialize the Database

```bash
# Create database from schema
sqlite3 ../db/routing.db < ../db/routing.sql

# Or if the db directory doesn't exist:
mkdir -p ../db
sqlite3 ../db/routing.db < ../db/routing.sql
```

This creates:
- Tables for routing decisions, outcomes, costs
- Views for analytics
- Triggers for automatic updates
- Initial budget configuration

### 4. Configure Environment Variables

Create or update `.env` in the project root:

```bash
# Model Routing Configuration
ROUTING_DEFAULT_MODEL=sonnet
ROUTING_ENABLE_CACHE=true
ROUTING_CACHE_TTL=3600
ROUTING_ENABLE_LEARNING=true

# Budget Limits
ROUTING_DAILY_BUDGET=10.0
ROUTING_MONTHLY_BUDGET=250.0
ROUTING_PER_REQUEST_LIMIT=1.0

# Fallback Configuration
ROUTING_FALLBACK_ENABLED=true
ROUTING_MAX_RETRIES=3
ROUTING_TIMEOUT=60000

# API Keys (if not already set)
ANTHROPIC_API_KEY=your-key-here
OPENAI_API_KEY=your-key-here
GOOGLE_API_KEY=your-key-here
```

### 5. Test the Installation

```bash
# Run the test suite
npm run test

# Or manually:
npx ts-node test-routing.ts
```

Expected output:
- Task classification tests
- Model routing decisions
- Cost comparisons
- Budget tracking
- Fallback chain validation

### 6. Verify Database

```bash
sqlite3 ../db/routing.db

# Run some queries
SELECT * FROM budget_tracking;
SELECT * FROM model_performance;
.quit
```

## Usage in Code

### Import and Initialize

```typescript
import { createDefaultRoutingSystem } from './.claude/orchestration/routing';

const routing = createDefaultRoutingSystem();
```

### Route a Task

```typescript
const decision = await routing.routeTask(
  "Implement user authentication system"
);

console.log(`Selected: ${decision.model.name}`);
console.log(`Cost: $${decision.estimatedCost.toFixed(4)}`);
```

### Execute with Routing

```typescript
const result = await routing.executeWithRouting(
  "Fix authentication bug",
  async (model) => {
    // Your LLM API call here
    return await callYourLLM(model, prompt);
  }
);
```

## Command Line Interface

Once installed, use the `/model` command:

```bash
# Get routing recommendation
/model route "Design microservices architecture"

# View statistics
/model stats

# Check budget
/model budget

# Cost analysis
/model cost --period week
```

## Configuration Files

### Default Config Location

`.claude/orchestration/routing/config.json`

```json
{
  "defaultModel": "sonnet",
  "weights": {
    "capability": 0.35,
    "cost": 0.20,
    "latency": 0.15,
    "quality": 0.20,
    "historical": 0.10
  },
  "budget": {
    "dailyLimit": 10.0,
    "monthlyLimit": 250.0
  }
}
```

### Custom Configuration

```typescript
import { createRoutingSystem } from './.claude/orchestration/routing';

const routing = createRoutingSystem(
  {
    weights: {
      capability: 0.25,
      cost: 0.40,  // Prioritize cost
      latency: 0.10,
      quality: 0.15,
      historical: 0.10,
    },
  },
  {
    dailyLimit: 5.0,
    monthlyLimit: 100.0,
  }
);
```

## Directory Structure

After installation:

```
.claude/orchestration/routing/
├── node_modules/          # Dependencies (gitignored)
├── dist/                  # Compiled JavaScript (gitignored)
├── package.json           # NPM configuration
├── tsconfig.json          # TypeScript configuration
├── types.ts               # Type definitions
├── model-router.ts        # Routing logic
├── task-classifier.ts     # Task analysis
├── fallback-chain.ts      # Failure handling
├── cost-optimizer.ts      # Budget tracking
├── index.ts               # Public exports
├── test-routing.ts        # Test suite
├── README.md              # Documentation
├── INSTALLATION.md        # This file
└── .gitignore             # Git ignore rules

.claude/orchestration/db/
└── routing.sql            # Database schema
└── routing.db             # SQLite database (created)

.claude/commands/
└── model.md               # Command documentation
```

## Troubleshooting

### "tsc not found"

```bash
npm install -g typescript
# or
npx tsc
```

### "Cannot find module"

```bash
# Rebuild
npm run build

# Or install again
npm install
```

### "Database locked"

```bash
# Close any open database connections
# Or delete and recreate:
rm ../db/routing.db
sqlite3 ../db/routing.db < ../db/routing.sql
```

### Permission Errors

```bash
# On Windows, run as Administrator
# On Unix:
chmod +x ../db/routing.sql
```

## Next Steps

1. **Customize Weights**: Adjust routing weights based on your priorities
2. **Set Budgets**: Configure daily/monthly spending limits
3. **Enable Learning**: Let the system learn from outcomes
4. **Monitor Costs**: Regularly check `/model cost`
5. **Optimize**: Review suggestions from `/model cost`

## Support

For issues:
1. Check logs: `tail -f .claude/orchestration/logs/routing.log`
2. Query database: `sqlite3 ../db/routing.db`
3. Run tests: `npm run test`
4. Review README: `README.md`

## Upgrading

To upgrade to a new version:

```bash
# Pull latest changes
git pull

# Reinstall dependencies
npm install

# Rebuild
npm run build

# Migrate database if needed
sqlite3 ../db/routing.db < ../db/migrations/v1.1.sql
```

## Uninstallation

To remove the routing system:

```bash
# Remove node modules
rm -rf node_modules dist

# Remove database
rm ../db/routing.db

# Remove config
rm config.json
```

---

**Version:** 1.0.0
**Last Updated:** 2025-01-12

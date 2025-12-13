# Quick Installation Guide

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Git

## Installation Steps

### 1. Install Dependencies

```bash
cd .claude/core
npm install
```

### 2. Build Validator (Optional)

```bash
npm run build
```

### 3. Install Pre-Commit Hook

```bash
# Symlink (recommended)
ln -s ../../.claude/hooks/pre-commit-validate.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

# Or copy
cp .claude/hooks/pre-commit-validate.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

### 4. Configure IDE (Optional but Recommended)

#### VS Code

Create or update `.vscode/settings.json`:

```json
{
  "json.schemas": [
    {
      "fileMatch": ["**/plugin.json"],
      "url": "./.claude/schemas/plugin.schema.json"
    },
    {
      "fileMatch": ["**/*.agent.json"],
      "url": "./.claude/schemas/agent.schema.json"
    },
    {
      "fileMatch": ["**/*.skill.json"],
      "url": "./.claude/schemas/skill.schema.json"
    },
    {
      "fileMatch": ["**/*.command.json"],
      "url": "./.claude/schemas/command.schema.json"
    },
    {
      "fileMatch": ["**/*.workflow.json"],
      "url": "./.claude/schemas/workflow.schema.json"
    }
  ]
}
```

## Quick Test

```bash
cd .claude/core
node cli.js --file ../.claude-plugin/plugin.json
```

Expected output:
```
File: ../.claude-plugin/plugin.json
Type: plugin
Status: ✓ VALID
```

## Environment Variables

```bash
# Add to ~/.bashrc or ~/.zshrc
export VALIDATE_ON_COMMIT=true
export VERBOSE=false
```

## Verify Installation

```bash
# Check dependencies
node --version  # Should be 18+
npm --version

# Check validator
cd .claude/core
npm list ajv ajv-formats yaml

# Test validation
node cli.js --help
```

## Troubleshooting

### "Cannot find module"

```bash
cd .claude/core
rm -rf node_modules package-lock.json
npm install
```

### "Permission denied"

```bash
chmod +x .claude/hooks/pre-commit-validate.sh
chmod +x .git/hooks/pre-commit
```

### Hook not running

```bash
# Check symlink
ls -la .git/hooks/pre-commit

# Reinstall
rm .git/hooks/pre-commit
ln -s ../../.claude/hooks/pre-commit-validate.sh .git/hooks/pre-commit
```

## Next Steps

1. Read [README.md](./README.md) for detailed documentation
2. Check [VALIDATION-SYSTEM.md](./VALIDATION-SYSTEM.md) for system overview
3. Validate your first file: `node cli.js --file your-file.json`
4. Configure your IDE for inline validation
5. Commit changes to test the pre-commit hook

## Support

For issues or questions:
- Check the README.md for common problems
- Review schema documentation
- Run with `--verbose` flag for detailed output

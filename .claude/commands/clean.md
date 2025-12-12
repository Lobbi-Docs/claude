# Clean Project

Remove build artifacts, caches, and temporary files.

## Instructions

### 1. Python Cleanup

\`\`\`bash
echo "=== Cleaning Python artifacts ==="

# Remove __pycache__ directories
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null

# Remove .pyc files
find . -type f -name "*.pyc" -delete 2>/dev/null

# Remove .pyo files
find . -type f -name "*.pyo" -delete 2>/dev/null

# Remove pytest cache
rm -rf .pytest_cache 2>/dev/null

# Remove coverage files
rm -rf .coverage htmlcov coverage.xml 2>/dev/null

# Remove mypy cache
rm -rf .mypy_cache 2>/dev/null

# Remove egg-info
find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null

echo "Python cleanup complete"
\`\`\`

### 2. Node.js Cleanup

\`\`\`bash
echo "=== Cleaning Node.js artifacts ==="

# Remove node_modules (careful - need to reinstall)
# rm -rf node_modules

# Remove npm cache in project
rm -rf .npm 2>/dev/null

# Remove build outputs
rm -rf dist build 2>/dev/null

echo "Node.js cleanup complete"
\`\`\`

### 3. Docker Cleanup

\`\`\`bash
echo "=== Cleaning Docker artifacts ==="

# Remove stopped containers
docker container prune -f 2>/dev/null || true

# Remove unused images
docker image prune -f 2>/dev/null || true

# Remove dangling images
docker images -f "dangling=true" -q | xargs docker rmi 2>/dev/null || true

# Remove Golden Armada test images
docker images "golden-armada/*:test" -q | xargs docker rmi 2>/dev/null || true

# Full cleanup (aggressive - uncomment if needed)
# docker system prune -af

echo "Docker cleanup complete"
\`\`\`

### 4. Kubernetes Cleanup

\`\`\`bash
echo "=== Cleaning Kubernetes test resources ==="

# Remove test pods
kubectl delete pods -n agents -l app=test --ignore-not-found 2>/dev/null

# Remove completed jobs
kubectl delete jobs -n agents --field-selector status.successful=1 --ignore-not-found 2>/dev/null

# Remove failed pods
kubectl delete pods -n agents --field-selector status.phase=Failed --ignore-not-found 2>/dev/null

echo "Kubernetes cleanup complete"
\`\`\`

### 5. IDE/Editor Cleanup

\`\`\`bash
echo "=== Cleaning IDE artifacts ==="

# VS Code
rm -rf .vscode/*.log 2>/dev/null

# JetBrains
rm -rf .idea/*.xml.bak 2>/dev/null

echo "IDE cleanup complete"
\`\`\`

### 6. Log Cleanup

\`\`\`bash
echo "=== Cleaning log files ==="

# Remove log files older than 7 days
find . -type f -name "*.log" -mtime +7 -delete 2>/dev/null

# Remove Claude hooks logs
rm -rf .claude/logs/*.log 2>/dev/null

# Truncate large log files (keep last 1000 lines)
for f in $(find . -type f -name "*.log" -size +10M 2>/dev/null); do
    tail -1000 "$f" > "$f.tmp" && mv "$f.tmp" "$f"
done

echo "Log cleanup complete"
\`\`\`

### 7. Git Cleanup (Optional)

\`\`\`bash
echo "=== Cleaning Git artifacts ==="

# Remove untracked files (dry run first)
git clean -nd

# Actually remove (uncomment to execute)
# git clean -fd

# Prune remote branches
git remote prune origin 2>/dev/null || true

# Garbage collection
git gc --aggressive --prune=now 2>/dev/null || true

echo "Git cleanup complete"
\`\`\`

## Quick Clean (Safe)

\`\`\`bash
# Safe cleanup - won't delete important files
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null
find . -type f -name "*.pyc" -delete 2>/dev/null
rm -rf .pytest_cache .mypy_cache .coverage htmlcov 2>/dev/null
docker container prune -f 2>/dev/null || true
echo "Quick cleanup complete"
\`\`\`

## Deep Clean (Aggressive)

\`\`\`bash
# WARNING: This removes more files - review before running
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null
find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null
rm -rf .pytest_cache .mypy_cache .coverage htmlcov dist build 2>/dev/null
docker system prune -f 2>/dev/null || true
echo "Deep cleanup complete"
\`\`\`

## After Cleanup

After cleaning:
1. Reinstall dependencies: `pip install -r requirements.txt`
2. Rebuild images: `/build-agent`
3. Verify tests pass: `/test`

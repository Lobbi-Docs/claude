---
description: MongoDB administration commands - manage databases, collections, indexes, and queries
---

# MongoDB Administration

Execute MongoDB administration and query tasks. Available operations:

## Usage
```
/mongodb-admin <operation> [options]
```

## Operations

### Database Management
- `db-status` - Check database connection and status
- `db-stats` - Get database statistics
- `collection-list` - List all collections

### Index Management
- `index-list` - List indexes for collection
- `index-create` - Create new index
- `index-analyze` - Analyze index usage

### Query Tools
- `query-explain` - Explain query execution plan
- `query-profile` - Profile slow queries
- `aggregate` - Run aggregation pipeline

### Data Operations
- `export` - Export collection to JSON
- `import` - Import data from JSON
- `backup` - Create database backup

## Examples

```bash
# Check database status
/mongodb-admin db-status

# List collection indexes
/mongodb-admin index-list --collection members

# Explain query performance
/mongodb-admin query-explain --collection members --query '{"status": "ACTIVE"}'

# Run aggregation
/mongodb-admin aggregate --collection members --pipeline '[{"$group": {"_id": "$status", "count": {"$sum": 1}}}]'

# Export collection
/mongodb-admin export --collection members --output members.json
```

## Agent Assignment
This command activates the **mongodb-atlas-admin** or **mongodb-query-optimizer** agent based on operation type.

## Prerequisites
- MongoDB running (docker-compose up mongodb)
- Database credentials configured
- mongosh or MongoDB driver available

---
description: View and filter service logs with advanced search and tail capabilities
argument-hint: "<service-name> [--follow] [--since TIME] [--filter PATTERN]"
allowed-tools: ["Bash"]
---

View, filter, and analyze ACC service logs with real-time tailing, pattern matching, time-based filtering, and multi-service aggregation.

## Your Task

You are viewing logs for ACC services. Provide filtered, formatted log output with pattern matching, time filtering, and real-time tailing capabilities.

## Arguments

- `service-name` (required): Service name or "all" for all services
- `--follow` (optional): Follow log output in real-time (like tail -f)
- `--since` (optional): Show logs since timestamp (e.g., "1h", "30m", "2025-12-13T10:00:00")
- `--until` (optional): Show logs until timestamp
- `--filter` (optional): Filter logs by pattern (grep-compatible regex)
- `--tail` (optional): Number of lines to show (default: 100)
- `--level` (optional): Filter by log level (error, warn, info, debug)
- `--json` (optional): Parse and format JSON logs

## Steps to Execute

### 1. Validate Service Name

```bash
validate_service() {
  SERVICE=$1

  if [ "$SERVICE" = "all" ]; then
    return 0
  fi

  # Check if service exists
  docker ps -a --format '{{.Names}}' | grep -q "^acc-${SERVICE}$" || {
    echo "Error: Service 'acc-${SERVICE}' not found"
    echo ""
    echo "Available services:"
    docker ps -a --filter "label=acc.service.name" --format "  - {{.Names}}" | sed 's/acc-//'
    exit 1
  }
}
```

### 2. Build Docker Logs Command

```bash
build_logs_command() {
  SERVICE=$1
  FOLLOW=$2
  SINCE=$3
  UNTIL=$4
  TAIL=$5

  CMD="docker logs"

  # Follow flag
  [ "$FOLLOW" = "true" ] && CMD="$CMD -f"

  # Tail lines
  [ -n "$TAIL" ] && CMD="$CMD --tail $TAIL"

  # Since timestamp
  [ -n "$SINCE" ] && CMD="$CMD --since $SINCE"

  # Until timestamp
  [ -n "$UNTIL" ] && CMD="$CMD --until $UNTIL"

  # Service name
  if [ "$SERVICE" = "all" ]; then
    # Get all ACC containers
    CONTAINERS=$(docker ps --filter "label=acc.service.name" --format "{{.Names}}")
    CMD="docker compose logs"
    [ "$FOLLOW" = "true" ] && CMD="$CMD -f"
    [ -n "$TAIL" ] && CMD="$CMD --tail=$TAIL"
  else
    CMD="$CMD acc-${SERVICE}"
  fi

  echo "$CMD"
}
```

### 3. Apply Log Filtering

```bash
filter_logs() {
  FILTER=$1
  LEVEL=$2

  # Build filter pipeline
  PIPELINE="cat"

  # Level-based filtering
  if [ -n "$LEVEL" ]; then
    case $LEVEL in
      "error")
        PIPELINE="$PIPELINE | grep -iE 'error|fatal|exception'"
        ;;
      "warn")
        PIPELINE="$PIPELINE | grep -iE 'warn|warning'"
        ;;
      "info")
        PIPELINE="$PIPELINE | grep -iE 'info'"
        ;;
      "debug")
        PIPELINE="$PIPELINE | grep -iE 'debug|trace'"
        ;;
    esac
  fi

  # Custom pattern filtering
  if [ -n "$FILTER" ]; then
    PIPELINE="$PIPELINE | grep -E '$FILTER'"
  fi

  echo "$PIPELINE"
}
```

### 4. Format JSON Logs

```bash
format_json_logs() {
  # Parse and prettify JSON log lines
  while IFS= read -r line; do
    # Check if line is JSON
    if echo "$line" | jq empty 2>/dev/null; then
      # Extract common fields
      TIMESTAMP=$(echo "$line" | jq -r '.timestamp // .time // .ts // ""')
      LEVEL=$(echo "$line" | jq -r '.level // .severity // ""')
      MESSAGE=$(echo "$line" | jq -r '.message // .msg // ""')
      SERVICE=$(echo "$line" | jq -r '.service // .component // ""')

      # Color code by level
      case $LEVEL in
        "error"|"ERROR"|"fatal"|"FATAL")
          COLOR="\033[0;31m"  # Red
          ;;
        "warn"|"WARNING"|"warning")
          COLOR="\033[0;33m"  # Yellow
          ;;
        "info"|"INFO")
          COLOR="\033[0;32m"  # Green
          ;;
        "debug"|"DEBUG")
          COLOR="\033[0;36m"  # Cyan
          ;;
        *)
          COLOR="\033[0m"     # No color
          ;;
      esac
      RESET="\033[0m"

      # Format output
      printf "${COLOR}[%s] %s %s:${RESET} %s\n" \
        "$TIMESTAMP" \
        "$LEVEL" \
        "$SERVICE" \
        "$MESSAGE"
    else
      # Not JSON, print as-is
      echo "$line"
    fi
  done
}
```

### 5. Multi-Service Log Aggregation

```bash
aggregate_logs() {
  SERVICES=$1
  TAIL=$2
  SINCE=$3

  echo "=== Aggregated Logs ==="
  echo ""

  for service in $SERVICES; do
    echo "--- Logs from: $service ---"

    CMD="docker logs --tail ${TAIL:-100}"
    [ -n "$SINCE" ] && CMD="$CMD --since $SINCE"
    CMD="$CMD acc-${service}"

    # Execute and prefix with service name
    eval $CMD 2>&1 | sed "s/^/[$service] /"

    echo ""
  done
}
```

### 6. Search Logs for Patterns

```bash
search_logs() {
  PATTERN=$1
  SERVICES=$2

  echo "=== Searching for: $PATTERN ==="
  echo ""

  MATCHES=0

  for service in $SERVICES; do
    RESULT=$(docker logs acc-${service} 2>&1 | grep -E "$PATTERN")

    if [ -n "$RESULT" ]; then
      echo "--- Matches in: $service ---"
      echo "$RESULT" | while read line; do
        # Highlight pattern
        echo "$line" | GREP_COLOR='01;31' grep --color=always -E "$PATTERN"
        ((MATCHES++))
      done
      echo ""
    fi
  done

  echo "Total matches: $MATCHES"
}
```

### 7. Export Logs to File

```bash
export_logs() {
  SERVICE=$1
  OUTPUT_FILE=$2
  SINCE=$3
  UNTIL=$4

  echo "Exporting logs to: $OUTPUT_FILE"

  CMD="docker logs"
  [ -n "$SINCE" ] && CMD="$CMD --since $SINCE"
  [ -n "$UNTIL" ] && CMD="$CMD --until $UNTIL"
  CMD="$CMD acc-${SERVICE}"

  # Export with timestamps
  eval $CMD > "$OUTPUT_FILE" 2>&1

  # Compress if large
  FILE_SIZE=$(stat -f%z "$OUTPUT_FILE" 2>/dev/null || stat -c%s "$OUTPUT_FILE")
  if [ $FILE_SIZE -gt 10485760 ]; then  # 10MB
    gzip "$OUTPUT_FILE"
    OUTPUT_FILE="${OUTPUT_FILE}.gz"
    echo "Compressed to: $OUTPUT_FILE"
  fi

  echo "✅ Logs exported: $OUTPUT_FILE ($(du -h "$OUTPUT_FILE" | cut -f1))"
}
```

### 8. Analyze Error Frequency

```bash
analyze_errors() {
  SERVICE=$1
  HOURS=${2:-24}

  echo "=== Error Analysis: $SERVICE (Last ${HOURS}h) ==="
  echo ""

  # Get logs
  LOGS=$(docker logs --since ${HOURS}h acc-${SERVICE} 2>&1)

  # Count errors
  ERROR_COUNT=$(echo "$LOGS" | grep -icE 'error|fatal|exception')
  WARN_COUNT=$(echo "$LOGS" | grep -icE 'warn|warning')

  echo "Total Errors: $ERROR_COUNT"
  echo "Total Warnings: $WARN_COUNT"
  echo ""

  # Top error messages
  echo "Top Error Messages:"
  echo "$LOGS" | grep -iE 'error|fatal|exception' | \
    sed 's/.*\(error\|fatal\|exception\)://' | \
    sort | uniq -c | sort -rn | head -10

  echo ""

  # Error timeline (hourly)
  echo "Error Timeline (hourly):"
  for hour in $(seq 0 $((HOURS-1))); do
    COUNT=$(docker logs --since ${hour}h --until $((hour-1))h acc-${SERVICE} 2>&1 | grep -icE 'error|fatal|exception')
    BAR=$(printf '█%.0s' $(seq 1 $((COUNT/10))))
    printf "%2dh ago: %4d %s\n" $hour $COUNT "$BAR"
  done
}
```

### 9. Live Log Monitoring with Filters

```bash
monitor_logs() {
  SERVICE=$1
  FILTER=$2
  LEVEL=$3

  echo "=== Live Log Monitor: $SERVICE ==="
  echo "Filter: ${FILTER:-none}"
  echo "Level: ${LEVEL:-all}"
  echo "Press Ctrl+C to stop"
  echo "================================"
  echo ""

  CMD="docker logs -f --tail 0 acc-${SERVICE}"

  # Apply filters
  if [ -n "$LEVEL" ]; then
    CMD="$CMD 2>&1 | grep -iE '${LEVEL}'"
  fi

  if [ -n "$FILTER" ]; then
    CMD="$CMD | grep -E '${FILTER}'"
  fi

  # Color code output
  eval $CMD | while read line; do
    if echo "$line" | grep -iqE 'error|fatal|exception'; then
      echo -e "\033[0;31m$line\033[0m"  # Red
    elif echo "$line" | grep -iqE 'warn|warning'; then
      echo -e "\033[0;33m$line\033[0m"  # Yellow
    elif echo "$line" | grep -iqE 'info'; then
      echo -e "\033[0;32m$line\033[0m"  # Green
    else
      echo "$line"
    fi
  done
}
```

### 10. Generate Log Statistics

```bash
log_statistics() {
  SERVICE=$1
  HOURS=${2:-24}

  echo "=== Log Statistics: $SERVICE (Last ${HOURS}h) ==="
  echo ""

  LOGS=$(docker logs --since ${HOURS}h acc-${SERVICE} 2>&1)
  TOTAL_LINES=$(echo "$LOGS" | wc -l)

  echo "Total Log Lines: $TOTAL_LINES"
  echo ""

  # Log level distribution
  echo "Log Level Distribution:"
  ERROR_COUNT=$(echo "$LOGS" | grep -icE 'error|fatal|exception')
  WARN_COUNT=$(echo "$LOGS" | grep -icE 'warn|warning')
  INFO_COUNT=$(echo "$LOGS" | grep -icE 'info')
  DEBUG_COUNT=$(echo "$LOGS" | grep -icE 'debug|trace')

  ERROR_PCT=$((ERROR_COUNT * 100 / TOTAL_LINES))
  WARN_PCT=$((WARN_COUNT * 100 / TOTAL_LINES))
  INFO_PCT=$((INFO_COUNT * 100 / TOTAL_LINES))
  DEBUG_PCT=$((DEBUG_COUNT * 100 / TOTAL_LINES))

  printf "  ERROR:   %6d (%3d%%) %s\n" $ERROR_COUNT $ERROR_PCT "$(printf '█%.0s' $(seq 1 $ERROR_PCT))"
  printf "  WARNING: %6d (%3d%%) %s\n" $WARN_COUNT $WARN_PCT "$(printf '█%.0s' $(seq 1 $WARN_PCT))"
  printf "  INFO:    %6d (%3d%%) %s\n" $INFO_COUNT $INFO_PCT "$(printf '█%.0s' $(seq 1 $INFO_PCT))"
  printf "  DEBUG:   %6d (%3d%%) %s\n" $DEBUG_COUNT $DEBUG_PCT "$(printf '█%.0s' $(seq 1 $DEBUG_PCT))"

  echo ""

  # Log rate
  LOG_RATE=$((TOTAL_LINES / HOURS))
  echo "Average Log Rate: $LOG_RATE lines/hour"
}
```

## Usage Examples

### View last 100 lines
```
/acc:logs ollama
```

### Follow logs in real-time
```
/acc:logs ollama --follow
```

### Show logs from last hour
```
/acc:logs home-assistant --since 1h
```

### Filter errors only
```
/acc:logs ollama --level error
```

### Search for pattern
```
/acc:logs ollama --filter "model.*loaded"
```

### View logs from all services
```
/acc:logs all --tail 50
```

### Export logs to file
```
/acc:logs postgres --since 24h --export /tmp/postgres.log
```

### Analyze error frequency
```
/acc:logs ollama --analyze --hours 48
```

### Live monitoring with filter
```
/acc:logs home-assistant --follow --filter "automation"
```

### JSON formatted logs
```
/acc:logs langfuse --json
```

## Expected Outputs

### Standard Log View
```
=== Logs: ollama (Last 100 lines) ===

2025-12-13T10:30:15Z [INFO] Ollama server starting...
2025-12-13T10:30:16Z [INFO] Loading model: llama2
2025-12-13T10:30:45Z [INFO] Model loaded successfully
2025-12-13T10:31:00Z [INFO] API request: POST /api/generate
2025-12-13T10:31:15Z [INFO] Generation complete (tokens: 256)
```

### Error Filtering
```
=== Logs: ollama (Errors only) ===

2025-12-13T08:15:30Z [ERROR] Failed to load model: out of memory
2025-12-13T09:22:45Z [ERROR] GPU initialization failed
2025-12-13T10:05:12Z [ERROR] Request timeout after 300s
```

### Error Analysis
```
=== Error Analysis: ollama (Last 24h) ===

Total Errors: 15
Total Warnings: 42

Top Error Messages:
  5 out of memory
  4 GPU initialization failed
  3 request timeout
  2 model not found
  1 invalid input

Error Timeline (hourly):
 0h ago:    2 ██
 1h ago:    1 █
 2h ago:    0
 3h ago:    3 ███
...
```

### Multi-Service Aggregation
```
=== Aggregated Logs ===

--- Logs from: ollama ---
[ollama] 2025-12-13T10:30:00Z Starting server...

--- Logs from: qdrant ---
[qdrant] 2025-12-13T10:30:05Z Collection created: embeddings

--- Logs from: neo4j ---
[neo4j] 2025-12-13T10:30:10Z Database online
```

## Success Criteria

- Service logs retrieved successfully
- Filters applied correctly
- Time ranges honored
- Pattern matching works
- Real-time tailing functional
- JSON parsing works (if enabled)
- Error analysis accurate
- Exported files valid
- No performance issues with large logs

## Notes

- Use --follow for real-time monitoring
- Large log exports are automatically compressed
- JSON formatting requires jq to be installed
- Regex patterns are case-sensitive by default
- Time formats: "1h", "30m", "2d", or ISO timestamps
- All services include stderr in output
- Color coding helps identify severity
- Log rotation may affect historical data
- Use --tail to limit initial output
- Pattern highlighting uses ANSI colors

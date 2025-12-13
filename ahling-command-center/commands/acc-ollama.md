---
description: Manage Ollama models, GPU allocation, and model serving with RX 7900 XTX optimization
argument-hint: "<operation> [model-name] [--gpu-layers N]"
allowed-tools: ["Bash", "Read", "Write"]
---

Manage Ollama models including pulling, listing, running, GPU optimization for AMD RX 7900 XTX, model creation, and performance tuning.

## Your Task

You are managing Ollama for local LLM serving on AMD GPU. Handle model operations, GPU allocation, performance optimization, and custom model creation.

## Arguments

- `operation` (required): Operation (list, pull, run, create, delete, show, gpu-status, optimize)
- `model-name` (optional): Model name (e.g., llama2, mistral, codellama)
- `--gpu-layers` (optional): Number of GPU layers (default: 35 for RX 7900 XTX)
- `--context-length` (optional): Context window size
- `--template` (optional): Path to Modelfile template
- `--quantization` (optional): Quantization format (Q4_0, Q5_K_M, Q8_0)

## Steps to Execute

### 1. Check Ollama Service Status

```bash
check_ollama() {
  echo "=== Checking Ollama Service ==="

  # Check if container is running
  docker ps --format '{{.Names}}' | grep -q "^acc-ollama$" || {
    echo "❌ Ollama container not running"
    echo "Start with: docker-compose -f compose/ai-core.yml up -d ollama"
    exit 1
  }

  echo "✅ Ollama container running"

  # Check API availability
  curl -s http://localhost:11434/api/tags > /dev/null || {
    echo "❌ Ollama API not responding"
    exit 1
  }

  echo "✅ Ollama API available"

  # Check GPU access
  docker exec acc-ollama rocm-smi --showuse > /dev/null 2>&1 && {
    echo "✅ AMD GPU accessible"
  } || {
    echo "⚠️  GPU not accessible (CPU-only mode)"
  }
}
```

### 2. List Available Models

```bash
list_models() {
  echo "=== Installed Ollama Models ==="
  echo ""

  MODELS=$(curl -s http://localhost:11434/api/tags | jq -r '.models[]')

  if [ -z "$MODELS" ]; then
    echo "No models installed"
    echo ""
    echo "Popular models to pull:"
    echo "  - llama2 (7B, general purpose)"
    echo "  - mistral (7B, high quality)"
    echo "  - codellama (7B/13B/34B, coding)"
    echo "  - dolphin-mixtral (47B, advanced)"
    echo "  - phi (2.7B, small & fast)"
    return 0
  fi

  # Table header
  printf "%-25s %-12s %-15s %-20s\n" "NAME" "SIZE" "QUANTIZATION" "MODIFIED"
  printf "%.s=" {1..80}
  echo ""

  # List each model
  curl -s http://localhost:11434/api/tags | jq -r '.models[] |
    "\(.name)\t\(.size)\t\(.details.quantization_level // "N/A")\t\(.modified_at)"' | \
  while IFS=$'\t' read -r name size quant modified; do
    # Convert size to human readable
    SIZE_GB=$(echo "scale=2; $size / 1073741824" | bc)
    MODIFIED_DATE=$(date -d "$modified" "+%Y-%m-%d %H:%M" 2>/dev/null || echo "$modified")

    printf "%-25s %-12s %-15s %-20s\n" \
      "$name" \
      "${SIZE_GB}GB" \
      "$quant" \
      "$MODIFIED_DATE"
  done

  echo ""
  echo "Total models: $(curl -s http://localhost:11434/api/tags | jq '.models | length')"
}
```

### 3. Pull Model from Registry

```bash
pull_model() {
  MODEL=$1

  echo "=== Pulling Model: $MODEL ==="
  echo ""

  # Start pull
  curl -X POST http://localhost:11434/api/pull \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"$MODEL\"}" \
    2>/dev/null | \
  while IFS= read -r line; do
    # Parse progress
    STATUS=$(echo "$line" | jq -r '.status // ""')
    TOTAL=$(echo "$line" | jq -r '.total // 0')
    COMPLETED=$(echo "$line" | jq -r '.completed // 0')

    if [ "$TOTAL" -gt 0 ]; then
      PERCENT=$((COMPLETED * 100 / TOTAL))
      BAR=$(printf '█%.0s' $(seq 1 $((PERCENT / 2))))
      printf "\r%s [%-50s] %d%%" "$STATUS" "$BAR" "$PERCENT"
    else
      echo "$STATUS"
    fi
  done

  echo ""
  echo "✅ Model pulled: $MODEL"

  # Show model info
  show_model "$MODEL"
}
```

### 4. Show Model Details

```bash
show_model() {
  MODEL=$1

  echo "=== Model Details: $MODEL ==="
  echo ""

  curl -X POST http://localhost:11434/api/show \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"$MODEL\"}" \
    2>/dev/null | jq -r '
      "Name: \(.modelfile | split("\n")[0] | split(" ")[1])",
      "Template: \(.template)",
      "Parameters:",
      (.parameters | split("\n")[] | "  - \(.)"),
      "",
      "System Prompt:",
      "  \(.system // "None")",
      "",
      "License: \(.license // "Unknown")"
    '
}
```

### 5. Run Model Inference

```bash
run_model() {
  MODEL=$1
  PROMPT=$2
  GPU_LAYERS=${3:-35}
  CONTEXT_LENGTH=${4:-4096}

  echo "=== Running Inference: $MODEL ==="
  echo "Prompt: $PROMPT"
  echo "GPU Layers: $GPU_LAYERS"
  echo "Context: $CONTEXT_LENGTH"
  echo "================================"
  echo ""

  START_TIME=$(date +%s)

  curl -X POST http://localhost:11434/api/generate \
    -H "Content-Type: application/json" \
    -d "{
      \"model\": \"$MODEL\",
      \"prompt\": \"$PROMPT\",
      \"options\": {
        \"num_gpu\": $GPU_LAYERS,
        \"num_ctx\": $CONTEXT_LENGTH,
        \"temperature\": 0.7
      },
      \"stream\": true
    }" \
    2>/dev/null | \
  while IFS= read -r line; do
    RESPONSE=$(echo "$line" | jq -r '.response // ""')
    DONE=$(echo "$line" | jq -r '.done // false')

    echo -n "$RESPONSE"

    if [ "$DONE" = "true" ]; then
      echo ""
      echo ""

      # Show timing
      TOTAL_DURATION=$(echo "$line" | jq -r '.total_duration // 0')
      LOAD_DURATION=$(echo "$line" | jq -r '.load_duration // 0')
      EVAL_COUNT=$(echo "$line" | jq -r '.eval_count // 0')
      EVAL_DURATION=$(echo "$line" | jq -r '.eval_duration // 0')

      TOTAL_SEC=$(echo "scale=2; $TOTAL_DURATION / 1000000000" | bc)
      LOAD_SEC=$(echo "scale=2; $LOAD_DURATION / 1000000000" | bc)
      TOKENS_PER_SEC=$(echo "scale=2; $EVAL_COUNT / ($EVAL_DURATION / 1000000000)" | bc)

      echo "================================"
      echo "Performance:"
      echo "  Total Time: ${TOTAL_SEC}s"
      echo "  Load Time: ${LOAD_SEC}s"
      echo "  Tokens Generated: $EVAL_COUNT"
      echo "  Speed: ${TOKENS_PER_SEC} tokens/sec"
    fi
  done
}
```

### 6. Create Custom Model

```bash
create_model() {
  MODEL_NAME=$1
  MODELFILE=$2

  echo "=== Creating Custom Model: $MODEL_NAME ==="
  echo ""

  if [ ! -f "$MODELFILE" ]; then
    echo "Error: Modelfile not found: $MODELFILE"
    exit 1
  fi

  # Create model
  curl -X POST http://localhost:11434/api/create \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"$MODEL_NAME\",
      \"modelfile\": $(jq -Rs . < "$MODELFILE")
    }" \
    2>/dev/null | \
  while IFS= read -r line; do
    STATUS=$(echo "$line" | jq -r '.status // ""')
    echo "$STATUS"
  done

  echo ""
  echo "✅ Custom model created: $MODEL_NAME"
}
```

### 7. Check GPU Status

```bash
gpu_status() {
  echo "=== AMD GPU Status ==="
  echo ""

  # Check if ROCm is available
  docker exec acc-ollama rocm-smi > /dev/null 2>&1 || {
    echo "❌ ROCm not available in container"
    exit 1
  }

  # GPU info
  echo "GPU Information:"
  docker exec acc-ollama rocm-smi --showproductname

  echo ""
  echo "GPU Usage:"
  docker exec acc-ollama rocm-smi --showuse

  echo ""
  echo "Memory Usage:"
  docker exec acc-ollama rocm-smi --showmeminfo vram

  echo ""
  echo "Temperature:"
  docker exec acc-ollama rocm-smi --showtemp

  echo ""
  echo "Power Usage:"
  docker exec acc-ollama rocm-smi --showpower
}
```

### 8. Optimize for RX 7900 XTX

```bash
optimize_for_7900xtx() {
  MODEL=$1

  echo "=== Optimizing for AMD RX 7900 XTX ==="
  echo ""

  # RX 7900 XTX specs
  VRAM_GB=24
  COMPUTE_UNITS=96

  # Recommended settings
  GPU_LAYERS=35  # Most layers on GPU
  BATCH_SIZE=512
  NUM_THREADS=14  # Leave cores for other services
  CONTEXT_LENGTH=8192  # Larger context for 24GB VRAM

  echo "Recommended Settings:"
  echo "  GPU Layers: $GPU_LAYERS (based on ${VRAM_GB}GB VRAM)"
  echo "  Batch Size: $BATCH_SIZE"
  echo "  CPU Threads: $NUM_THREADS"
  echo "  Context Length: $CONTEXT_LENGTH"
  echo ""

  # Create optimized Modelfile
  cat > /tmp/optimized-modelfile <<EOF
FROM $MODEL

# GPU optimization for RX 7900 XTX
PARAMETER num_gpu $GPU_LAYERS
PARAMETER num_thread $NUM_THREADS
PARAMETER num_ctx $CONTEXT_LENGTH
PARAMETER num_batch $BATCH_SIZE

# Performance tuning
PARAMETER temperature 0.7
PARAMETER top_k 40
PARAMETER top_p 0.9
PARAMETER repeat_penalty 1.1

# AMD-specific
PARAMETER use_mlock true
PARAMETER use_mmap true
EOF

  # Create optimized model
  OPTIMIZED_NAME="${MODEL}-7900xtx"
  create_model "$OPTIMIZED_NAME" "/tmp/optimized-modelfile"

  rm /tmp/optimized-modelfile

  echo "✅ Optimized model created: $OPTIMIZED_NAME"
}
```

### 9. Benchmark Model Performance

```bash
benchmark_model() {
  MODEL=$1
  GPU_LAYERS=${2:-35}

  echo "=== Benchmarking: $MODEL ==="
  echo "GPU Layers: $GPU_LAYERS"
  echo ""

  TEST_PROMPT="Explain quantum computing in simple terms."

  # Run 3 iterations
  TOTAL_TOKENS=0
  TOTAL_TIME=0

  for i in {1..3}; do
    echo "Run $i/3..."

    RESULT=$(curl -s -X POST http://localhost:11434/api/generate \
      -H "Content-Type: application/json" \
      -d "{
        \"model\": \"$MODEL\",
        \"prompt\": \"$TEST_PROMPT\",
        \"options\": {\"num_gpu\": $GPU_LAYERS},
        \"stream\": false
      }")

    TOKENS=$(echo "$RESULT" | jq -r '.eval_count')
    DURATION=$(echo "$RESULT" | jq -r '.eval_duration')
    DURATION_SEC=$(echo "scale=2; $DURATION / 1000000000" | bc)
    TOKENS_PER_SEC=$(echo "scale=2; $TOKENS / $DURATION_SEC" | bc)

    echo "  Tokens: $TOKENS, Time: ${DURATION_SEC}s, Speed: ${TOKENS_PER_SEC} t/s"

    TOTAL_TOKENS=$((TOTAL_TOKENS + TOKENS))
    TOTAL_TIME=$(echo "$TOTAL_TIME + $DURATION_SEC" | bc)
  done

  # Calculate averages
  AVG_TOKENS=$((TOTAL_TOKENS / 3))
  AVG_TIME=$(echo "scale=2; $TOTAL_TIME / 3" | bc)
  AVG_SPEED=$(echo "scale=2; $AVG_TOKENS / $AVG_TIME" | bc)

  echo ""
  echo "=== Benchmark Results ==="
  echo "Average Tokens: $AVG_TOKENS"
  echo "Average Time: ${AVG_TIME}s"
  echo "Average Speed: ${AVG_SPEED} tokens/sec"
  echo ""

  # Performance rating
  if (( $(echo "$AVG_SPEED > 50" | bc -l) )); then
    echo "✅ Excellent performance"
  elif (( $(echo "$AVG_SPEED > 30" | bc -l) )); then
    echo "✅ Good performance"
  elif (( $(echo "$AVG_SPEED > 15" | bc -l) )); then
    echo "⚠️  Moderate performance - consider reducing context or layers"
  else
    echo "❌ Poor performance - check GPU utilization"
  fi
}
```

### 10. Delete Model

```bash
delete_model() {
  MODEL=$1

  echo "Deleting model: $MODEL"

  curl -X DELETE http://localhost:11434/api/delete \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"$MODEL\"}" \
    2>/dev/null

  echo "✅ Model deleted: $MODEL"
}
```

## Usage Examples

### List all models
```
/acc:ollama list
```

### Pull a model
```
/acc:ollama pull llama2
```

### Pull specific variant
```
/acc:ollama pull llama2:13b
```

### Show model details
```
/acc:ollama show mistral
```

### Run inference
```
/acc:ollama run llama2 "Explain AI in simple terms"
```

### Check GPU status
```
/acc:ollama gpu-status
```

### Optimize for RX 7900 XTX
```
/acc:ollama optimize llama2
```

### Benchmark performance
```
/acc:ollama benchmark mistral --gpu-layers 35
```

### Create custom model
```
/acc:ollama create my-model --template ./Modelfile
```

### Delete model
```
/acc:ollama delete llama2:13b
```

## Expected Outputs

### List Models
```
=== Installed Ollama Models ===

NAME                      SIZE         QUANTIZATION    MODIFIED
================================================================================
llama2:latest             3.83GB       Q4_0            2025-12-13 10:00
mistral:latest            4.11GB       Q4_K_M          2025-12-12 15:30
codellama:13b             7.37GB       Q5_K_M          2025-12-11 09:15
dolphin-mixtral:latest    26.44GB      Q4_0            2025-12-10 20:45

Total models: 4
```

### GPU Status
```
=== AMD GPU Status ===

GPU Information:
GPU[0]: AMD Radeon RX 7900 XTX

GPU Usage:
GPU[0]: 45%

Memory Usage:
GPU[0] VRAM: 8.5GB / 24GB (35%)

Temperature:
GPU[0]: 65°C

Power Usage:
GPU[0]: 185W / 355W
```

### Benchmark Results
```
=== Benchmarking: mistral ===
GPU Layers: 35

Run 1/3...
  Tokens: 156, Time: 3.2s, Speed: 48.75 t/s
Run 2/3...
  Tokens: 162, Time: 3.4s, Speed: 47.65 t/s
Run 3/3...
  Tokens: 159, Time: 3.3s, Speed: 48.18 t/s

=== Benchmark Results ===
Average Tokens: 159
Average Time: 3.30s
Average Speed: 48.19 tokens/sec

✅ Excellent performance
```

## Success Criteria

- Ollama service is accessible
- GPU is detected and utilized
- Models pull successfully
- Inference produces output
- GPU layers properly allocated
- Performance metrics accurate
- Custom models created successfully
- Benchmark completes without errors

## Notes

- RX 7900 XTX has 24GB VRAM (can handle larger models)
- Recommended GPU layers: 35 for 7B models, 40+ for larger
- Set HSA_OVERRIDE_GFX_VERSION=11.0.0 for RDNA3 support
- Use Q4_K_M or Q5_K_M quantization for best quality/speed balance
- Monitor temperature and power usage during heavy workloads
- Larger context windows require more VRAM
- Leave some CPU cores free for other services (14 threads recommended)
- Models are stored in /root/.ollama/models in container
- Use optimized models for production workloads
- Benchmark before deploying to identify bottlenecks

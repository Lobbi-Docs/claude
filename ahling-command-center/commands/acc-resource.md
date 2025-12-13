---
description: Check and optimize resource allocation across ACC infrastructure (CPU, RAM, GPU, VRAM)
argument-hint: "[--optimize] [--report]"
allowed-tools: ["Bash"]
---

Monitor and optimize resource allocation across ACC infrastructure with focus on 24-core CPU, 61GB RAM, and RX 7900 XTX GPU with 24GB VRAM.

## Your Task

You are managing ACC resource allocation. Monitor usage, identify bottlenecks, optimize allocation, and ensure efficient utilization of hardware resources.

## Arguments

- `--optimize` (optional): Automatically optimize resource allocation
- `--report` (optional): Generate detailed resource report
- `--gpu` (optional): Focus on GPU resource analysis
- `--recommendations` (optional): Provide optimization recommendations

## Steps to Execute

### 1. Check System Resources

```bash
check_system_resources() {
  echo "=== System Resources ==="
  echo ""

  # CPU
  echo "CPU:"
  echo "  Cores: $(nproc)"
  echo "  Model: $(lscpu | grep "Model name" | cut -d: -f2 | xargs)"
  echo "  Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
  echo ""

  # RAM
  echo "RAM:"
  echo "  Total: $(free -h | awk '/^Mem:/{print $2}')"
  echo "  Used: $(free -h | awk '/^Mem:/{print $3}')"
  echo "  Free: $(free -h | awk '/^Mem:/{print $4}')"
  echo "  Usage: $(free | awk '/^Mem:/{printf "%.1f", $3/$2 * 100}')%"
  echo ""

  # Disk
  echo "Disk:"
  df -h ${ACC_DATA_PATH} | tail -1 | awk '{printf "  Total: %s\n  Used: %s\n  Free: %s\n  Usage: %s\n", $2, $3, $4, $5}'
  echo ""

  # GPU
  if command -v rocm-smi &> /dev/null; then
    echo "GPU (AMD RX 7900 XTX):"
    echo "  Model: $(rocm-smi --showproductname | grep "Card" | cut -d: -f2 | xargs)"
    echo "  Usage: $(rocm-smi --showuse | grep "GPU use" | awk '{print $NF}')"
    echo "  VRAM: $(rocm-smi --showmeminfo vram | grep "Total" | awk '{print $NF}')"
    echo "  VRAM Used: $(rocm-smi --showmeminfo vram | grep "Used" | awk '{print $NF}')"
    echo "  Temperature: $(rocm-smi --showtemp | grep "Temperature" | awk '{print $NF}')"
    echo "  Power: $(rocm-smi --showpower | grep "Average" | awk '{print $NF}')"
  fi
}
```

### 2. Check Container Resources

```bash
check_container_resources() {
  echo "=== Container Resource Usage ==="
  echo ""

  docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}" \
    --filter "label=acc.service.name"

  echo ""

  # Identify resource hogs
  echo "Top 5 CPU Consumers:"
  docker stats --no-stream --format "{{.Name}}\t{{.CPUPerc}}" \
    --filter "label=acc.service.name" | \
    sort -k2 -rn | head -5 | \
    awk '{printf "  %s: %s\n", $1, $2}'

  echo ""

  echo "Top 5 Memory Consumers:"
  docker stats --no-stream --format "{{.Name}}\t{{.MemPerc}}" \
    --filter "label=acc.service.name" | \
    sort -k2 -rn | head -5 | \
    awk '{printf "  %s: %s\n", $1, $2}'
}
```

### 3. Analyze GPU Resource Allocation

```bash
analyze_gpu() {
  echo "=== GPU Resource Analysis ==="
  echo ""

  # Total VRAM: 24GB
  TOTAL_VRAM=24

  echo "Target Allocation (24GB VRAM):"
  echo "  - LLMs (Ollama): 16GB (67%)"
  echo "  - Video (Frigate): 4GB (17%)"
  echo "  - Voice (Whisper): 2GB (8%)"
  echo "  - Embeddings: 2GB (8%)"
  echo ""

  echo "Current Usage:"
  rocm-smi --showmeminfo vram

  echo ""

  # Check which containers are using GPU
  echo "GPU-Enabled Containers:"
  docker ps --filter "label=acc.service.name" --format "{{.Names}}" | while read container; do
    # Check if container has GPU access
    if docker inspect $container | jq -e '.[] | select(.HostConfig.DeviceRequests != null)' > /dev/null 2>&1; then
      echo "  - $container"

      # Try to get VRAM usage (if possible)
      # This would require rocm-smi inside container or nvidia-smi
    fi
  done
}
```

### 4. Generate Resource Report

```bash
generate_resource_report() {
  REPORT_FILE="/tmp/acc_resource_report_$(date +%Y%m%d_%H%M%S).md"

  cat > "$REPORT_FILE" <<EOF
# ACC Resource Report
Generated: $(date)

## System Overview

### Hardware
- CPU: $(nproc) cores
- RAM: $(free -h | awk '/^Mem:/{print $2}')
- GPU: AMD Radeon RX 7900 XTX
- VRAM: 24GB
- Disk: $(df -h ${ACC_DATA_PATH} | tail -1 | awk '{print $2}')

### Current Usage
- CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}')% ($(echo "scale=1; $(top -bn1 | grep "Cpu(s)" | awk '{print $2}') / 100 * $(nproc)" | bc) cores)
- RAM: $(free -h | awk '/^Mem:/{print $3}') / $(free -h | awk '/^Mem:/{print $2}') ($(free | awk '/^Mem:/{printf "%.1f", $3/$2 * 100}')%)
- VRAM: $(rocm-smi --showmeminfo vram 2>/dev/null | grep "Used" | awk '{print $NF}' || echo "N/A")
- Disk: $(df -h ${ACC_DATA_PATH} | tail -1 | awk '{print $5}')

## Service Resource Allocation

$(docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" --filter "label=acc.service.name")

## Resource Distribution by Phase

$(docker stats --no-stream --format "{{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" --filter "label=acc.service.name" | \
  awk '{
    split($1, parts, "-");
    phase = parts[2];
    cpu[phase] += $2;
    print phase, $2, $3;
  }')

## Recommendations

### CPU Allocation
$(check_cpu_recommendations)

### RAM Allocation
$(check_ram_recommendations)

### GPU Allocation
$(check_gpu_recommendations)

## Health Status
- ✅ System resources within normal range
- Overall utilization: $(echo "scale=1; ($(top -bn1 | grep "Cpu(s)" | awk '{print $2}') + $(free | awk '/^Mem:/{printf "%.1f", $3/$2 * 100}')) / 2" | bc)%

EOF

  echo "✅ Report generated: $REPORT_FILE"
  cat "$REPORT_FILE"
}
```

### 5. Optimize Resource Allocation

```bash
optimize_resources() {
  echo "=== Optimizing Resource Allocation ==="
  echo ""

  # Check for over-allocated containers
  echo "Checking for over-allocation..."

  docker stats --no-stream --format "{{.Name}}\t{{.CPUPerc}}\t{{.MemPerc}}" \
    --filter "label=acc.service.name" | \
  while read name cpu mem; do
    CPU_VAL=$(echo $cpu | tr -d '%')
    MEM_VAL=$(echo $mem | tr -d '%')

    # Flag if using < 10% of allocation (over-provisioned)
    if (( $(echo "$CPU_VAL < 10" | bc -l) )); then
      echo "  ⚠️  $name: CPU under-utilized ($cpu) - consider reducing limits"
    fi

    # Flag if using > 90% (under-provisioned)
    if (( $(echo "$CPU_VAL > 90" | bc -l) )); then
      echo "  ⚠️  $name: CPU near limit ($cpu) - consider increasing allocation"
    fi

    if (( $(echo "$MEM_VAL > 90" | bc -l) )); then
      echo "  ⚠️  $name: Memory near limit ($mem) - consider increasing allocation"
    fi
  done

  echo ""

  # Optimize Ollama GPU layers based on available VRAM
  echo "Optimizing Ollama GPU allocation..."

  USED_VRAM=$(rocm-smi --showmeminfo vram 2>/dev/null | grep "Used Memory" | awk '{print $4}' || echo "0")
  AVAILABLE_VRAM=$((24 - USED_VRAM))

  if [ $AVAILABLE_VRAM -gt 16 ]; then
    echo "  Recommendation: Increase Ollama GPU layers to 40 (VRAM available: ${AVAILABLE_VRAM}GB)"
  elif [ $AVAILABLE_VRAM -lt 12 ]; then
    echo "  Recommendation: Decrease Ollama GPU layers to 28 (VRAM available: ${AVAILABLE_VRAM}GB)"
  else
    echo "  ✅ Ollama GPU allocation optimal (35 layers for ${AVAILABLE_VRAM}GB available)"
  fi

  echo ""
  echo "✅ Optimization analysis complete"
}
```

### 6. Check for Resource Bottlenecks

```bash
check_bottlenecks() {
  echo "=== Resource Bottleneck Analysis ==="
  echo ""

  BOTTLENECKS=0

  # CPU bottleneck
  CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
  if (( $(echo "$CPU_USAGE > 80" | bc -l) )); then
    echo "⚠️  CPU Bottleneck Detected: ${CPU_USAGE}% usage"
    echo "   Recommendation: Review high CPU containers, consider load balancing"
    ((BOTTLENECKS++))
  fi

  # RAM bottleneck
  RAM_USAGE=$(free | awk '/^Mem:/{printf "%.1f", $3/$2 * 100}')
  if (( $(echo "$RAM_USAGE > 85" | bc -l) )); then
    echo "⚠️  RAM Bottleneck Detected: ${RAM_USAGE}% usage"
    echo "   Recommendation: Increase swap, review memory leaks, reduce container limits"
    ((BOTTLENECKS++))
  fi

  # VRAM bottleneck
  if command -v rocm-smi &> /dev/null; then
    VRAM_USAGE=$(rocm-smi --showmeminfo vram | grep "%" | awk '{print $NF}' | tr -d '%')
    if (( $(echo "$VRAM_USAGE > 90" | bc -l) )); then
      echo "⚠️  VRAM Bottleneck Detected: ${VRAM_USAGE}% usage"
      echo "   Recommendation: Reduce Ollama GPU layers, use smaller models, limit concurrent inference"
      ((BOTTLENECKS++))
    fi
  fi

  # Disk I/O bottleneck
  DISK_USAGE=$(df ${ACC_DATA_PATH} | tail -1 | awk '{print $5}' | tr -d '%')
  if (( DISK_USAGE > 85 )); then
    echo "⚠️  Disk Space Bottleneck: ${DISK_USAGE}% full"
    echo "   Recommendation: Clean old logs, prune Docker images, expand storage"
    ((BOTTLENECKS++))
  fi

  echo ""

  if [ $BOTTLENECKS -eq 0 ]; then
    echo "✅ No resource bottlenecks detected"
  else
    echo "Found $BOTTLENECKS bottleneck(s)"
  fi
}
```

### 7. Recommend Optimizations

```bash
recommend_optimizations() {
  cat <<EOF
=== Optimization Recommendations ===

## CPU Optimization
1. Reserve 8-10 cores for services, 14 cores for LLMs
2. Use CPU affinity to pin critical services to specific cores
3. Limit background tasks to off-peak hours

## RAM Optimization
1. Allocate 20GB for services, 30GB for LLMs
2. Enable swap (8GB recommended)
3. Monitor for memory leaks in long-running containers

## GPU/VRAM Optimization (RX 7900 XTX - 24GB)
1. Ollama LLMs: 16GB (GPU layers: 35-40)
2. Frigate NVR: 4GB (object detection)
3. Whisper STT: 2GB (medium model)
4. Embeddings: 2GB
5. Use HSA_OVERRIDE_GFX_VERSION=11.0.0 for RDNA3

## Docker Optimization
1. Prune unused images: docker image prune -a
2. Limit log sizes: --log-opt max-size=10m
3. Use multi-stage builds to reduce image size
4. Enable BuildKit for faster builds

## Service-Specific
- **Ollama**: Use Q4_K_M quantization for balance
- **Neo4j**: Allocate 25% of RAM (heap_initial_size=8g)
- **Postgres**: Allocate shared_buffers=4GB
- **Redis**: Allocate maxmemory=2gb

## Monitoring
1. Set up Prometheus alerts for >80% resource usage
2. Monitor GPU temperature (should stay < 85°C)
3. Track container restart counts
4. Log resource metrics to Grafana

EOF
}
```

## Usage Examples

### Check all resources
```
/acc:resource
```

### Generate detailed report
```
/acc:resource --report
```

### Analyze GPU usage
```
/acc:resource --gpu
```

### Optimize allocation
```
/acc:resource --optimize
```

### Get recommendations
```
/acc:resource --recommendations
```

## Expected Outputs

### Resource Check
```
=== System Resources ===

CPU:
  Cores: 24
  Model: AMD Ryzen 9 7950X
  Usage: 45.2%

RAM:
  Total: 61G
  Used: 42G
  Free: 19G
  Usage: 68.9%

Disk:
  Total: 500G
  Used: 250G
  Free: 250G
  Usage: 50%

GPU (AMD RX 7900 XTX):
  Model: AMD Radeon RX 7900 XTX
  Usage: 45%
  VRAM: 24GB
  VRAM Used: 16GB
  Temperature: 68°C
  Power: 185W

=== Container Resource Usage ===

NAME                CPU %    MEM USAGE / LIMIT    MEM %
acc-ollama          38.5%    18.2GB / 30GB        60.7%
acc-postgres        5.2%     2.1GB / 8GB          26.3%
acc-neo4j           8.1%     4.5GB / 8GB          56.3%
acc-home-assistant  2.1%     856MB / 2GB          42.8%
```

### Bottleneck Analysis
```
=== Resource Bottleneck Analysis ===

✅ No CPU bottleneck (45% usage)
✅ No RAM bottleneck (69% usage)
⚠️  VRAM nearing capacity (87% usage)
   Recommendation: Reduce Ollama GPU layers or use smaller models
✅ No disk bottleneck (50% usage)

Found 1 bottleneck(s)
```

## Success Criteria

- System resources monitored successfully
- Container allocation visible
- Bottlenecks identified
- Recommendations generated
- GPU usage tracked
- Report created successfully

## Notes

- 24-core CPU allows concurrent LLM inference and services
- 61GB RAM sufficient for multiple models
- RX 7900 XTX 24GB VRAM handles 70B models with quantization
- Monitor temperature to prevent thermal throttling
- Use docker stats for real-time monitoring
- Set resource limits in docker-compose.yml
- Allocate resources based on phase priority
- Foundation services need guaranteed resources
- LLM workloads are bursty (high usage during inference)
- GPU memory is not shared efficiently (unlike RAM)

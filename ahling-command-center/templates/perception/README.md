# Perception Services Template

Production-ready perception and voice services including video surveillance, facial recognition, and voice processing.

## Services Included

### Video & Vision
- **Frigate NVR** - AI-powered network video recorder with object detection
- **DoubleTake** - Facial recognition for camera feeds
- **CompreFace** - Face recognition backend (API + UI + PostgreSQL)

### Voice Processing
- **Whisper** - Speech-to-Text via Wyoming Protocol
- **Piper** - Text-to-Speech via Wyoming Protocol
- **Wyoming Satellite** - Voice pipeline coordinator

## Quick Start

```bash
# 1. Configure environment variables
export DOMAIN="your-domain.com"

# 2. Configure camera URLs and credentials in frigate/config.yml
# Edit the camera section with your RTSP camera details

# 3. Start all services
docker-compose up -d

# 4. Access UIs
# Frigate: https://frigate.your-domain.com
# DoubleTake: https://doubletake.your-domain.com
# CompreFace: https://compreface.your-domain.com
```

## Configuration

### Frigate NVR

**GPU Support**: Configured for AMD ROCm. For NVIDIA:
```yaml
# Change image to:
image: ghcr.io/blakeblackshear/frigate:stable-tensorrt
# Update devices:
devices:
  - /dev/nvidia0:/dev/nvidia0
runtime: nvidia
```

**Camera Setup**: Edit `frigate/config.yml`:
```yaml
cameras:
  your_camera_name:
    enabled: true
    ffmpeg:
      inputs:
        - path: rtsp://username:password@camera-ip:554/stream
          roles: [detect, record]
    detect:
      width: 1280
      height: 720
      fps: 5
    zones:
      # Define detection zones
      front_yard:
        coordinates: 100,100,500,100,500,400,100,400
```

**Object Detection**:
- Person detection threshold: 0.75
- Min area: 2500 pixels
- Retention: 30 days for persons, 14 days for cars
- ROCm GPU acceleration enabled

### DoubleTake Facial Recognition

**Initial Setup**:
1. Access CompreFace UI: `https://compreface.your-domain.com`
2. Create an account and API key
3. Create a recognition service
4. Update API key in docker-compose.yml vault reference
5. Add faces via CompreFace UI or DoubleTake

**Integration with Frigate**:
- Automatically processes person detections from Frigate
- Publishes recognized faces to MQTT
- Configurable confidence thresholds

### Wyoming Voice Pipeline

**Whisper STT**:
- Model: medium (balanced accuracy/speed)
- Language: English
- Device: ROCm GPU acceleration
- Port: 10300

**Available Models**:
- `tiny` - Fastest, least accurate
- `base` - Fast, basic accuracy
- `small` - Good balance
- `medium` - Better accuracy (default)
- `large` - Best accuracy, slower

**Piper TTS**:
- Voice: en_US-lessac-medium
- Device: ROCm GPU acceleration
- Port: 10200

**Available Voices**:
- `en_US-lessac-medium` - Clear, neutral (default)
- `en_US-amy-medium` - Feminine voice
- `en_GB-alan-medium` - British accent
- `en_US-libritts-high` - High quality, slower

**Wyoming Satellite Configuration**: Edit `wyoming/config.yaml`:
```yaml
microphone:
  command: arecord -r 16000 -c 1 -f S16_LE -t raw
speaker:
  command: aplay -r 22050 -c 1 -f S16_LE -t raw
vad:
  enabled: true
  threshold: 0.5
```

## Vault Secrets Required

```bash
# MQTT credentials
vault://secrets/mqtt/username
vault://secrets/mqtt/password

# Frigate
vault://secrets/frigate/rtsp_password

# CompreFace
vault://secrets/compreface/api_key
vault://secrets/compreface/db_password
```

## Resource Requirements

| Service | Memory | GPU | Storage |
|---------|--------|-----|---------|
| Frigate | 2-4 GB | Required | 100+ GB (recordings) |
| DoubleTake | 512 MB - 1 GB | Optional | 1 GB |
| CompreFace API | 2-3 GB | Recommended | 5 GB |
| CompreFace DB | 256-512 MB | No | 10 GB |
| Whisper | 2-4 GB | Required | 2 GB (models) |
| Piper | 1-2 GB | Recommended | 1 GB (voices) |
| Wyoming Satellite | 256-512 MB | No | 100 MB |

**Total**: ~8-15 GB RAM, AMD/NVIDIA GPU strongly recommended

## GPU Configuration

### AMD ROCm (Default)
```yaml
devices:
  - /dev/dri/renderD128:/dev/dri/renderD128
  - /dev/kfd:/dev/kfd
environment:
  - HSA_OVERRIDE_GFX_VERSION=10.3.0
  - ROCM_PATH=/opt/rocm
```

### NVIDIA CUDA
```yaml
devices:
  - /dev/nvidia0:/dev/nvidia0
runtime: nvidia
environment:
  - NVIDIA_VISIBLE_DEVICES=0
```

### CPU Only (Not Recommended)
```yaml
# Remove devices section
# Change --device rocm to --device cpu in command
command: --model medium --language en --device cpu
```

## Network Ports

| Service | Port | Protocol | Purpose |
|---------|------|----------|---------|
| Frigate | 5000 | HTTP | Web UI / API |
| Frigate | 1984 | HTTP | Go2RTC streams |
| Frigate | 8554 | RTSP | RTSP streams |
| Frigate | 8555 | WebRTC | WebRTC STUN |
| DoubleTake | 3000 | HTTP | Web UI / API |
| CompreFace UI | 80 | HTTP | Web UI |
| CompreFace API | 8000 | HTTP | API |
| Whisper | 10300 | TCP | Wyoming STT |
| Piper | 10200 | TCP | Wyoming TTS |
| Wyoming Satellite | 10400 | TCP | Wyoming pipeline |

## Integration Examples

### Home Assistant - Frigate

```yaml
# configuration.yaml
frigate:
  url: http://frigate:5000

camera:
  - platform: frigate
    name: Front Door

binary_sensor:
  - platform: mqtt
    name: "Front Door Person"
    state_topic: "frigate/front_door/person"
    device_class: motion
```

### Home Assistant - Wyoming Voice

```yaml
# configuration.yaml
wyoming:
  - uri: tcp://whisper:10300
    name: Whisper STT

  - uri: tcp://piper:10200
    name: Piper TTS

# Voice assistant
assist_pipeline:
  - name: "Ahling Assistant"
    conversation_engine: homeassistant
    conversation_language: en
    stt_engine: whisper_stt
    tts_engine: piper_tts
```

### Node-RED - Face Recognition Automation

```json
{
  "id": "face_recognition_flow",
  "type": "mqtt in",
  "topic": "doubletake/matches",
  "broker": "mosquitto",
  "datatype": "json",
  "name": "Face Detected"
}
```

## Monitoring

### Health Checks

```bash
# Check service status
docker-compose ps

# View Frigate logs
docker-compose logs -f frigate

# Check GPU utilization
rocm-smi  # AMD
nvidia-smi  # NVIDIA

# Test Wyoming services
echo "test" | nc whisper 10300
echo "test" | nc piper 10200
```

### Frigate Stats API

```bash
# System stats
curl http://localhost:5000/api/stats

# Camera-specific stats
curl http://localhost:5000/api/front_door/latest.jpg

# Events
curl http://localhost:5000/api/events
```

### MQTT Topics

```bash
# Subscribe to all Frigate events
mosquitto_sub -h localhost -t "frigate/#"

# Person detections
mosquitto_sub -h localhost -t "frigate/+/person"

# Face recognition
mosquitto_sub -h localhost -t "doubletake/matches"

# Wyoming events
mosquitto_sub -h localhost -t "wyoming/satellite/#"
```

## Storage Management

### Frigate Recording Retention

Edit `frigate/config.yml`:
```yaml
record:
  retain:
    days: 7  # Keep all recordings for 7 days
    mode: motion  # Only motion segments
  events:
    retain:
      default: 14  # Event clips for 14 days
      objects:
        person: 30  # Person events for 30 days
```

### Cleanup Old Data

```bash
# Remove old Frigate recordings (older than 7 days)
docker exec frigate find /media/frigate/recordings -mtime +7 -delete

# Vacuum database
docker exec frigate sqlite3 /db/frigate.db "VACUUM;"

# Clean CompreFace database
docker-compose exec compreface-postgres vacuumdb -U postgres -d frs
```

## Troubleshooting

### Frigate Issues

**No detections appearing**:
```bash
# Check detector status
curl http://localhost:5000/api/stats | jq '.detectors'

# Verify GPU is being used
docker exec frigate rocm-smi

# Check camera stream
ffprobe rtsp://username:password@camera-ip:554/stream
```

**High CPU usage**:
- Ensure GPU acceleration is working
- Reduce camera resolution or fps
- Enable hardware decoding in config

### DoubleTake/CompreFace Issues

**Faces not being recognized**:
- Check CompreFace API is accessible
- Verify API key is correct
- Add more training images (5-10 per person)
- Lower recognition threshold

### Wyoming Voice Issues

**Whisper not transcribing**:
```bash
# Check model is downloaded
docker exec whisper ls -lh /data/

# Test directly
echo "test audio" | nc localhost 10300

# View logs
docker-compose logs -f whisper
```

**Piper not speaking**:
```bash
# Check voice files
docker exec piper ls -lh /data/

# Test TTS
echo "Hello world" | nc localhost 10200

# Verify speaker device
docker exec wyoming-satellite aplay -l
```

## Performance Optimization

### Frigate Optimization

1. **Use hardware acceleration**: Enable GPU for detection and decoding
2. **Optimize camera streams**: Use substreams for detection (lower resolution)
3. **Tune detection regions**: Use zones and masks to reduce processing area
4. **Adjust frame rate**: 5 fps is usually sufficient for detection
5. **Enable MQTT**: Reduces database load for automations

### Voice Pipeline Optimization

1. **Model selection**: Use smaller Whisper/Piper models for faster response
2. **GPU acceleration**: Enable ROCm/CUDA for 5-10x speedup
3. **Voice Activity Detection**: Reduces false activations
4. **Audio quality**: Higher sample rates = better accuracy but slower processing

## Security Considerations

1. **Network Isolation**: Perception network is isolated from public
2. **HTTPS Only**: All UIs exposed via Traefik with TLS
3. **RTSP Credentials**: Never commit camera passwords to git
4. **API Keys**: Store in vault, rotate regularly
5. **Camera Placement**: Respect privacy, avoid private areas
6. **Face Data**: CompreFace data is sensitive, secure the database

## Backup Strategy

```bash
# Backup Frigate configuration
tar -czf frigate-config.tar.gz frigate/

# Backup Frigate database
docker exec frigate sqlite3 /db/frigate.db ".backup /db/frigate-backup.db"
docker cp frigate:/db/frigate-backup.db ./

# Backup CompreFace database
docker-compose exec compreface-postgres pg_dump -U postgres frs > compreface-backup.sql

# Backup Wyoming configuration
tar -czf wyoming-config.tar.gz wyoming/
```

## Advanced Features

### Custom Object Detection

Train custom models for Frigate:
- https://docs.frigate.video/guides/custom_models

### Multi-Language Voice

Add additional languages to Whisper:
```yaml
command: --model medium --language fr --device rocm
```

### Wake Word Detection

Add OpenWakeWord service for voice activation:
```yaml
openwakeword:
  image: rhasspy/wyoming-openwakeword
  command: --preload-model hey_jarvis
  ports:
    - "10400:10400"
```

## Support & Documentation

- Frigate: https://docs.frigate.video/
- DoubleTake: https://github.com/jakowenko/double-take
- CompreFace: https://github.com/exadel-inc/CompreFace
- Wyoming Protocol: https://github.com/rhasspy/wyoming
- Whisper: https://github.com/openai/whisper
- Piper: https://github.com/rhasspy/piper

## License

All services are open source with various licenses. Check individual project documentation for details.

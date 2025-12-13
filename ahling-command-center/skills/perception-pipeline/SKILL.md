# Perception Pipeline Skill

This skill provides comprehensive knowledge for deploying and managing the Ahling Command Center perception layer: Frigate NVR, DoubleTake facial recognition, CompreFace, and the Wyoming voice pipeline (Whisper, Piper, OpenWakeWord).

## Trigger Phrases

- "frigate", "nvr", "camera", "object detection"
- "doubletake", "facial recognition", "face detection"
- "whisper", "speech to text", "stt", "transcription"
- "piper", "text to speech", "tts", "voice synthesis"
- "wyoming", "voice pipeline", "wake word"
- "compreface", "face embedding", "face matching"

## Perception Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      PERCEPTION LAYER (Phase 5)                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌───────────────────────────────────────────────────────────────┐    │
│   │                      VIDEO PIPELINE                            │    │
│   │   ┌─────────┐    ┌─────────────┐    ┌─────────────┐          │    │
│   │   │ Cameras │───▶│   Frigate   │───▶│ DoubleTake  │          │    │
│   │   │ (RTSP)  │    │   (NVR)     │    │   (Face)    │          │    │
│   │   └─────────┘    └─────────────┘    └─────────────┘          │    │
│   │                         │                  │                  │    │
│   │                         ▼                  ▼                  │    │
│   │                  ┌─────────────┐    ┌─────────────┐          │    │
│   │                  │  CompreFace │    │    MQTT     │          │    │
│   │                  │ (Embedding) │    │  (Events)   │          │    │
│   │                  └─────────────┘    └─────────────┘          │    │
│   └───────────────────────────────────────────────────────────────┘    │
│                                                                          │
│   ┌───────────────────────────────────────────────────────────────┐    │
│   │                      VOICE PIPELINE                            │    │
│   │   ┌─────────┐    ┌─────────────┐    ┌─────────────┐          │    │
│   │   │ Willow  │───▶│  Whisper    │───▶│   Ollama    │          │    │
│   │   │(Satellite)│  │   (STT)     │    │  (Intent)   │          │    │
│   │   └─────────┘    └─────────────┘    └─────────────┘          │    │
│   │                         │                  │                  │    │
│   │                         ▼                  ▼                  │    │
│   │                  ┌─────────────┐    ┌─────────────┐          │    │
│   │                  │   Piper     │◀───│    Home     │          │    │
│   │                  │   (TTS)     │    │  Assistant  │          │    │
│   │                  └─────────────┘    └─────────────┘          │    │
│   └───────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Frigate NVR

### Hardware Acceleration (AMD ROCm)

Frigate supports AMD GPUs for object detection. Configure for RX 7900 XTX:

```yaml
# frigate/config/config.yml
mqtt:
  host: mosquitto
  port: 1883
  user: frigate
  password: ${MQTT_PASSWORD}

detectors:
  ov:
    type: openvino
    device: GPU
    model:
      path: /openvino-model/ssdlite_mobilenet_v2.xml

ffmpeg:
  hwaccel_args: preset-vaapi  # AMD VA-API acceleration

cameras:
  front_door:
    ffmpeg:
      inputs:
        - path: rtsp://camera:554/stream1
          roles:
            - detect
            - record
        - path: rtsp://camera:554/stream2
          roles:
            - rtmp
    detect:
      width: 1920
      height: 1080
      fps: 5
    objects:
      track:
        - person
        - car
        - dog
        - cat
    record:
      enabled: true
      retain:
        days: 7
        mode: motion
      events:
        retain:
          default: 14
          mode: active_objects
    snapshots:
      enabled: true
      retain:
        default: 14
    zones:
      driveway:
        coordinates: 0,480,640,480,640,360,0,360
      porch:
        coordinates: 640,480,1280,480,1280,360,640,360
```

### Docker Compose

```yaml
services:
  frigate:
    image: ghcr.io/blakeblackshear/frigate:stable
    container_name: frigate
    privileged: true
    shm_size: "256mb"
    devices:
      - /dev/dri/renderD128:/dev/dri/renderD128  # AMD GPU
    volumes:
      - ./frigate/config:/config
      - frigate_media:/media/frigate
      - type: tmpfs
        target: /tmp/cache
        tmpfs:
          size: 1000000000
    ports:
      - "5000:5000"
      - "8554:8554"  # RTSP
      - "8555:8555/tcp"  # WebRTC
      - "8555:8555/udp"
    environment:
      FRIGATE_RTSP_PASSWORD: ${RTSP_PASSWORD}
    deploy:
      resources:
        reservations:
          devices:
            - driver: amd
              count: 1
              capabilities: [gpu]
```

### MQTT Event Integration

```python
# Frigate publishes to these MQTT topics
FRIGATE_TOPICS = [
    "frigate/events",                    # All detection events
    "frigate/+/person",                  # Person detection by camera
    "frigate/+/car",                     # Car detection by camera
    "frigate/+/motion",                  # Motion events
    "frigate/+/person/snapshot",         # Person snapshot JPEG
    "frigate/reviews",                   # Review queue events
]

# Event payload structure
{
    "type": "new",  # new, update, end
    "before": {...},
    "after": {
        "id": "1234567890.123456-random",
        "camera": "front_door",
        "frame_time": 1234567890.123456,
        "snapshot_time": 1234567890.123456,
        "label": "person",
        "sub_label": null,
        "top_score": 0.95,
        "false_positive": null,
        "start_time": 1234567890.123456,
        "end_time": null,
        "score": 0.95,
        "box": [100, 200, 300, 400],
        "area": 40000,
        "ratio": 1.5,
        "region": [0, 0, 640, 480],
        "current_zones": ["driveway"],
        "entered_zones": ["driveway"],
        "thumbnail": null,
        "has_snapshot": true,
        "has_clip": true,
        "stationary": false
    }
}
```

## DoubleTake Facial Recognition

### Docker Compose

```yaml
services:
  doubletake:
    image: jakowenko/double-take:latest
    container_name: doubletake
    volumes:
      - doubletake_data:/.storage
    ports:
      - "3000:3000"
    environment:
      DETECTOR: compreface
      COMPREFACE_URL: http://compreface:8000
      COMPREFACE_API_KEY: ${COMPREFACE_API_KEY}
      FRIGATE_URL: http://frigate:5000
      MQTT_HOST: mosquitto
      MQTT_USERNAME: doubletake
      MQTT_PASSWORD: ${MQTT_PASSWORD}
```

### Configuration

```yaml
# doubletake/config.yml
mqtt:
  host: mosquitto
  username: doubletake
  password: ${MQTT_PASSWORD}
  topics:
    frigate: frigate/events
    matches: double-take/matches/+
    cameras: double-take/cameras/+

frigate:
  url: http://frigate:5000
  update_sub_labels: true

detectors:
  compreface:
    url: http://compreface:8000
    key: ${COMPREFACE_API_KEY}
    detect:
      min_face_size: 50
    recognize:
      threshold: 0.6

notify:
  gotify:
    url: http://gotify:80
    token: ${GOTIFY_TOKEN}

time:
  timezone: America/Chicago
```

## CompreFace

### Docker Compose

```yaml
services:
  compreface-postgres:
    image: postgres:14
    container_name: compreface-db
    environment:
      POSTGRES_USER: compreface
      POSTGRES_PASSWORD: ${COMPREFACE_DB_PASSWORD}
      POSTGRES_DB: frs
    volumes:
      - compreface_db:/var/lib/postgresql/data

  compreface-admin:
    image: exadel/compreface-admin:latest
    container_name: compreface-admin
    environment:
      POSTGRES_USER: compreface
      POSTGRES_PASSWORD: ${COMPREFACE_DB_PASSWORD}
      POSTGRES_URL: jdbc:postgresql://compreface-postgres:5432/frs
      SPRING_PROFILES_ACTIVE: dev
    ports:
      - "8000:8000"
    depends_on:
      - compreface-postgres

  compreface-api:
    image: exadel/compreface-api:latest
    container_name: compreface-api
    environment:
      POSTGRES_USER: compreface
      POSTGRES_PASSWORD: ${COMPREFACE_DB_PASSWORD}
      POSTGRES_URL: jdbc:postgresql://compreface-postgres:5432/frs
      SPRING_PROFILES_ACTIVE: dev
    depends_on:
      - compreface-postgres

  compreface-core:
    image: exadel/compreface-core:latest
    container_name: compreface-core
    environment:
      ML_PORT: 3000
```

## Wyoming Voice Pipeline

### Whisper (Speech-to-Text)

```yaml
services:
  wyoming-whisper:
    image: rhasspy/wyoming-whisper:latest
    container_name: wyoming-whisper
    command: >
      --model base.en
      --language en
      --device cuda
      --compute-type float16
    runtime: nvidia  # Use ROCm for AMD
    ports:
      - "10300:10300"
    volumes:
      - whisper_data:/data
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia  # Change to amd for ROCm
              count: 1
              capabilities: [gpu]
        limits:
          memory: 4G
```

### Piper (Text-to-Speech)

```yaml
services:
  wyoming-piper:
    image: rhasspy/wyoming-piper:latest
    container_name: wyoming-piper
    command: >
      --voice en_US-lessac-medium
      --speaker 0
      --length-scale 1.0
      --noise-scale 0.667
      --noise-w 0.8
    ports:
      - "10200:10200"
    volumes:
      - piper_data:/data
    deploy:
      resources:
        limits:
          memory: 1G
```

### OpenWakeWord

```yaml
services:
  wyoming-openwakeword:
    image: rhasspy/wyoming-openwakeword:latest
    container_name: wyoming-openwakeword
    command: >
      --preload-model 'hey_jarvis'
      --preload-model 'ok_nabu'
      --threshold 0.5
      --trigger-level 1
    ports:
      - "10400:10400"
    volumes:
      - openwakeword_data:/data
```

### Willow Voice Satellite

For ESP32-S3 based voice satellites:

```yaml
# Home Assistant configuration for Willow
wyoming:
  - name: "Living Room Satellite"
    host: 192.168.1.50
    port: 10500

assist_pipeline:
  - name: ahling_voice
    language: en
    conversation_engine: conversation.ollama
    stt_engine: stt.wyoming_whisper
    tts_engine: tts.wyoming_piper
    wake_word_entity: wake_word.openwakeword
```

## Voice Pipeline Integration

### Full Pipeline Docker Compose

```yaml
version: "3.8"

services:
  wyoming-whisper:
    image: rhasspy/wyoming-whisper:latest
    container_name: wyoming-whisper
    command: --model base.en --language en
    ports:
      - "10300:10300"
    volumes:
      - whisper_data:/data
    deploy:
      resources:
        limits:
          memory: 4G

  wyoming-piper:
    image: rhasspy/wyoming-piper:latest
    container_name: wyoming-piper
    command: --voice en_US-lessac-medium
    ports:
      - "10200:10200"
    volumes:
      - piper_data:/data

  wyoming-openwakeword:
    image: rhasspy/wyoming-openwakeword:latest
    container_name: wyoming-openwakeword
    command: --preload-model 'hey_jarvis' --threshold 0.5
    ports:
      - "10400:10400"

volumes:
  whisper_data:
  piper_data:
```

### Home Assistant Voice Configuration

```yaml
# Home Assistant configuration.yaml
wyoming:

# Add Wyoming integrations via UI or configuration:
# - Whisper: host=wyoming-whisper, port=10300
# - Piper: host=wyoming-piper, port=10200
# - OpenWakeWord: host=wyoming-openwakeword, port=10400

assist_pipeline:
  - name: ahling_voice_pipeline
    language: en
    conversation_engine: conversation.ollama_ahling
    stt_engine: stt.faster_whisper
    tts_engine: tts.piper
    wake_word_entity: wake_word.openwakeword

# Ollama conversation agent
conversation:
  - platform: ollama
    name: ollama_ahling
    url: http://ollama:11434
    model: ahling-home
    max_history: 10
    template: |
      You are the Ahling Command Center voice assistant.
      Control smart home devices and answer questions.
      Be concise - responses will be spoken aloud.
```

## Resource Allocation

### VRAM Budget (RX 7900 XTX - 24GB)

| Component | VRAM | Priority |
|-----------|------|----------|
| Frigate (OpenVINO) | 2GB | High |
| Whisper (base.en) | 1GB | High |
| Piper | 0.5GB | Medium |
| CompreFace | 1GB | Low |
| **Total Perception** | **4.5GB** | - |

### Memory Budget (61GB RAM)

| Component | RAM | Notes |
|-----------|-----|-------|
| Frigate | 4GB | + 256MB shm |
| DoubleTake | 1GB | |
| CompreFace | 2GB | |
| Whisper | 4GB | |
| Piper | 1GB | |
| **Total** | **12GB** | |

## Event Flow

```
Camera (RTSP) ──▶ Frigate ──▶ MQTT ──▶ Home Assistant
                    │                        │
                    ▼                        ▼
              DoubleTake ──▶ Notification  Automation
                    │
                    ▼
              CompreFace ──▶ Face Match ──▶ Presence

Microphone ──▶ OpenWakeWord ──▶ Whisper ──▶ Ollama ──▶ HA
                                              │
                                              ▼
                                           Piper ──▶ Speaker
```

## Best Practices

1. **Frigate**: Use sub-streams for detection, main stream for recording
2. **Whisper**: Use base.en model for best speed/accuracy balance
3. **Piper**: Pre-cache commonly used phrases
4. **CompreFace**: Train with multiple angles per person
5. **MQTT**: Use QoS 1 for important events
6. **Memory**: Monitor GPU memory with `rocm-smi`

## Troubleshooting

### Frigate GPU Detection

```bash
# Check VA-API support
vainfo

# Check Frigate logs
docker logs frigate 2>&1 | grep -i gpu
```

### Whisper Performance

```bash
# Test Whisper directly
echo "test" | nc -v wyoming-whisper 10300

# Check Wyoming status
curl http://homeassistant:8123/api/wyoming/info
```

## Related Skills

- [[home-assistant-brain]] - HA integration
- [[ollama-mastery]] - Voice intent processing
- [[microsoft-agents]] - Multi-agent voice workflows

## References

- [Frigate Documentation](https://docs.frigate.video/)
- [Wyoming Protocol](https://github.com/rhasspy/wyoming)
- [Piper TTS](https://github.com/rhasspy/piper)
- [DoubleTake](https://github.com/jakowenko/double-take)
- [CompreFace](https://github.com/exadel-inc/CompreFace)

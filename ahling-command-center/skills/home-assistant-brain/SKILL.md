# Home Assistant Brain Skill

This skill provides deep Home Assistant integration for the Ahling Command Center, including REST/WebSocket APIs, Wyoming voice pipeline, automations, and event streaming.

## Trigger Phrases

- "home assistant", "ha control", "smart home"
- "turn on", "turn off", "set temperature", "lock", "unlock"
- "voice pipeline", "wyoming", "whisper", "piper"
- "automation", "create automation", "trigger automation"
- "presence", "motion", "sensor", "camera"
- "frigate", "object detection", "person detected"

## API Connection

### REST API Authentication

```python
import aiohttp

class HomeAssistantClient:
    def __init__(self, url: str, token: str):
        self.url = url.rstrip("/")
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

    async def get_states(self):
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{self.url}/api/states",
                headers=self.headers
            ) as resp:
                return await resp.json()
```

### WebSocket Connection

```python
import websockets
import json

async def ha_websocket(url: str, token: str):
    """Connect to HA WebSocket for real-time events."""
    ws_url = url.replace("http", "ws") + "/api/websocket"

    async with websockets.connect(ws_url) as ws:
        # Receive auth_required
        await ws.recv()

        # Authenticate
        await ws.send(json.dumps({
            "type": "auth",
            "access_token": token
        }))

        # Receive auth_ok
        result = await ws.recv()

        # Subscribe to state changes
        await ws.send(json.dumps({
            "id": 1,
            "type": "subscribe_events",
            "event_type": "state_changed"
        }))

        # Listen for events
        async for message in ws:
            event = json.loads(message)
            yield event
```

## Entity Control

### Common Service Calls

```yaml
# Lights
light.turn_on:
  entity_id: light.living_room
  brightness_pct: 80
  color_temp_kelvin: 3000

light.turn_off:
  entity_id: light.living_room

# Climate
climate.set_temperature:
  entity_id: climate.main_thermostat
  temperature: 72
  hvac_mode: heat_cool

# Locks
lock.lock:
  entity_id: lock.front_door

# Covers
cover.set_cover_position:
  entity_id: cover.garage_door
  position: 0  # Closed

# Media
media_player.play_media:
  entity_id: media_player.living_room_speaker
  media_content_type: music
  media_content_id: "spotify:playlist:37i9dQZF1DX0XUsuxWHRQd"
```

### Entity Domains Reference

| Domain | Examples | Common Services |
|--------|----------|-----------------|
| `light` | light.living_room | turn_on, turn_off, toggle |
| `switch` | switch.coffee_maker | turn_on, turn_off, toggle |
| `climate` | climate.thermostat | set_temperature, set_hvac_mode |
| `cover` | cover.garage | open_cover, close_cover, set_position |
| `lock` | lock.front_door | lock, unlock |
| `media_player` | media_player.tv | play_media, pause, volume_set |
| `camera` | camera.front_door | snapshot, record |
| `sensor` | sensor.temperature | (read-only) |
| `binary_sensor` | binary_sensor.motion | (read-only) |
| `person` | person.markus | (read-only, tracking) |

## Wyoming Voice Pipeline

### Architecture

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   Willow    │───▶│   Wyoming    │───▶│   Whisper   │
│  Satellite  │    │   Protocol   │    │   (STT)     │
└─────────────┘    └──────────────┘    └─────────────┘
                          │                   │
                          │                   ▼
                          │           ┌─────────────┐
                          │           │   Ollama    │
                          │           │  (Intent)   │
                          │           └─────────────┘
                          │                   │
                          ▼                   ▼
                   ┌─────────────┐    ┌─────────────┐
                   │    Piper    │◀───│    Home     │
                   │    (TTS)    │    │  Assistant  │
                   └─────────────┘    └─────────────┘
```

### Wyoming Docker Compose

```yaml
services:
  wyoming-whisper:
    image: rhasspy/wyoming-whisper:latest
    container_name: wyoming-whisper
    command: --model base.en --language en --device cuda
    runtime: nvidia
    ports:
      - "10300:10300"
    volumes:
      - whisper_data:/data

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
    command: --preload-model 'hey_jarvis'
    ports:
      - "10400:10400"
```

### Voice Pipeline Configuration

```yaml
# Home Assistant configuration.yaml
wyoming:

assist_pipeline:
  - name: ahling_voice
    language: en
    conversation_engine: conversation.ollama
    stt_engine: stt.wyoming_whisper
    tts_engine: tts.wyoming_piper
    wake_word_entity: wake_word.openwakeword
```

### Custom Conversation Agent

```yaml
# Ollama conversation agent for HA
conversation:
  - platform: ollama
    name: ahling_assistant
    url: http://ollama:11434
    model: ahling-home
    max_history: 10
```

## Automations

### YAML Automation Template

```yaml
alias: "Motion Activated Lights"
description: "Turn on lights when motion detected, brightness based on time"
mode: restart
trigger:
  - platform: state
    entity_id: binary_sensor.living_room_motion
    to: "on"
condition:
  - condition: state
    entity_id: light.living_room
    state: "off"
action:
  - choose:
      - conditions:
          - condition: time
            after: "22:00:00"
            before: "06:00:00"
        sequence:
          - service: light.turn_on
            target:
              entity_id: light.living_room
            data:
              brightness_pct: 20
      - conditions:
          - condition: time
            after: "06:00:00"
            before: "22:00:00"
        sequence:
          - service: light.turn_on
            target:
              entity_id: light.living_room
            data:
              brightness_pct: 100
  - delay:
      minutes: 5
  - wait_for_trigger:
      - platform: state
        entity_id: binary_sensor.living_room_motion
        to: "off"
        for:
          minutes: 2
  - service: light.turn_off
    target:
      entity_id: light.living_room
```

### Programmatic Automation Creation

```python
async def create_automation(ha_client, config: dict):
    """Create automation via HA REST API."""
    response = await ha_client.post(
        "/api/config/automation/config",
        json=config
    )
    return response
```

## Event Streaming

### Subscribe to Events

```python
async def subscribe_events(ws, event_type: str):
    """Subscribe to specific HA events."""
    await ws.send(json.dumps({
        "id": next_id(),
        "type": "subscribe_events",
        "event_type": event_type
    }))

# Event types
EVENT_TYPES = [
    "state_changed",           # Entity state changes
    "automation_triggered",    # Automation executions
    "call_service",           # Service calls
    "frigate/events",         # Frigate object detection
    "mobile_app_notification_action",  # Notification actions
]
```

### Frigate Integration

```yaml
# Frigate events via MQTT
mqtt:
  broker: mosquitto
  topic_prefix: frigate

frigate:
  url: http://frigate:5000
  client_id: home-assistant

# Automation for person detection
automation:
  - alias: "Front Door Person Alert"
    trigger:
      - platform: mqtt
        topic: frigate/events
    condition:
      - condition: template
        value_template: "{{ trigger.payload_json.after.label == 'person' }}"
    action:
      - service: notify.mobile_app
        data:
          title: "Person Detected"
          message: "Person at {{ trigger.payload_json.after.camera }}"
          data:
            image: "/api/frigate/notifications/{{ trigger.payload_json.after.id }}/thumbnail.jpg"
```

## Presence Detection

### Multi-Source Presence

```yaml
# Combine multiple presence sources
template:
  - binary_sensor:
      - name: "Markus Home"
        state: >
          {{ is_state('person.markus', 'home')
             or is_state('device_tracker.markus_phone', 'home')
             or is_state('binary_sensor.markus_desk_occupancy', 'on') }}

# Presence-based automation
automation:
  - alias: "Welcome Home"
    trigger:
      - platform: state
        entity_id: binary_sensor.markus_home
        from: "off"
        to: "on"
    action:
      - service: script.welcome_home
```

## Energy Management

### Energy Dashboard Entities

```yaml
# Configure energy sources
sensor:
  - platform: template
    sensors:
      grid_import:
        unit_of_measurement: "kWh"
        device_class: energy
        state_class: total_increasing

  - platform: template
    sensors:
      solar_production:
        unit_of_measurement: "kWh"
        device_class: energy
        state_class: total_increasing
```

### Time-of-Use Automation

```yaml
automation:
  - alias: "Off-Peak Charging"
    trigger:
      - platform: time
        at: "00:00:00"
    condition:
      - condition: state
        entity_id: binary_sensor.ev_connected
        state: "on"
    action:
      - service: switch.turn_on
        entity_id: switch.ev_charger
```

## Integration with ACC

### MCP Tool Definitions

```typescript
// ha_get_state
{
  name: "ha_get_state",
  description: "Get current state of a Home Assistant entity",
  inputSchema: {
    type: "object",
    properties: {
      entity_id: { type: "string", description: "Entity ID (e.g., light.living_room)" }
    },
    required: ["entity_id"]
  }
}

// ha_call_service
{
  name: "ha_call_service",
  description: "Call a Home Assistant service",
  inputSchema: {
    type: "object",
    properties: {
      domain: { type: "string" },
      service: { type: "string" },
      target: { type: "object" },
      data: { type: "object" }
    },
    required: ["domain", "service"]
  }
}

// ha_voice_pipeline
{
  name: "ha_voice_pipeline",
  description: "Process voice command through full pipeline",
  inputSchema: {
    type: "object",
    properties: {
      text: { type: "string", description: "Voice command text" },
      respond: { type: "boolean", default: true }
    },
    required: ["text"]
  }
}
```

### Voice Command Flow

```python
async def process_voice_command(text: str):
    """Full voice command processing."""

    # 1. Intent recognition with Ollama
    intent = await ollama.chat(
        model="ahling-home",
        messages=[
            {"role": "system", "content": "Extract HA service call from: "},
            {"role": "user", "content": text}
        ]
    )

    # 2. Parse service call
    service_call = parse_intent(intent["message"]["content"])

    # 3. Execute on Home Assistant
    result = await ha.call_service(**service_call)

    # 4. Generate response
    response = await ollama.generate(
        model="llama3.2:7b",
        prompt=f"Confirm action: {service_call}"
    )

    # 5. TTS response via Piper
    await piper.speak(response)

    return result
```

## Troubleshooting

### Connection Issues

```bash
# Test HA API
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://homeassistant.local:8123/api/

# Check WebSocket
wscat -H "Authorization: Bearer YOUR_TOKEN" \
  -c ws://homeassistant.local:8123/api/websocket
```

### Voice Pipeline Issues

```bash
# Test Whisper
echo "test" | nc -v wyoming-whisper 10300

# Test Piper
echo '{"text": "Hello"}' | nc -v wyoming-piper 10200

# Check Wyoming status in HA
curl http://homeassistant.local:8123/api/wyoming/info
```

## Best Practices

1. **Use Long-Lived Tokens**: Store in Vault, not config files
2. **WebSocket for Real-Time**: Use WS for event streaming, REST for commands
3. **Entity ID Conventions**: Use consistent naming (location_type)
4. **Automation Modes**: Use `restart` or `queued` to prevent conflicts
5. **Presence Zones**: Define zones for accurate presence detection
6. **Event Filtering**: Filter events at source to reduce load

## Related Skills

- [[ollama-mastery]] - LLM integration for intent recognition
- [[microsoft-agents]] - Multi-agent home coordination
- [[perception-pipeline]] - Frigate, Whisper, Piper

## References

- [Home Assistant REST API](https://developers.home-assistant.io/docs/api/rest)
- [Home Assistant WebSocket API](https://developers.home-assistant.io/docs/api/websocket)
- [Wyoming Protocol](https://github.com/rhasspy/wyoming)
- [Frigate Integration](https://docs.frigate.video/integrations/home-assistant)

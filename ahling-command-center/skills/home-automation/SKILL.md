# Home Automation Skill

This skill provides comprehensive knowledge for deploying and managing the Ahling Command Center home automation layer: Home Assistant, Mosquitto MQTT, Zigbee2MQTT, ESPHome, and Node-RED.

## Trigger Phrases

- "home assistant", "ha setup", "smart home"
- "mqtt", "mosquitto", "message broker"
- "zigbee", "zigbee2mqtt", "z2m"
- "esphome", "esp32", "esp8266"
- "node-red", "automation flows"

## Home Automation Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                   HOME AUTOMATION LAYER (Phase 2)                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌───────────────────────────────────────────────────────────────┐    │
│   │                      DEVICE LAYER                              │    │
│   │   ┌─────────┐    ┌─────────────┐    ┌─────────────┐          │    │
│   │   │ Zigbee  │───▶│ Zigbee2MQTT │───▶│    MQTT     │          │    │
│   │   │ Devices │    │   (Bridge)  │    │ (Mosquitto) │          │    │
│   │   └─────────┘    └─────────────┘    └─────────────┘          │    │
│   │                                            │                  │    │
│   │   ┌─────────┐    ┌─────────────┐          │                  │    │
│   │   │  ESP32  │───▶│   ESPHome   │──────────┤                  │    │
│   │   │ Devices │    │   (Flash)   │          │                  │    │
│   │   └─────────┘    └─────────────┘          │                  │    │
│   └───────────────────────────────────────────┼───────────────────┘    │
│                                               │                        │
│   ┌───────────────────────────────────────────┼───────────────────┐    │
│   │                  CONTROL LAYER            ▼                   │    │
│   │   ┌─────────────────────────────────────────────┐            │    │
│   │   │              Home Assistant                  │            │    │
│   │   │         (Central Controller)                │            │    │
│   │   └─────────────────────────────────────────────┘            │    │
│   │                         │                                     │    │
│   │   ┌─────────────┐      │      ┌─────────────┐                │    │
│   │   │  Node-RED   │◀─────┴─────▶│   Ollama    │                │    │
│   │   │  (Flows)    │             │  (Intent)   │                │    │
│   │   └─────────────┘             └─────────────┘                │    │
│   └───────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Home Assistant

### Docker Compose

```yaml
services:
  homeassistant:
    image: ghcr.io/home-assistant/home-assistant:stable
    container_name: homeassistant
    privileged: true
    environment:
      TZ: America/Chicago
    volumes:
      - ./homeassistant/config:/config
      - /run/dbus:/run/dbus:ro
    network_mode: host  # For discovery
    restart: unless-stopped
    depends_on:
      - postgres
      - mosquitto
```

### Configuration Structure

```yaml
# homeassistant/config/configuration.yaml
homeassistant:
  name: Ahling Command Center
  latitude: !secret latitude
  longitude: !secret longitude
  elevation: !secret elevation
  unit_system: imperial
  time_zone: America/Chicago
  external_url: https://ha.ahling.local
  internal_url: http://homeassistant:8123

# Database
recorder:
  db_url: postgresql://ha_user:${HA_DB_PASSWORD}@postgres:5432/homeassistant
  commit_interval: 1
  exclude:
    domains:
      - automation
      - updater
    entity_globs:
      - sensor.weather_*

# MQTT
mqtt:
  broker: mosquitto
  port: 1883
  username: homeassistant
  password: !secret mqtt_password

# Includes
automation: !include automations.yaml
script: !include scripts.yaml
scene: !include scenes.yaml
sensor: !include sensors.yaml

# Wyoming Voice
wyoming:

# Ollama Conversation
conversation:
  - platform: ollama
    name: ahling
    url: http://ollama:11434
    model: ahling-home
    max_history: 10

# HTTP API
http:
  use_x_forwarded_for: true
  trusted_proxies:
    - 172.16.0.0/12
    - 10.0.0.0/8
```

### Secrets Management

```yaml
# homeassistant/config/secrets.yaml
# IMPORTANT: This file should be encrypted in Vault

latitude: "XX.XXXX"
longitude: "-XX.XXXX"
elevation: "XXX"

mqtt_password: "${MQTT_PASSWORD}"

# Long-lived access tokens (generate in HA UI)
ha_token: "eyJ0eXAiOi..."

# External service keys
openweathermap_api_key: "abc123..."
```

## Mosquitto MQTT Broker

### Docker Compose

```yaml
services:
  mosquitto:
    image: eclipse-mosquitto:2
    container_name: mosquitto
    ports:
      - "1883:1883"
      - "9001:9001"  # WebSocket
    volumes:
      - ./mosquitto/config:/mosquitto/config
      - ./mosquitto/data:/mosquitto/data
      - ./mosquitto/log:/mosquitto/log
    restart: unless-stopped
```

### Mosquitto Configuration

```conf
# mosquitto/config/mosquitto.conf
listener 1883
listener 9001
protocol websockets

persistence true
persistence_location /mosquitto/data/

log_dest file /mosquitto/log/mosquitto.log
log_type all

allow_anonymous false
password_file /mosquitto/config/passwd

# ACL for topic-level permissions
acl_file /mosquitto/config/acl

# Optional TLS
#listener 8883
#cafile /mosquitto/certs/ca.crt
#certfile /mosquitto/certs/server.crt
#keyfile /mosquitto/certs/server.key
```

### ACL Configuration

```conf
# mosquitto/config/acl

# Home Assistant - full access
user homeassistant
topic readwrite #

# Zigbee2MQTT
user zigbee2mqtt
topic readwrite zigbee2mqtt/#
topic read homeassistant/#

# Frigate
user frigate
topic readwrite frigate/#

# ESPHome devices
user esphome
topic readwrite esphome/#

# Read-only monitoring
user monitor
topic read #
```

### User Setup

```bash
# Create password file
docker exec mosquitto mosquitto_passwd -c /mosquitto/config/passwd homeassistant
docker exec mosquitto mosquitto_passwd -b /mosquitto/config/passwd zigbee2mqtt ${Z2M_MQTT_PASSWORD}
docker exec mosquitto mosquitto_passwd -b /mosquitto/config/passwd frigate ${FRIGATE_MQTT_PASSWORD}
docker exec mosquitto mosquitto_passwd -b /mosquitto/config/passwd esphome ${ESPHOME_MQTT_PASSWORD}
```

## Zigbee2MQTT

### Docker Compose

```yaml
services:
  zigbee2mqtt:
    image: koenkk/zigbee2mqtt:latest
    container_name: zigbee2mqtt
    volumes:
      - ./zigbee2mqtt/data:/app/data
      - /run/udev:/run/udev:ro
    ports:
      - "8080:8080"
    environment:
      TZ: America/Chicago
    devices:
      - /dev/ttyUSB0:/dev/ttyUSB0  # Zigbee coordinator
    depends_on:
      - mosquitto
    restart: unless-stopped
```

### Zigbee2MQTT Configuration

```yaml
# zigbee2mqtt/data/configuration.yaml
homeassistant: true
permit_join: false

mqtt:
  base_topic: zigbee2mqtt
  server: mqtt://mosquitto:1883
  user: zigbee2mqtt
  password: ${Z2M_MQTT_PASSWORD}

serial:
  port: /dev/ttyUSB0
  adapter: zstack  # or deconz, ezsp depending on coordinator

frontend:
  port: 8080
  host: 0.0.0.0

advanced:
  network_key: GENERATE  # Will auto-generate
  pan_id: GENERATE
  channel: 20
  log_level: info
  log_output:
    - console
    - file
  log_directory: /app/data/log

# Device-specific settings
devices:
  '0x00158d0001234567':
    friendly_name: 'living_room_motion'
    retain: false

# Groups
groups:
  '1':
    friendly_name: living_room_lights
    devices:
      - '0x00158d0001234568/1'
      - '0x00158d0001234569/1'
```

### Supported Coordinators

| Coordinator | Adapter Type | Notes |
|-------------|--------------|-------|
| Sonoff ZBDongle-P | zstack | CC2652P, recommended |
| Sonoff ZBDongle-E | ezsp | EFR32MG21 |
| ConBee II | deconz | deCONZ firmware |
| SLZB-06 | zstack | PoE, external antenna |

## ESPHome

### Docker Compose

```yaml
services:
  esphome:
    image: ghcr.io/esphome/esphome:latest
    container_name: esphome
    volumes:
      - ./esphome/config:/config
      - /etc/localtime:/etc/localtime:ro
    ports:
      - "6052:6052"
    environment:
      ESPHOME_DASHBOARD_USE_PING: true
    restart: unless-stopped
```

### Device Configuration Example

```yaml
# esphome/config/living_room_sensor.yaml
esphome:
  name: living-room-sensor
  friendly_name: Living Room Sensor

esp32:
  board: esp32dev
  framework:
    type: esp-idf

wifi:
  ssid: !secret wifi_ssid
  password: !secret wifi_password

  ap:
    ssid: "Living-Room-Sensor"
    password: !secret ap_password

captive_portal:

logger:

api:
  encryption:
    key: !secret api_key

ota:
  password: !secret ota_password

mqtt:
  broker: mosquitto
  username: esphome
  password: !secret mqtt_password

# Sensors
sensor:
  - platform: dht
    pin: GPIO4
    temperature:
      name: "Living Room Temperature"
      filters:
        - sliding_window_moving_average:
            window_size: 10
            send_every: 5
    humidity:
      name: "Living Room Humidity"
    update_interval: 60s

  - platform: adc
    pin: GPIO34
    name: "Living Room Light Level"
    update_interval: 10s

binary_sensor:
  - platform: gpio
    pin:
      number: GPIO5
      mode: INPUT_PULLUP
    name: "Living Room Motion"
    device_class: motion
    filters:
      - delayed_off: 30s

switch:
  - platform: gpio
    pin: GPIO23
    name: "Living Room Relay"
    id: relay1
```

## Node-RED

### Docker Compose

```yaml
services:
  nodered:
    image: nodered/node-red:latest
    container_name: nodered
    environment:
      TZ: America/Chicago
    ports:
      - "1880:1880"
    volumes:
      - nodered_data:/data
    depends_on:
      - mosquitto
      - homeassistant
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.nodered.rule=Host(`nodered.ahling.local`)"
```

### Recommended Palettes

```bash
# Install via Node-RED UI or CLI
npm install \
  node-red-contrib-home-assistant-websocket \
  node-red-contrib-mqtt-broker \
  node-red-contrib-ollama \
  node-red-contrib-cron-plus \
  node-red-contrib-dashboard \
  node-red-contrib-influxdb
```

### Example Flow: Voice-Activated Automation

```json
[
  {
    "id": "mqtt_voice",
    "type": "mqtt in",
    "topic": "voice/commands",
    "broker": "mosquitto"
  },
  {
    "id": "ollama_intent",
    "type": "ollama",
    "model": "ahling-home",
    "system": "Extract home automation intent from voice command"
  },
  {
    "id": "ha_service",
    "type": "api-call-service",
    "server": "homeassistant",
    "domain": "{{ msg.intent.domain }}",
    "service": "{{ msg.intent.service }}"
  }
]
```

## Integration Patterns

### MQTT Topics Structure

```
# Device state
zigbee2mqtt/living_room_motion
esphome/living_room_sensor/sensor/temperature/state
frigate/events

# Commands
zigbee2mqtt/living_room_light/set
homeassistant/switch/relay1/set

# Discovery (Home Assistant)
homeassistant/sensor/living_room_temp/config
homeassistant/binary_sensor/motion/config
```

### Home Assistant Automations

```yaml
# homeassistant/config/automations.yaml
- id: motion_lights
  alias: "Motion Activated Lights"
  trigger:
    - platform: mqtt
      topic: "zigbee2mqtt/living_room_motion"
      payload: '{"occupancy": true}'
  condition:
    - condition: sun
      after: sunset
  action:
    - service: light.turn_on
      target:
        entity_id: light.living_room
      data:
        brightness_pct: "{{ 30 if now().hour > 22 else 100 }}"

- id: voice_control
  alias: "Voice Control via Ollama"
  trigger:
    - platform: mqtt
      topic: "voice/transcription"
  action:
    - service: conversation.process
      data:
        agent_id: conversation.ahling
        text: "{{ trigger.payload }}"
```

## Resource Allocation

### Memory Budget (61GB)

| Component | RAM |
|-----------|-----|
| Home Assistant | 2GB |
| Mosquitto | 256MB |
| Zigbee2MQTT | 256MB |
| ESPHome | 512MB |
| Node-RED | 512MB |
| **Total** | **~3.5GB** |

## Best Practices

1. **MQTT**: Use QoS 1 for important messages, QoS 0 for sensors
2. **Zigbee2MQTT**: Keep firmware updated, use external coordinator
3. **ESPHome**: Use secrets.yaml for credentials
4. **Node-RED**: Version control flows with git
5. **Home Assistant**: Use packages for organization

## Troubleshooting

```bash
# Check MQTT connectivity
mosquitto_sub -h mosquitto -u monitor -P ${MONITOR_PASSWORD} -t '#' -v

# Zigbee2MQTT logs
docker logs -f zigbee2mqtt

# Home Assistant logs
docker logs -f homeassistant | grep -E "(ERROR|WARNING)"

# ESPHome device logs
docker exec esphome esphome logs living_room_sensor.yaml
```

## Related Skills

- [[home-assistant-brain]] - Deep HA API integration
- [[perception-pipeline]] - Frigate, Wyoming integration
- [[ollama-mastery]] - Voice intent processing

## References

- [Home Assistant Documentation](https://www.home-assistant.io/docs/)
- [Mosquitto Documentation](https://mosquitto.org/documentation/)
- [Zigbee2MQTT Documentation](https://www.zigbee2mqtt.io/guide/)
- [ESPHome Documentation](https://esphome.io/)
- [Node-RED Documentation](https://nodered.org/docs/)

---
description: Control Home Assistant entities, automations, and voice assistant integration
argument-hint: "<operation> [entity-id] [--value VALUE]"
allowed-tools: ["Bash", "Read"]
---

Manage Home Assistant including entities, automations, voice pipeline, scenes, scripts, and integration with Ollama for local AI assistance.

## Your Task

You are controlling Home Assistant from the command line. Manage entities, create/trigger automations, configure voice pipeline, and integrate with ACC's AI services.

## Arguments

- `operation` (required): Operation (list, get, set, automation, voice, scene, script, integrate)
- `entity-id` (optional): Entity ID (e.g., light.living_room, sensor.temperature)
- `--value` (optional): Value to set
- `--service` (optional): Service to call
- `--data` (optional): Service data (JSON format)

## Steps to Execute

### 1. Check Home Assistant Connectivity

```bash
check_ha() {
  echo "=== Checking Home Assistant ==="

  # Container running?
  docker ps --format '{{.Names}}' | grep -q "^acc-home-assistant$" || {
    echo "❌ Home Assistant container not running"
    exit 1
  }

  echo "✅ Home Assistant container running"

  # API available?
  HA_URL=${HA_URL:-http://localhost:8123}
  curl -s -H "Authorization: Bearer ${HA_TOKEN}" \
    "$HA_URL/api/" > /dev/null || {
    echo "❌ Home Assistant API not responding"
    echo "Check HA_URL and HA_TOKEN in .env"
    exit 1
  }

  echo "✅ Home Assistant API available"

  # Get HA version
  VERSION=$(curl -s -H "Authorization: Bearer ${HA_TOKEN}" \
    "$HA_URL/api/config" | jq -r '.version')

  echo "Version: $VERSION"
}
```

### 2. List Entities

```bash
list_entities() {
  DOMAIN=$1  # Optional: light, switch, sensor, etc.

  echo "=== Home Assistant Entities ==="
  echo ""

  ENTITIES=$(curl -s -H "Authorization: Bearer ${HA_TOKEN}" \
    "$HA_URL/api/states")

  if [ -n "$DOMAIN" ]; then
    ENTITIES=$(echo "$ENTITIES" | jq "[.[] | select(.entity_id | startswith(\"$DOMAIN.\"))]")
  fi

  # Table header
  printf "%-40s %-15s %-30s\n" "ENTITY_ID" "STATE" "FRIENDLY_NAME"
  printf "%.s=" {1..90}
  echo ""

  echo "$ENTITIES" | jq -r '.[] |
    "\(.entity_id)\t\(.state)\t\(.attributes.friendly_name // "")"' | \
  while IFS=$'\t' read -r entity state name; do
    printf "%-40s %-15s %-30s\n" "$entity" "$state" "$name"
  done

  echo ""
  TOTAL=$(echo "$ENTITIES" | jq '. | length')
  echo "Total entities: $TOTAL"
}
```

### 3. Get Entity State

```bash
get_entity() {
  ENTITY_ID=$1

  echo "=== Entity: $ENTITY_ID ==="
  echo ""

  STATE=$(curl -s -H "Authorization: Bearer ${HA_TOKEN}" \
    "$HA_URL/api/states/$ENTITY_ID")

  # Check if entity exists
  ERROR=$(echo "$STATE" | jq -r '.message // ""')
  if [ -n "$ERROR" ]; then
    echo "❌ Error: $ERROR"
    exit 1
  fi

  # Display state
  echo "$STATE" | jq -r '
    "State: \(.state)",
    "Friendly Name: \(.attributes.friendly_name // "N/A")",
    "Last Changed: \(.last_changed)",
    "Last Updated: \(.last_updated)",
    "",
    "Attributes:",
    (.attributes | to_entries[] | "  \(.key): \(.value)")
  '
}
```

### 4. Set Entity State (Call Service)

```bash
set_entity() {
  ENTITY_ID=$1
  VALUE=$2

  echo "=== Setting $ENTITY_ID to $VALUE ==="

  # Determine domain and service
  DOMAIN=$(echo "$ENTITY_ID" | cut -d'.' -f1)

  case $DOMAIN in
    "light")
      if [ "$VALUE" = "on" ] || [ "$VALUE" = "off" ]; then
        SERVICE="turn_$VALUE"
        DATA="{\"entity_id\": \"$ENTITY_ID\"}"
      else
        # Brightness value (0-255)
        SERVICE="turn_on"
        DATA="{\"entity_id\": \"$ENTITY_ID\", \"brightness\": $VALUE}"
      fi
      ;;

    "switch"|"input_boolean")
      SERVICE="turn_$VALUE"
      DATA="{\"entity_id\": \"$ENTITY_ID\"}"
      ;;

    "climate")
      SERVICE="set_temperature"
      DATA="{\"entity_id\": \"$ENTITY_ID\", \"temperature\": $VALUE}"
      ;;

    "input_number"|"number")
      SERVICE="set_value"
      DATA="{\"entity_id\": \"$ENTITY_ID\", \"value\": $VALUE}"
      ;;

    *)
      echo "❌ Unsupported domain: $DOMAIN"
      exit 1
      ;;
  esac

  # Call service
  RESULT=$(curl -s -X POST \
    -H "Authorization: Bearer ${HA_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$DATA" \
    "$HA_URL/api/services/$DOMAIN/$SERVICE")

  echo "✅ Service called: $DOMAIN.$SERVICE"
  echo "$RESULT" | jq '.[].entity_id' 2>/dev/null || echo "$RESULT"
}
```

### 5. List Automations

```bash
list_automations() {
  echo "=== Home Assistant Automations ==="
  echo ""

  AUTOMATIONS=$(curl -s -H "Authorization: Bearer ${HA_TOKEN}" \
    "$HA_URL/api/states" | jq '[.[] | select(.entity_id | startswith("automation."))]')

  # Table header
  printf "%-50s %-10s %-20s\n" "AUTOMATION" "STATE" "LAST TRIGGERED"
  printf "%.s=" {1..85}
  echo ""

  echo "$AUTOMATIONS" | jq -r '.[] |
    "\(.attributes.friendly_name // .entity_id)\t\(.state)\t\(.attributes.last_triggered // "Never")"' | \
  while IFS=$'\t' read -r name state triggered; do
    printf "%-50s %-10s %-20s\n" "$name" "$state" "$triggered"
  done

  echo ""
  TOTAL=$(echo "$AUTOMATIONS" | jq '. | length')
  echo "Total automations: $TOTAL"
}
```

### 6. Trigger Automation

```bash
trigger_automation() {
  AUTOMATION=$1

  echo "=== Triggering Automation: $AUTOMATION ==="

  RESULT=$(curl -s -X POST \
    -H "Authorization: Bearer ${HA_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"entity_id\": \"$AUTOMATION\"}" \
    "$HA_URL/api/services/automation/trigger")

  echo "✅ Automation triggered"
}
```

### 7. Configure Voice Pipeline (Wyoming Protocol)

```bash
configure_voice() {
  echo "=== Configuring Voice Pipeline ==="
  echo ""

  # Check Wyoming components
  echo "Checking Wyoming components..."

  # Whisper (STT)
  curl -s http://whisper.ahling.local:10300/info > /dev/null && {
    echo "✅ Whisper (STT): Available"
  } || {
    echo "❌ Whisper (STT): Not available"
  }

  # Piper (TTS)
  curl -s http://piper.ahling.local:10200/info > /dev/null && {
    echo "✅ Piper (TTS): Available"
  } || {
    echo "❌ Piper (TTS): Not available"
  }

  # Create voice pipeline automation
  echo ""
  echo "Creating voice pipeline automation..."

  AUTOMATION_CONFIG=$(cat <<EOF
{
  "alias": "Voice Assistant with Ollama",
  "description": "Process voice commands using Whisper, Ollama, and Piper",
  "trigger": [
    {
      "platform": "event",
      "event_type": "voice_command"
    }
  ],
  "action": [
    {
      "service": "conversation.process",
      "data": {
        "text": "{{ trigger.event.data.text }}",
        "agent_id": "ollama_agent"
      }
    },
    {
      "service": "tts.speak",
      "data": {
        "entity_id": "tts.piper",
        "message": "{{ states.conversation.last_conversation.attributes.response }}"
      }
    }
  ]
}
EOF
)

  # Note: This is a simplified example. Actual implementation requires proper HA configuration.
  echo "Voice pipeline automation template created"
  echo "Add to configuration.yaml for full setup"
}
```

### 8. Integrate with Ollama

```bash
integrate_ollama() {
  echo "=== Integrating Ollama with Home Assistant ==="
  echo ""

  # Check Ollama connectivity
  curl -s http://ollama.ahling.local:11434/api/tags > /dev/null || {
    echo "❌ Ollama not accessible from HA"
    exit 1
  }

  echo "✅ Ollama accessible"

  # Configuration snippet for Home Assistant
  cat <<EOF
Add to Home Assistant configuration.yaml:

conversation:
  intents:
    HomeAssistant:
      - "Turn on the {name}"
      - "Turn off the {name}"
      - "Set {name} to {value}"

# Ollama Integration (custom component needed)
ollama:
  base_url: http://ollama.ahling.local:11434
  model: llama2
  timeout: 30

# Conversation agent using Ollama
conversation_agent:
  - platform: ollama
    name: Ollama Agent
    model: llama2
    system_prompt: |
      You are a home automation assistant. You can control lights, switches,
      climate, and other devices. Be concise and helpful.

# Voice pipeline
assist_pipeline:
  - name: "Ollama Voice Assistant"
    conversation_engine: ollama_agent
    stt_engine: wyoming_whisper
    tts_engine: piper
    language: en-US

EOF

  echo "✅ Configuration template generated"
}
```

### 9. Create Scene

```bash
create_scene() {
  SCENE_NAME=$1

  echo "=== Creating Scene: $SCENE_NAME ==="

  # Get current state of all lights
  ENTITIES=$(curl -s -H "Authorization: Bearer ${HA_TOKEN}" \
    "$HA_URL/api/states" | jq '[.[] | select(.entity_id | startswith("light."))]')

  SCENE_DATA=$(cat <<EOF
{
  "scene_id": "$(echo $SCENE_NAME | tr ' ' '_' | tr '[:upper:]' '[:lower:]')",
  "name": "$SCENE_NAME",
  "entities": $(echo "$ENTITIES" | jq '[.[] | {(.entity_id): {state: .state, brightness: .attributes.brightness}}] | add')
}
EOF
)

  echo "Scene captured with current state"
  echo "$SCENE_DATA" | jq .

  # To apply: POST to /api/services/scene/create with this data
}
```

### 10. Monitor Events

```bash
monitor_events() {
  EVENT_TYPE=${1:-all}

  echo "=== Monitoring Home Assistant Events ==="
  echo "Event Type: $EVENT_TYPE"
  echo "Press Ctrl+C to stop"
  echo "================================"
  echo ""

  # Stream events
  curl -N -H "Authorization: Bearer ${HA_TOKEN}" \
    "$HA_URL/api/stream" 2>/dev/null | \
  while IFS= read -r line; do
    # Skip empty lines and "event:" lines
    [ -z "$line" ] && continue
    [[ "$line" =~ ^event: ]] && continue

    # Parse data
    if [[ "$line" =~ ^data: ]]; then
      EVENT=$(echo "$line" | sed 's/^data: //')

      # Filter by event type if specified
      if [ "$EVENT_TYPE" != "all" ]; then
        echo "$EVENT" | jq -e ".event_type == \"$EVENT_TYPE\"" > /dev/null 2>&1 || continue
      fi

      # Display event
      echo "$EVENT" | jq -r '
        "\(.time_fired) [\(.event_type)]",
        (.data | to_entries[] | "  \(.key): \(.value)"),
        ""
      '
    fi
  done
}
```

## Usage Examples

### List all entities
```
/acc:ha list
```

### List only lights
```
/acc:ha list light
```

### Get entity state
```
/acc:ha get light.living_room
```

### Turn on light
```
/acc:ha set light.living_room on
```

### Set brightness
```
/acc:ha set light.living_room 128
```

### List automations
```
/acc:ha automation
```

### Trigger automation
```
/acc:ha automation trigger automation.morning_routine
```

### Configure voice pipeline
```
/acc:ha voice
```

### Integrate with Ollama
```
/acc:ha integrate ollama
```

### Monitor events
```
/acc:ha monitor state_changed
```

## Expected Outputs

### List Entities
```
=== Home Assistant Entities ===

ENTITY_ID                                STATE           FRIENDLY_NAME
==========================================================================================
light.living_room                        on              Living Room Light
light.bedroom                            off             Bedroom Light
sensor.temperature                       22.5            Temperature Sensor
switch.porch_light                       on              Porch Light
climate.thermostat                       heat            Thermostat

Total entities: 45
```

### Get Entity
```
=== Entity: light.living_room ===

State: on
Friendly Name: Living Room Light
Last Changed: 2025-12-13T10:30:15.123456+00:00
Last Updated: 2025-12-13T10:30:15.123456+00:00

Attributes:
  brightness: 128
  color_mode: brightness
  supported_color_modes: ["brightness"]
  friendly_name: Living Room Light
```

### Automations
```
=== Home Assistant Automations ===

AUTOMATION                                          STATE      LAST TRIGGERED
=====================================================================================
Morning Routine                                     on         2025-12-13 06:00:00
Turn Off Lights at Night                           on         2025-12-12 23:00:00
Motion Detected in Hallway                         on         2025-12-13 09:15:30
Temperature Alert                                   on         Never

Total automations: 12
```

## Success Criteria

- Home Assistant API is accessible
- Entities can be listed and queried
- Services can be called successfully
- Automations can be triggered
- Voice pipeline components available
- Ollama integration configured
- Events can be monitored
- No authentication errors

## Notes

- Requires HA_TOKEN in .env (long-lived access token)
- Create token in HA: Profile → Security → Long-Lived Access Tokens
- Voice pipeline requires Wyoming protocol components (Whisper, Piper)
- Ollama integration may require custom HA component
- Some operations require HA restart to take effect
- Monitor events for debugging automations
- Use scenes for multi-device state management
- Test voice pipeline components individually first
- Domain determines which services are available
- State changes may take a few seconds to propagate

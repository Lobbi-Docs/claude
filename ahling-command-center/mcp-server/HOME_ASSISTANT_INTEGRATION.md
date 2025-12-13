# Home Assistant MCP Integration

This document describes the Home Assistant tools module for the Ahling Command Center MCP server.

## Overview

The Home Assistant integration provides comprehensive control over your smart home through the Model Context Protocol. It includes REST API and WebSocket support, with Wyoming voice pipeline integration.

## Architecture

### Files Created

```
mcp-server/src/
├── clients/
│   ├── homeassistant.client.ts          # Main HA client with REST + WebSocket
│   ├── types/
│   │   └── homeassistant.types.ts       # TypeScript type definitions
│   └── index.ts                          # Client exports
├── tools/
│   ├── homeassistant/
│   │   └── index.ts                     # Tool registration and handlers
│   └── index.ts                          # Tool exports
```

## Features

### Home Assistant Client (`homeassistant.client.ts`)

The `HomeAssistantClient` class provides:

#### REST API Methods
- **getState(entityId)** - Get current state and attributes of an entity
- **setState(entityId, options)** - Set state and attributes
- **callService(options)** - Call any HA service
- **listEntities(options)** - List and filter entities by domain, area, state, etc.
- **getServices()** - Get all available services with definitions
- **getEntityRegistry()** - Get entity registry with area/device mappings
- **getAreas()** - Get all defined areas
- **getDevices()** - Get all registered devices
- **createAutomation(automation)** - Create or update automations
- **getAutomations()** - Get all automations
- **voicePipeline(audioData, options)** - Wyoming voice processing (STT + TTS)
- **healthCheck()** - Check REST API and WebSocket status

#### WebSocket Methods
- **connectWebSocket()** - Establish WebSocket connection with authentication
- **subscribeEvents(options)** - Subscribe to HA events with filters
- **disconnectWebSocket()** - Clean disconnect with subscription cleanup

#### WebSocket Features
- Automatic authentication flow
- Automatic reconnection with exponential backoff
- Heartbeat/ping for connection health
- Event filtering by entity_id
- Subscription management

### MCP Tools (`tools/homeassistant/index.ts`)

11 tools are exposed through MCP:

1. **ha_get_state** - Get entity state
2. **ha_set_state** - Set entity state
3. **ha_call_service** - Call any HA service
4. **ha_list_entities** - List/filter entities
5. **ha_subscribe_events** - Subscribe to events with auto-cleanup
6. **ha_create_automation** - Create automations
7. **ha_voice_pipeline** - Process voice input (STT + Conversation + TTS)
8. **ha_health_check** - Check connection health
9. **ha_get_services** - List all available services
10. **ha_get_areas** - Get all areas
11. **ha_get_devices** - Get all devices

## Configuration

### Environment Variables

```bash
# Required
HA_URL=http://homeassistant.local:8123
HA_TOKEN=your_long_lived_access_token

# Optional WebSocket Configuration
HA_WS_RECONNECT_INTERVAL=5000          # ms between reconnection attempts
HA_WS_HEARTBEAT_INTERVAL=30000         # ms between heartbeats
HA_WS_MAX_RECONNECT_ATTEMPTS=10        # max reconnection attempts
```

### Getting a Long-Lived Access Token

1. Open Home Assistant
2. Go to your profile (click your name in the sidebar)
3. Scroll to "Long-Lived Access Tokens"
4. Click "Create Token"
5. Give it a name (e.g., "Claude MCP Server")
6. Copy the token and set it as `HA_TOKEN`

## Integration into index.ts

To integrate the Home Assistant tools into the main MCP server, add the following:

### Step 1: Import the Client and Tools

```typescript
import { HomeAssistantClient } from './clients/homeassistant.client.js';
import { HomeAssistantTools } from './tools/homeassistant/index.js';
```

### Step 2: Add to Global State

```typescript
let haClient: HomeAssistantClient;
let haTools: HomeAssistantTools;
```

### Step 3: Initialize in initializeClients()

```typescript
async function initializeClients(): Promise<void> {
  // ... existing code ...

  // Initialize Home Assistant client and tools
  haTools = new HomeAssistantTools({
    url: config.homeAssistant.url,
    token: config.homeAssistant.token,
    websocket: {
      reconnectInterval: 5000,
      heartbeatInterval: 30000,
      maxReconnectAttempts: 10,
    },
  });

  const haHealth = await haTools.client.healthCheck();
  console.error(`✓ Home Assistant client initialized (${haHealth.status})`);
}
```

### Step 4: Add Tools to getTools()

```typescript
function getTools() {
  return [
    ...dockerTools,
    ...OLLAMA_TOOLS,
    ...haTools.getTools(), // Add Home Assistant tools
    // ... other tools ...
  ];
}
```

### Step 5: Handle Tool Calls in handleToolCall()

```typescript
async function handleToolCall(name: string, args: Record<string, unknown>): Promise<unknown> {
  // ... existing handlers ...

  // Home Assistant tools
  if (name.startsWith('ha_')) {
    return haTools.executeTool(name, args);
  }

  // ... rest of handlers ...
}
```

### Step 6: Add Cleanup in cleanupClients()

```typescript
async function cleanupClients(): Promise<void> {
  // ... existing cleanup ...

  await haTools?.cleanup();
}
```

## Usage Examples

### Example 1: Get Light State

```json
{
  "tool": "ha_get_state",
  "arguments": {
    "entity_id": "light.living_room"
  }
}
```

Response:
```json
{
  "entity_id": "light.living_room",
  "state": "on",
  "attributes": {
    "brightness": 255,
    "color_mode": "rgb",
    "rgb_color": [255, 255, 255],
    "friendly_name": "Living Room Light"
  },
  "last_changed": "2025-12-13T10:30:00.000Z",
  "last_updated": "2025-12-13T10:30:00.000Z"
}
```

### Example 2: Turn On Light with Color

```json
{
  "tool": "ha_call_service",
  "arguments": {
    "domain": "light",
    "service": "turn_on",
    "target": {
      "entity_id": "light.living_room"
    },
    "data": {
      "brightness": 200,
      "rgb_color": [255, 120, 0]
    }
  }
}
```

### Example 3: List All Lights in Kitchen

```json
{
  "tool": "ha_list_entities",
  "arguments": {
    "domain": "light",
    "area": "kitchen"
  }
}
```

### Example 4: Subscribe to State Changes

```json
{
  "tool": "ha_subscribe_events",
  "arguments": {
    "event_type": "state_changed",
    "entity_id": "binary_sensor.front_door",
    "duration": 300
  }
}
```

This will monitor the front door sensor for 5 minutes.

### Example 5: Create Motion Light Automation

```json
{
  "tool": "ha_create_automation",
  "arguments": {
    "alias": "Motion Light - Hallway",
    "description": "Turn on hallway light when motion detected",
    "mode": "single",
    "trigger": [
      {
        "platform": "state",
        "entity_id": "binary_sensor.hallway_motion",
        "to": "on"
      }
    ],
    "action": [
      {
        "service": "light.turn_on",
        "target": {
          "entity_id": "light.hallway"
        },
        "data": {
          "brightness": 255
        }
      },
      {
        "delay": {
          "minutes": 5
        }
      },
      {
        "service": "light.turn_off",
        "target": {
          "entity_id": "light.hallway"
        }
      }
    ]
  }
}
```

### Example 6: Voice Pipeline (Text to Speech)

```json
{
  "tool": "ha_voice_pipeline",
  "arguments": {
    "input": "Turn on the living room lights",
    "input_type": "text",
    "language": "en-US"
  }
}
```

### Example 7: Health Check

```json
{
  "tool": "ha_health_check",
  "arguments": {}
}
```

Response:
```json
{
  "status": "healthy",
  "rest_api": true,
  "websocket": true,
  "ha_version": "2024.12.1",
  "latency_ms": 45
}
```

## WebSocket Event Types

Common event types for `ha_subscribe_events`:

- **state_changed** - Entity state changes
- **call_service** - Service calls
- **automation_triggered** - Automation runs
- **device_registry_updated** - Device changes
- **area_registry_updated** - Area changes
- **entity_registry_updated** - Entity registration changes
- **persistent_notifications_updated** - Notifications
- **service_registered** - New service available
- **service_removed** - Service removed

## Wyoming Voice Pipeline

The Wyoming protocol integration supports:

### Speech-to-Text (STT)
```json
{
  "input": "<base64_encoded_wav_audio>",
  "input_type": "audio",
  "language": "en-US"
}
```

### Text-to-Speech (TTS)
```json
{
  "input": "Hello, this is a test",
  "input_type": "text",
  "language": "en-US"
}
```

### Conversation + Intent Processing
The voice pipeline automatically:
1. Converts speech to text (if audio input)
2. Processes through HA conversation agent
3. Executes intents
4. Returns conversation response
5. Generates TTS audio (optional)

## Error Handling

All methods return a `ClientResponse<T>` type:

```typescript
interface ClientResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
```

Tools automatically handle errors and return MCP-formatted error responses:

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"error\": \"Entity not found\", \"code\": \"404\"}"
    }
  ],
  "isError": true
}
```

## Type Safety

Full TypeScript type definitions are provided in `homeassistant.types.ts`:

- **EntityState** - Entity state structure
- **ServiceCallOptions** - Service call parameters
- **Automation** - Automation configuration
- **WebSocketMessage** - WebSocket message types
- **EventSubscription** - Event subscription handle
- **VoicePipelineResult** - Voice pipeline response
- And many more...

## Testing

### Manual Testing with curl

```bash
# Get state
curl -H "Authorization: Bearer $HA_TOKEN" \
  http://homeassistant.local:8123/api/states/light.living_room

# Call service
curl -X POST \
  -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "light.living_room"}' \
  http://homeassistant.local:8123/api/services/light/turn_on
```

### WebSocket Testing

Use the MCP inspector or test the WebSocket connection directly:

```typescript
const client = new HomeAssistantClient(config);
await client.connectWebSocket();

const subscription = await client.subscribeEvents({
  eventType: 'state_changed',
  entityId: 'light.living_room',
  callback: (event) => {
    console.log('State changed:', event);
  },
});

// Later...
await subscription.unsubscribe();
```

## Security Considerations

1. **Token Storage**: Never commit HA_TOKEN to version control
2. **SSL/TLS**: Use HTTPS in production (set HA_URL to https://...)
3. **Token Scoping**: Create separate tokens for different applications
4. **Network Security**: Ensure MCP server runs in trusted network
5. **WebSocket Auth**: Token is sent during WebSocket handshake

## Troubleshooting

### Connection Issues

1. Check HA_URL is accessible from MCP server
2. Verify HA_TOKEN is valid and not expired
3. Check firewall allows port 8123 (or your custom port)
4. Look for errors in Home Assistant logs

### WebSocket Reconnection

If WebSocket frequently reconnects:
- Increase `HA_WS_RECONNECT_INTERVAL`
- Check network stability
- Verify no firewall is dropping long-lived connections

### Event Subscription Not Working

1. Verify event type name is correct
2. Check entity_id exists and is spelled correctly
3. Ensure WebSocket is connected (check health_check)
4. Review Home Assistant event logs

## Future Enhancements

Potential additions:

- [ ] Streaming event responses to Claude
- [ ] Batch operations for multiple entities
- [ ] Template rendering support
- [ ] Scene and script support
- [ ] Lovelace dashboard integration
- [ ] Add-on management
- [ ] Backup/restore operations
- [ ] Integration configuration

## References

- [Home Assistant REST API](https://developers.home-assistant.io/docs/api/rest)
- [Home Assistant WebSocket API](https://developers.home-assistant.io/docs/api/websocket)
- [Wyoming Protocol](https://www.home-assistant.io/integrations/wyoming/)
- [Model Context Protocol](https://modelcontextprotocol.io/)

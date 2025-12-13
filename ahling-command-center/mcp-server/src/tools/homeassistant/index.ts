/**
 * Home Assistant MCP Tools
 * Exposes Home Assistant functionality through MCP tool interface
 */

import { z } from 'zod';
import { HomeAssistantClient } from '../../clients/homeassistant.client.js';
import type {
  HomeAssistantConfig,
  ServiceCallOptions,
  ListEntitiesOptions,
  Automation,
  Trigger,
  Condition,
  Action,
  SubscribeEventsOptions,
  SetStateOptions,
  VoicePipelineOptions,
} from '../../clients/types/homeassistant.types.js';

// ============================================================================
// Tool Input Schemas
// ============================================================================

const GetStateSchema = z.object({
  entity_id: z.string().describe('Entity ID (e.g., light.living_room)'),
});

const SetStateSchema = z.object({
  entity_id: z.string().describe('Entity ID to update'),
  state: z.string().describe('New state value'),
  attributes: z
    .record(z.any())
    .optional()
    .describe('Optional state attributes'),
  force_update: z
    .boolean()
    .optional()
    .describe('Force update even if state unchanged'),
});

const CallServiceSchema = z.object({
  domain: z.string().describe('Service domain (e.g., light, switch)'),
  service: z.string().describe('Service name (e.g., turn_on, turn_off)'),
  target: z
    .object({
      entity_id: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe('Target entity ID(s)'),
      device_id: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe('Target device ID(s)'),
      area_id: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe('Target area ID(s)'),
    })
    .optional()
    .describe('Service target'),
  data: z
    .record(z.any())
    .optional()
    .describe('Service data/parameters'),
  return_response: z
    .boolean()
    .optional()
    .describe('Return service response'),
});

const ListEntitiesSchema = z.object({
  domain: z.string().optional().describe('Filter by domain (e.g., light)'),
  area: z.string().optional().describe('Filter by area ID'),
  device_class: z
    .string()
    .optional()
    .describe('Filter by device class'),
  state: z.string().optional().describe('Filter by state value'),
  attributes: z
    .record(z.any())
    .optional()
    .describe('Filter by attributes'),
});

const SubscribeEventsSchema = z.object({
  event_type: z
    .string()
    .describe('Event type to subscribe to (e.g., state_changed)'),
  entity_id: z
    .string()
    .optional()
    .describe('Filter events for specific entity'),
  duration: z
    .number()
    .optional()
    .default(60)
    .describe('Duration to listen in seconds (default: 60)'),
});

const CreateAutomationSchema = z.object({
  alias: z.string().describe('Automation name'),
  description: z.string().optional().describe('Automation description'),
  mode: z
    .enum(['single', 'restart', 'queued', 'parallel'])
    .optional()
    .describe('Automation mode'),
  trigger: z
    .array(z.record(z.any()))
    .describe('Automation triggers'),
  condition: z
    .array(z.record(z.any()))
    .optional()
    .describe('Automation conditions'),
  action: z
    .array(z.record(z.any()))
    .describe('Automation actions'),
});

const VoicePipelineSchema = z.object({
  input: z
    .string()
    .describe('Text input for TTS or base64 encoded audio for STT'),
  input_type: z
    .enum(['text', 'audio'])
    .describe('Type of input: text or audio'),
  language: z.string().optional().describe('Language code (e.g., en-US)'),
  conversation_id: z
    .string()
    .optional()
    .describe('Conversation ID for context'),
  timeout: z
    .number()
    .optional()
    .describe('Processing timeout in milliseconds'),
});

// ============================================================================
// Home Assistant Tools Class
// ============================================================================

export class HomeAssistantTools {
  private client: HomeAssistantClient;
  private activeSubscriptions = new Map<string, any>();

  constructor(config: HomeAssistantConfig) {
    this.client = new HomeAssistantClient(config);
  }

  /**
   * Register all Home Assistant tools with MCP server
   */
  getTools() {
    return [
      {
        name: 'ha_get_state',
        description:
          'Get the current state and attributes of a Home Assistant entity',
        inputSchema: GetStateSchema,
      },
      {
        name: 'ha_set_state',
        description:
          'Set the state and attributes of a Home Assistant entity',
        inputSchema: SetStateSchema,
      },
      {
        name: 'ha_call_service',
        description:
          'Call a Home Assistant service (turn on/off devices, run automations, etc.)',
        inputSchema: CallServiceSchema,
      },
      {
        name: 'ha_list_entities',
        description:
          'List all entities or filter by domain, area, state, or attributes',
        inputSchema: ListEntitiesSchema,
      },
      {
        name: 'ha_subscribe_events',
        description:
          'Subscribe to Home Assistant events for a specified duration',
        inputSchema: SubscribeEventsSchema,
      },
      {
        name: 'ha_create_automation',
        description:
          'Create or update a Home Assistant automation',
        inputSchema: CreateAutomationSchema,
      },
      {
        name: 'ha_voice_pipeline',
        description:
          'Process voice input through Wyoming pipeline (STT + Conversation + TTS)',
        inputSchema: VoicePipelineSchema,
      },
      {
        name: 'ha_health_check',
        description:
          'Check the health status of Home Assistant REST API and WebSocket connection',
        inputSchema: z.object({}),
      },
      {
        name: 'ha_get_services',
        description:
          'Get all available Home Assistant services with their definitions',
        inputSchema: z.object({}),
      },
      {
        name: 'ha_get_areas',
        description:
          'Get all areas defined in Home Assistant',
        inputSchema: z.object({}),
      },
      {
        name: 'ha_get_devices',
        description:
          'Get all devices registered in Home Assistant',
        inputSchema: z.object({}),
      },
    ];
  }

  /**
   * Handle tool execution
   */
  async executeTool(name: string, args: any): Promise<any> {
    switch (name) {
      case 'ha_get_state':
        return this.getState(args);
      case 'ha_set_state':
        return this.setState(args);
      case 'ha_call_service':
        return this.callService(args);
      case 'ha_list_entities':
        return this.listEntities(args);
      case 'ha_subscribe_events':
        return this.subscribeEvents(args);
      case 'ha_create_automation':
        return this.createAutomation(args);
      case 'ha_voice_pipeline':
        return this.voicePipeline(args);
      case 'ha_health_check':
        return this.healthCheck();
      case 'ha_get_services':
        return this.getServices();
      case 'ha_get_areas':
        return this.getAreas();
      case 'ha_get_devices':
        return this.getDevices();
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  // ============================================================================
  // Tool Implementation Methods
  // ============================================================================

  private async getState(args: z.infer<typeof GetStateSchema>) {
    const result = await this.client.getState(args.entity_id);

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: result.error?.message,
                code: result.error?.code,
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result.data, null, 2),
        },
      ],
    };
  }

  private async setState(args: z.infer<typeof SetStateSchema>) {
    const options: SetStateOptions = {
      state: args.state,
    };
    if (args.attributes !== undefined) {
      options.attributes = args.attributes;
    }
    if (args.force_update !== undefined) {
      options.force_update = args.force_update;
    }
    const result = await this.client.setState(args.entity_id, options);

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: result.error?.message,
                code: result.error?.code,
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result.data, null, 2),
        },
      ],
    };
  }

  private async callService(args: z.infer<typeof CallServiceSchema>) {
    const options: ServiceCallOptions = {
      domain: args.domain,
      service: args.service,
    };
    if (args.target !== undefined) {
      options.target = args.target;
    }
    if (args.data !== undefined) {
      options.data = args.data;
    }
    if (args.return_response !== undefined) {
      options.return_response = args.return_response;
    }

    const result = await this.client.callService(options);

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: result.error?.message,
                code: result.error?.code,
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              service: `${args.domain}.${args.service}`,
              target: args.target,
              response: result.data,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async listEntities(args: z.infer<typeof ListEntitiesSchema>) {
    const options: ListEntitiesOptions = {};
    if (args.domain !== undefined) {
      options.domain = args.domain;
    }
    if (args.area !== undefined) {
      options.area = args.area;
    }
    if (args.device_class !== undefined) {
      options.device_class = args.device_class;
    }
    if (args.state !== undefined) {
      options.state = args.state;
    }
    if (args.attributes !== undefined) {
      options.attributes = args.attributes;
    }

    const result = await this.client.listEntities(options);

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: result.error?.message,
                code: result.error?.code,
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              count: result.data?.length ?? 0,
              filters: options,
              entities: result.data,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async subscribeEvents(args: z.infer<typeof SubscribeEventsSchema>) {
    const events: any[] = [];
    const subscriptionKey = `${args.event_type}_${args.entity_id ?? 'all'}_${Date.now()}`;

    const options: SubscribeEventsOptions = {
      eventType: args.event_type,
      callback: (event) => {
        events.push({
          timestamp: event.event.time_fired,
          event_type: event.event.event_type,
          data: event.event.data,
          context: event.event.context,
        });
      },
    };
    if (args.entity_id !== undefined) {
      options.entityId = args.entity_id;
    }

    const result = await this.client.subscribeEvents(options);

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: result.error?.message,
                code: result.error?.code,
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }

    // Store subscription
    this.activeSubscriptions.set(subscriptionKey, result.data);

    // Set up auto-unsubscribe
    const duration = args.duration ?? 60;
    setTimeout(async () => {
      const subscription = this.activeSubscriptions.get(subscriptionKey);
      if (subscription) {
        await subscription.unsubscribe();
        this.activeSubscriptions.delete(subscriptionKey);
      }
    }, duration * 1000);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              subscription_id: result.data?.id,
              event_type: args.event_type,
              entity_id: args.entity_id,
              duration_seconds: duration,
              message: `Subscribed to ${args.event_type} events for ${duration} seconds`,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async createAutomation(args: z.infer<typeof CreateAutomationSchema>) {
    const automation: Automation = {
      alias: args.alias,
      trigger: args.trigger as Trigger[],
      action: args.action as Action[],
    };
    if (args.description !== undefined) {
      automation.description = args.description;
    }
    if (args.mode !== undefined) {
      automation.mode = args.mode;
    }
    if (args.condition !== undefined) {
      automation.condition = args.condition as Condition[];
    }

    const result = await this.client.createAutomation(automation);

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: result.error?.message,
                code: result.error?.code,
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              automation: result.data,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async voicePipeline(args: z.infer<typeof VoicePipelineSchema>) {
    let audioData: Buffer | string;

    if (args.input_type === 'audio') {
      // Decode base64 audio
      audioData = Buffer.from(args.input, 'base64');
    } else {
      // Text input
      audioData = args.input;
    }

    const voiceOptions: VoicePipelineOptions = {};
    if (args.language !== undefined) {
      voiceOptions.language = args.language;
    }
    if (args.conversation_id !== undefined) {
      voiceOptions.conversation_id = args.conversation_id;
    }
    if (args.timeout !== undefined) {
      voiceOptions.timeout = args.timeout;
    }

    const result = await this.client.voicePipeline(audioData, voiceOptions);

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: result.error?.message,
                code: result.error?.code,
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result.data, null, 2),
        },
      ],
    };
  }

  private async healthCheck() {
    const result = await this.client.healthCheck();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async getServices() {
    const result = await this.client.getServices();

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: result.error?.message,
                code: result.error?.code,
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result.data, null, 2),
        },
      ],
    };
  }

  private async getAreas() {
    const result = await this.client.getAreas();

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: result.error?.message,
                code: result.error?.code,
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              count: result.data?.length ?? 0,
              areas: result.data,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async getDevices() {
    const result = await this.client.getDevices();

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: result.error?.message,
                code: result.error?.code,
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              count: result.data?.length ?? 0,
              devices: result.data,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  /**
   * Cleanup method to unsubscribe from all active subscriptions
   */
  async cleanup(): Promise<void> {
    const unsubscribePromises = Array.from(
      this.activeSubscriptions.values()
    ).map((subscription) => subscription.unsubscribe());

    await Promise.all(unsubscribePromises);
    this.activeSubscriptions.clear();
    this.client.disconnectWebSocket();
  }
}

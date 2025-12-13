/**
 * Home Assistant Type Definitions
 * Comprehensive types for HA REST API and WebSocket communication
 */

// ============================================================================
// Configuration Types
// ============================================================================

export interface HomeAssistantConfig {
  url: string;
  token: string;
  websocket?: {
    reconnectInterval?: number;
    heartbeatInterval?: number;
    maxReconnectAttempts?: number;
  };
}

// ============================================================================
// Entity State Types
// ============================================================================

export interface EntityState {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_changed: string;
  last_updated: string;
  context: {
    id: string;
    parent_id: string | null;
    user_id: string | null;
  };
}

export interface SetStateOptions {
  state: string;
  attributes?: Record<string, any>;
  force_update?: boolean;
}

// ============================================================================
// Service Call Types
// ============================================================================

export interface ServiceTarget {
  entity_id?: string | string[] | undefined;
  device_id?: string | string[] | undefined;
  area_id?: string | string[] | undefined;
}

export interface ServiceCallOptions {
  domain: string;
  service: string;
  target?: ServiceTarget;
  data?: Record<string, any>;
  return_response?: boolean;
}

export interface ServiceDefinition {
  name: string;
  description: string;
  fields: Record<string, ServiceField>;
  target?: {
    entity?: EntityTarget[];
    device?: DeviceTarget[];
  };
}

export interface ServiceField {
  name: string;
  description: string;
  required?: boolean;
  example?: any;
  default?: any;
  selector?: Record<string, any>;
}

export interface EntityTarget {
  domain?: string[];
  device_class?: string[];
}

export interface DeviceTarget {
  integration?: string[];
  manufacturer?: string[];
  model?: string[];
}

// ============================================================================
// Entity Listing Types
// ============================================================================

export interface ListEntitiesOptions {
  domain?: string;
  area?: string;
  device_class?: string;
  state?: string;
  attributes?: Record<string, any>;
}

export interface EntityRegistry {
  entity_id: string;
  name: string;
  platform: string;
  area_id: string | null;
  device_id: string | null;
  config_entry_id: string | null;
  disabled_by: string | null;
  entity_category: string | null;
  icon: string | null;
  original_name: string;
  unique_id: string;
}

// ============================================================================
// Automation Types
// ============================================================================

export interface Automation {
  id?: string;
  alias: string;
  description?: string;
  mode?: 'single' | 'restart' | 'queued' | 'parallel';
  max?: number;
  max_exceeded?: 'silent' | 'warning' | 'error';
  trigger: Trigger[];
  condition?: Condition[];
  action: Action[];
}

export interface Trigger {
  platform: string;
  entity_id?: string | string[];
  from?: string;
  to?: string;
  for?: string | { hours?: number; minutes?: number; seconds?: number };
  at?: string;
  event?: string;
  event_type?: string;
  event_data?: Record<string, any>;
  [key: string]: any;
}

export interface Condition {
  condition: string;
  entity_id?: string | string[];
  state?: string | string[];
  above?: number;
  below?: number;
  before?: string;
  after?: string;
  [key: string]: any;
}

export interface Action {
  service?: string;
  target?: ServiceTarget;
  data?: Record<string, any>;
  delay?: string | { hours?: number; minutes?: number; seconds?: number };
  wait_template?: string;
  event?: string;
  event_data?: Record<string, any>;
  [key: string]: any;
}

// ============================================================================
// WebSocket Types
// ============================================================================

export interface WebSocketMessage {
  id?: number;
  type: string;
  [key: string]: any;
}

export interface WebSocketAuthMessage extends WebSocketMessage {
  type: 'auth';
  access_token: string;
}

export interface WebSocketAuthRequiredMessage extends WebSocketMessage {
  type: 'auth_required';
  ha_version: string;
}

export interface WebSocketAuthOkMessage extends WebSocketMessage {
  type: 'auth_ok';
  ha_version: string;
}

export interface WebSocketAuthInvalidMessage extends WebSocketMessage {
  type: 'auth_invalid';
  message: string;
}

export interface WebSocketSubscribeMessage extends WebSocketMessage {
  type: 'subscribe_events' | 'subscribe_trigger';
  event_type?: string;
  trigger?: Trigger;
}

export interface WebSocketEventMessage extends WebSocketMessage {
  type: 'event';
  event: {
    event_type: string;
    data: Record<string, any>;
    origin: string;
    time_fired: string;
    context: {
      id: string;
      parent_id: string | null;
      user_id: string | null;
    };
  };
}

export interface WebSocketResultMessage extends WebSocketMessage {
  type: 'result';
  success: boolean;
  result?: any;
  error?: {
    code: string;
    message: string;
  };
}

export type WebSocketIncomingMessage =
  | WebSocketAuthRequiredMessage
  | WebSocketAuthOkMessage
  | WebSocketAuthInvalidMessage
  | WebSocketEventMessage
  | WebSocketResultMessage;

// ============================================================================
// Event Subscription Types
// ============================================================================

export interface EventSubscription {
  id: number;
  eventType: string;
  entityId?: string | undefined;
  callback: (event: WebSocketEventMessage) => void;
  unsubscribe: () => Promise<void>;
}

export interface SubscribeEventsOptions {
  eventType: string;
  entityId?: string;
  callback: (event: WebSocketEventMessage) => void;
}

// ============================================================================
// Wyoming Voice Pipeline Types
// ============================================================================

export interface WyomingConfig {
  protocol: 'stt' | 'tts' | 'wake';
  host: string;
  port: number;
}

export interface VoicePipelineOptions {
  language?: string;
  conversation_id?: string;
  timeout?: number;
  prefer_local_intents?: boolean;
}

export interface SpeechToTextResult {
  text: string;
  confidence: number;
  language: string;
}

export interface TextToSpeechResult {
  audio_url: string;
  media_content_type: string;
  duration?: number;
}

export interface VoicePipelineResult {
  speech?: SpeechToTextResult;
  conversation_response?: {
    speech: {
      plain: string;
    };
    card?: {
      type: string;
      title: string;
      content: string;
    };
  };
  tts?: TextToSpeechResult;
  error?: string;
}

// ============================================================================
// Area and Device Types
// ============================================================================

export interface Area {
  area_id: string;
  name: string;
  picture: string | null;
  aliases: string[];
}

export interface Device {
  id: string;
  name: string;
  name_by_user: string | null;
  area_id: string | null;
  configuration_url: string | null;
  config_entries: string[];
  connections: Array<[string, string]>;
  identifiers: Array<[string, string]>;
  manufacturer: string | null;
  model: string | null;
  sw_version: string | null;
  hw_version: string | null;
  via_device_id: string | null;
  disabled_by: string | null;
  entry_type: string | null;
}

// ============================================================================
// Health Check Types
// ============================================================================

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  rest_api: boolean;
  websocket: boolean;
  ha_version?: string;
  latency_ms?: number;
  error?: string;
}

// ============================================================================
// Client Response Types
// ============================================================================

export interface ClientResponse<T = any> {
  success: boolean;
  data?: T | undefined;
  error?: {
    code: string;
    message: string;
    details?: any;
  } | undefined;
}

// ============================================================================
// History and Logbook Types
// ============================================================================

export interface HistoryOptions {
  entity_id?: string | string[];
  start_time?: string;
  end_time?: string;
  minimal_response?: boolean;
  no_attributes?: boolean;
  significant_changes_only?: boolean;
}

export interface LogbookEntry {
  when: string;
  name: string;
  message: string;
  domain: string;
  entity_id: string;
  context_id: string;
  context_user_id: string | null;
}

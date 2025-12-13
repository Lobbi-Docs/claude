/**
 * Home Assistant Client
 * Provides REST API and WebSocket connectivity to Home Assistant
 * Supports Wyoming voice pipeline integration
 */

import axios, { AxiosInstance } from 'axios';
import WebSocket from 'ws';
import {
  HomeAssistantConfig,
  EntityState,
  SetStateOptions,
  ServiceCallOptions,
  ListEntitiesOptions,
  Automation,
  EventSubscription,
  SubscribeEventsOptions,
  WebSocketMessage,
  WebSocketAuthMessage,
  WebSocketIncomingMessage,
  WebSocketEventMessage,
  WebSocketResultMessage,
  HealthCheckResult,
  ClientResponse,
  ServiceDefinition,
  EntityRegistry,
  Area,
  Device,
  VoicePipelineOptions,
  VoicePipelineResult,
} from './types/homeassistant.types.js';

export class HomeAssistantClient {
  private config: HomeAssistantConfig;
  private restClient: AxiosInstance;
  private ws: WebSocket | null = null;
  private wsMessageId = 0;
  private wsAuthenticated = false;
  private wsReconnectAttempts = 0;
  private wsMaxReconnectAttempts: number;
  private wsReconnectInterval: number;
  private wsHeartbeatInterval: number;
  private wsHeartbeatTimer: NodeJS.Timeout | null = null;
  private subscriptions = new Map<number, EventSubscription>();
  private pendingRequests = new Map<
    number,
    {
      resolve: (value: any) => void;
      reject: (error: any) => void;
    }
  >();

  constructor(config: HomeAssistantConfig) {
    this.config = config;
    this.wsMaxReconnectAttempts = config.websocket?.maxReconnectAttempts ?? 10;
    this.wsReconnectInterval = config.websocket?.reconnectInterval ?? 5000;
    this.wsHeartbeatInterval = config.websocket?.heartbeatInterval ?? 30000;

    // Initialize REST client
    this.restClient = axios.create({
      baseURL: `${config.url}/api`,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
  }

  // ============================================================================
  // REST API Methods
  // ============================================================================

  /**
   * Get the state of an entity
   */
  async getState(entityId: string): Promise<ClientResponse<EntityState>> {
    try {
      const response = await this.restClient.get<EntityState>(
        `/states/${entityId}`
      );
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return this.handleError(error, 'getState');
    }
  }

  /**
   * Set the state of an entity
   */
  async setState(
    entityId: string,
    options: SetStateOptions
  ): Promise<ClientResponse<EntityState>> {
    try {
      const response = await this.restClient.post<EntityState>(
        `/states/${entityId}`,
        {
          state: options.state,
          attributes: options.attributes ?? {},
          force_update: options.force_update ?? false,
        }
      );
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return this.handleError(error, 'setState');
    }
  }

  /**
   * Call a service
   */
  async callService(
    options: ServiceCallOptions
  ): Promise<ClientResponse<any>> {
    try {
      const endpoint = `/services/${options.domain}/${options.service}`;
      const payload: any = {};

      if (options.target) {
        payload.target = options.target;
      }

      if (options.data) {
        Object.assign(payload, options.data);
      }

      if (options.return_response) {
        payload.return_response = true;
      }

      const response = await this.restClient.post(endpoint, payload);
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return this.handleError(error, 'callService');
    }
  }

  /**
   * List all entities or filter by criteria
   */
  async listEntities(
    options?: ListEntitiesOptions
  ): Promise<ClientResponse<EntityState[]>> {
    try {
      const response = await this.restClient.get<EntityState[]>('/states');
      let entities = response.data;

      // Apply filters
      if (options?.domain) {
        entities = entities.filter((entity) =>
          entity.entity_id.startsWith(`${options.domain}.`)
        );
      }

      if (options?.state) {
        entities = entities.filter((entity) => entity.state === options.state);
      }

      if (options?.area) {
        // Get entity registry to filter by area
        const registryResponse = await this.getEntityRegistry();
        if (registryResponse.success && registryResponse.data) {
          const entitiesInArea = new Set(
            registryResponse.data
              .filter((reg) => reg.area_id === options.area)
              .map((reg) => reg.entity_id)
          );
          entities = entities.filter((entity) =>
            entitiesInArea.has(entity.entity_id)
          );
        }
      }

      if (options?.device_class) {
        entities = entities.filter(
          (entity) => entity.attributes['device_class'] === options.device_class
        );
      }

      if (options?.attributes) {
        entities = entities.filter((entity) => {
          return Object.entries(options.attributes!).every(
            ([key, value]) => entity.attributes[key] === value
          );
        });
      }

      return {
        success: true,
        data: entities,
      };
    } catch (error: any) {
      return this.handleError(error, 'listEntities');
    }
  }

  /**
   * Get all services with their definitions
   */
  async getServices(): Promise<
    ClientResponse<Record<string, Record<string, ServiceDefinition>>>
  > {
    try {
      const response = await this.restClient.get('/services');
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return this.handleError(error, 'getServices');
    }
  }

  /**
   * Get entity registry
   */
  async getEntityRegistry(): Promise<ClientResponse<EntityRegistry[]>> {
    try {
      const response = await this.restClient.get('/config/entity_registry/list');
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return this.handleError(error, 'getEntityRegistry');
    }
  }

  /**
   * Get all areas
   */
  async getAreas(): Promise<ClientResponse<Area[]>> {
    try {
      const response = await this.restClient.get('/config/area_registry/list');
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return this.handleError(error, 'getAreas');
    }
  }

  /**
   * Get all devices
   */
  async getDevices(): Promise<ClientResponse<Device[]>> {
    try {
      const response = await this.restClient.get('/config/device_registry/list');
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return this.handleError(error, 'getDevices');
    }
  }

  /**
   * Create or update an automation
   */
  async createAutomation(
    automation: Automation
  ): Promise<ClientResponse<Automation>> {
    try {
      const response = await this.restClient.post(
        '/config/automation/config',
        automation
      );
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return this.handleError(error, 'createAutomation');
    }
  }

  /**
   * Get all automations
   */
  async getAutomations(): Promise<ClientResponse<Automation[]>> {
    try {
      const response = await this.restClient.get('/config/automation/config');
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return this.handleError(error, 'getAutomations');
    }
  }

  /**
   * Wyoming voice pipeline integration
   */
  async voicePipeline(
    audioData: Buffer | string,
    options?: VoicePipelineOptions
  ): Promise<ClientResponse<VoicePipelineResult>> {
    try {
      const formData = new FormData();

      if (typeof audioData === 'string') {
        // Text input for TTS
        formData.append('text', audioData);
      } else {
        // Audio input for STT
        const blob = new Blob([audioData], { type: 'audio/wav' });
        formData.append('audio', blob);
      }

      if (options?.language) {
        formData.append('language', options.language);
      }

      if (options?.conversation_id) {
        formData.append('conversation_id', options.conversation_id);
      }

      const response = await this.restClient.post(
        '/voice_assistant/process',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: options?.timeout ?? 30000,
        }
      );

      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return this.handleError(error, 'voicePipeline');
    }
  }

  /**
   * Health check for REST API and WebSocket
   */
  async healthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const result: HealthCheckResult = {
      status: 'healthy',
      rest_api: false,
      websocket: false,
    };

    try {
      // Check REST API
      const response = await this.restClient.get('/');
      result.rest_api = response.status === 200;
      result.ha_version = response.data?.version;
      result.latency_ms = Date.now() - startTime;

      // Check WebSocket
      result.websocket = this.ws !== null && this.wsAuthenticated;

      // Determine overall status
      if (result.rest_api && result.websocket) {
        result.status = 'healthy';
      } else if (result.rest_api || result.websocket) {
        result.status = 'degraded';
      } else {
        result.status = 'unhealthy';
      }
    } catch (error: any) {
      result.status = 'unhealthy';
      result.error = error.message;
    }

    return result;
  }

  // ============================================================================
  // WebSocket Methods
  // ============================================================================

  /**
   * Connect to Home Assistant WebSocket API
   */
  async connectWebSocket(): Promise<ClientResponse<void>> {
    return new Promise((resolve) => {
      if (this.ws && this.wsAuthenticated) {
        resolve({ success: true });
        return;
      }

      const wsUrl = this.config.url.replace(/^http/, 'ws') + '/api/websocket';
      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => {
        console.log('[HA WebSocket] Connection opened');
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        this.handleWebSocketMessage(data.toString());
      });

      this.ws.on('close', () => {
        console.log('[HA WebSocket] Connection closed');
        this.wsAuthenticated = false;
        this.stopHeartbeat();
        this.reconnectWebSocket();
      });

      this.ws.on('error', (error) => {
        console.error('[HA WebSocket] Error:', error);
        resolve({
          success: false,
          error: {
            code: 'WS_ERROR',
            message: error.message,
          },
        });
      });

      // Set up a one-time listener for authentication result
      const authListener = (message: WebSocketIncomingMessage) => {
        if (message.type === 'auth_ok') {
          this.wsAuthenticated = true;
          this.wsReconnectAttempts = 0;
          this.startHeartbeat();
          resolve({ success: true });
        } else if (message.type === 'auth_invalid') {
          resolve({
            success: false,
            error: {
              code: 'AUTH_INVALID',
              message: message.message ?? 'Authentication failed',
            },
          });
        }
      };

      // Temporarily store the listener
      (this as any)._authListener = authListener;
    });
  }

  /**
   * Subscribe to events
   */
  async subscribeEvents(
    options: SubscribeEventsOptions
  ): Promise<ClientResponse<EventSubscription>> {
    if (!this.wsAuthenticated) {
      const connectResult = await this.connectWebSocket();
      if (!connectResult.success) {
        return {
          success: false,
          error: connectResult.error,
        };
      }
    }

    const id = ++this.wsMessageId;
    const message: WebSocketMessage = {
      id,
      type: 'subscribe_events',
      event_type: options.eventType,
    };

    try {
      await this.sendWebSocketMessage(message);

      const subscription: EventSubscription = {
        id,
        eventType: options.eventType,
        entityId: options.entityId,
        callback: options.callback,
        unsubscribe: async () => {
          await this.unsubscribeEvents(id);
        },
      };

      this.subscriptions.set(id, subscription);

      return {
        success: true,
        data: subscription,
      };
    } catch (error: any) {
      return this.handleError(error, 'subscribeEvents');
    }
  }

  /**
   * Unsubscribe from events
   */
  private async unsubscribeEvents(subscriptionId: number): Promise<void> {
    if (!this.wsAuthenticated || !this.ws) {
      return;
    }

    const message: WebSocketMessage = {
      id: ++this.wsMessageId,
      type: 'unsubscribe_events',
      subscription: subscriptionId,
    };

    await this.sendWebSocketMessage(message);
    this.subscriptions.delete(subscriptionId);
  }

  /**
   * Disconnect WebSocket
   */
  disconnectWebSocket(): void {
    if (this.ws) {
      this.stopHeartbeat();
      this.ws.close();
      this.ws = null;
      this.wsAuthenticated = false;
      this.subscriptions.clear();
      this.pendingRequests.clear();
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private handleWebSocketMessage(data: string): void {
    try {
      const message: WebSocketIncomingMessage = JSON.parse(data);

      // Handle authentication flow
      if (message.type === 'auth_required') {
        this.authenticateWebSocket();
        return;
      }

      if (message.type === 'auth_ok' || message.type === 'auth_invalid') {
        const authListener = (this as any)._authListener;
        if (authListener) {
          authListener(message);
          delete (this as any)._authListener;
        }
        return;
      }

      // Handle event messages
      if (message.type === 'event') {
        const eventMessage = message as WebSocketEventMessage;
        const subscription = this.subscriptions.get(message.id ?? 0);
        if (subscription) {
          // Filter by entity_id if specified
          if (
            !subscription.entityId ||
            eventMessage.event.data['entity_id'] === subscription.entityId
          ) {
            subscription.callback(eventMessage);
          }
        }
        return;
      }

      // Handle result messages
      if (message.type === 'result') {
        const resultMessage = message as WebSocketResultMessage;
        const pending = this.pendingRequests.get(resultMessage.id ?? 0);
        if (pending) {
          if (resultMessage.success) {
            pending.resolve(resultMessage.result);
          } else {
            pending.reject(new Error(resultMessage.error?.message ?? 'Unknown error'));
          }
          this.pendingRequests.delete(resultMessage.id ?? 0);
        }
        return;
      }
    } catch (error) {
      console.error('[HA WebSocket] Failed to parse message:', error);
    }
  }

  private authenticateWebSocket(): void {
    if (!this.ws) {
      return;
    }

    const authMessage: WebSocketAuthMessage = {
      type: 'auth',
      access_token: this.config.token,
    };

    this.ws.send(JSON.stringify(authMessage));
  }

  private sendWebSocketMessage(message: WebSocketMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.ws || !this.wsAuthenticated) {
        reject(new Error('WebSocket not connected or authenticated'));
        return;
      }

      if (message.id) {
        this.pendingRequests.set(message.id, { resolve, reject });
      }

      this.ws.send(JSON.stringify(message), (error) => {
        if (error) {
          if (message.id) {
            this.pendingRequests.delete(message.id);
          }
          reject(error);
        } else if (!message.id) {
          // For messages without ID, resolve immediately after send
          resolve(undefined);
        }
      });
    });
  }

  private reconnectWebSocket(): void {
    if (this.wsReconnectAttempts >= this.wsMaxReconnectAttempts) {
      console.error(
        '[HA WebSocket] Max reconnection attempts reached. Giving up.'
      );
      return;
    }

    this.wsReconnectAttempts++;
    console.log(
      `[HA WebSocket] Reconnecting in ${this.wsReconnectInterval}ms... (attempt ${this.wsReconnectAttempts})`
    );

    setTimeout(() => {
      this.connectWebSocket().catch((error) => {
        console.error('[HA WebSocket] Reconnection failed:', error);
      });
    }, this.wsReconnectInterval);
  }

  private startHeartbeat(): void {
    this.wsHeartbeatTimer = setInterval(() => {
      if (this.ws && this.wsAuthenticated) {
        const pingMessage: WebSocketMessage = {
          id: ++this.wsMessageId,
          type: 'ping',
        };
        this.sendWebSocketMessage(pingMessage).catch((error) => {
          console.error('[HA WebSocket] Heartbeat failed:', error);
        });
      }
    }, this.wsHeartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.wsHeartbeatTimer) {
      clearInterval(this.wsHeartbeatTimer);
      this.wsHeartbeatTimer = null;
    }
  }

  private handleError(error: any, method: string): ClientResponse<never> {
    console.error(`[HA Client] Error in ${method}:`, error);

    return {
      success: false,
      error: {
        code: error.response?.status?.toString() ?? 'UNKNOWN_ERROR',
        message: error.response?.data?.message ?? error.message,
        details: error.response?.data,
      },
    };
  }
}

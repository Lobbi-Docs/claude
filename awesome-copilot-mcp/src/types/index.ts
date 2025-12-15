/**
 * Type definitions for awesome-copilot MCP server
 */

export interface AwesomeCopilotResource {
  name: string;
  path: string;
  type: 'prompt' | 'instruction' | 'config' | 'agent' | 'collection' | 'other';
  category?: string;
  description?: string;
  content?: string;
}

export interface AwesomeCopilotSearchResult {
  resources: AwesomeCopilotResource[];
  total: number;
  query: string;
}

export interface ServerConfig {
  github: {
    owner: string;
    repo: string;
    branch: string;
    apiUrl: string;
    rawUrl: string;
  };
  cache: {
    enabled: boolean;
    ttl: number; // Time to live in milliseconds
  };
}


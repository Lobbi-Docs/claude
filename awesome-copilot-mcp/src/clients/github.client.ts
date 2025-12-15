/**
 * GitHub API client for accessing awesome-copilot repository
 */

import axios, { AxiosInstance } from 'axios';
import type { AwesomeCopilotResource } from '../types/index.js';

export class GitHubClient {
  private client: AxiosInstance;
  private owner: string;
  private repo: string;
  private branch: string;
  private rawUrl: string;

  constructor(config: {
    owner: string;
    repo: string;
    branch: string;
    apiUrl: string;
    rawUrl: string;
  }) {
    this.owner = config.owner;
    this.repo = config.repo;
    this.branch = config.branch;
    this.rawUrl = config.rawUrl;

    this.client = axios.create({
      baseURL: config.apiUrl,
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'awesome-copilot-mcp/1.0.0',
      },
      timeout: 30000,
    });
  }

  /**
   * Get file contents from GitHub repository
   */
  async getFileContents(path: string): Promise<string> {
    try {
      const url = `${this.rawUrl}/${this.owner}/${this.repo}/${this.branch}/${path}`;
      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          'Accept': 'text/plain',
        },
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error(`File not found: ${path}`);
      }
      throw new Error(`Failed to fetch file: ${error.message}`);
    }
  }

  /**
   * List directory contents from GitHub repository
   */
  async listDirectory(path: string = ''): Promise<AwesomeCopilotResource[]> {
    try {
      const url = `/repos/${this.owner}/${this.repo}/contents/${path}`;
      const response = await this.client.get(url, {
        params: {
          ref: this.branch,
        },
      });

      const items: AwesomeCopilotResource[] = [];
      for (const item of response.data) {
        if (item.type === 'file') {
          const resource = this.mapFileToResource(item, path);
          if (resource) {
            items.push(resource);
          }
        } else if (item.type === 'dir') {
          // Recursively get directory contents
          const subItems = await this.listDirectory(item.path);
          items.push(...subItems);
        }
      }

      return items;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return [];
      }
      throw new Error(`Failed to list directory: ${error.message}`);
    }
  }

  /**
   * Search for files by name or path
   */
  async searchFiles(query: string): Promise<AwesomeCopilotResource[]> {
    try {
      // Use GitHub API search
      const response = await this.client.get('/search/code', {
        params: {
          q: `repo:${this.owner}/${this.repo} ${query}`,
        },
      });

      const resources: AwesomeCopilotResource[] = [];
      for (const item of response.data.items) {
        const resource = this.mapFileToResource({
          name: item.name,
          path: item.path,
          type: 'file',
          size: item.size,
        }, '');
        if (resource) {
          resources.push(resource);
        }
      }

      return resources;
    } catch (error: any) {
      throw new Error(`Failed to search files: ${error.message}`);
    }
  }

  /**
   * Map GitHub API file object to AwesomeCopilotResource
   */
  private mapFileToResource(item: any, basePath: string): AwesomeCopilotResource | null {
    const path = item.path || `${basePath}/${item.name}`.replace(/^\/+/, '');
    const name = item.name || path.split('/').pop() || path;

    // Determine resource type based on path
    let type: AwesomeCopilotResource['type'] = 'other';
    let category: string | undefined;

    if (path.includes('/prompts/')) {
      type = 'prompt';
      category = 'prompts';
    } else if (path.includes('/instructions/')) {
      type = 'instruction';
      category = 'instructions';
    } else if (path.includes('/agents/')) {
      type = 'agent';
      category = 'agents';
    } else if (path.includes('/collections/')) {
      type = 'collection';
      category = 'collections';
    } else if (path.match(/\.(json|yaml|yml|toml)$/i)) {
      type = 'config';
    }

    // Skip certain files
    if (name.startsWith('.') || name === 'README.md' || name === 'LICENSE') {
      return null;
    }

    return {
      name,
      path,
      type,
      category,
    };
  }

  /**
   * Get repository tree (all files)
   */
  async getRepositoryTree(): Promise<AwesomeCopilotResource[]> {
    try {
      // Get the tree recursively
      const response = await this.client.get(`/repos/${this.owner}/${this.repo}/git/trees/${this.branch}`, {
        params: {
          recursive: '1',
        },
      });

      const resources: AwesomeCopilotResource[] = [];
      for (const item of response.data.tree) {
        if (item.type === 'blob') {
          const resource = this.mapFileToResource({
            name: item.path.split('/').pop(),
            path: item.path,
            type: 'file',
          }, '');
          if (resource) {
            resources.push(resource);
          }
        }
      }

      return resources;
    } catch (error: any) {
      throw new Error(`Failed to get repository tree: ${error.message}`);
    }
  }
}


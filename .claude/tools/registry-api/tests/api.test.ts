/**
 * Integration Tests for Registry API
 *
 * These tests validate core API functionality using supertest for HTTP assertions.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/server.js';
import type { Express } from 'express';

describe('Registry API Integration Tests', () => {
  let app: Express;
  let authToken: string;
  let pluginId: string;

  beforeAll(() => {
    app = createApp();
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Authentication', () => {
    const testUser = {
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password: 'TestPass123!',
    };

    it('should register new user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data.user).toHaveProperty('username', testUser.username);

      authToken = response.body.data.accessToken;
    });

    it('should login existing user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: testUser.username,
          password: testUser.password,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: testUser.username,
          password: 'WrongPassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should get current user profile', async () => {
      const response = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('username', testUser.username);
    });
  });

  describe('Plugin Management', () => {
    const testPlugin = {
      name: `test-plugin-${Date.now()}`,
      version: '1.0.0',
      description: 'Test plugin for integration testing purposes',
      author: 'Test Author',
      author_email: 'test@example.com',
      repository_url: 'https://github.com/test/plugin',
      category: 'development' as const,
      tags: ['test', 'automation'],
      readme_content: '# Test Plugin\n\nThis is a test plugin.',
      license: 'MIT',
    };

    it('should create new plugin with auth', async () => {
      const response = await request(app)
        .post('/api/v1/plugins')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testPlugin);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('name', testPlugin.name);

      pluginId = response.body.data.id;
    });

    it('should reject duplicate plugin', async () => {
      const response = await request(app)
        .post('/api/v1/plugins')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testPlugin);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });

    it('should list plugins', async () => {
      const response = await request(app).get('/api/v1/plugins?limit=10&offset=0');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get plugin by ID', async () => {
      const response = await request(app).get(`/api/v1/plugins/${pluginId}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('id', pluginId);
      expect(response.body.data).toHaveProperty('name', testPlugin.name);
    });

    it('should update plugin with auth', async () => {
      const response = await request(app)
        .put(`/api/v1/plugins/${pluginId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ description: 'Updated description' });

      expect(response.status).toBe(200);
      expect(response.body.data.description).toBe('Updated description');
    });
  });

  describe('Search & Discovery', () => {
    it('should search plugins', async () => {
      const response = await request(app).get('/api/v1/search?q=test&limit=5');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get trending plugins', async () => {
      const response = await request(app).get('/api/v1/trending?limit=5');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should list categories', async () => {
      const response = await request(app).get('/api/v1/categories');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('Downloads & Reviews', () => {
    it('should track plugin download', async () => {
      const response = await request(app).get(`/api/v1/plugins/${pluginId}/download`);

      // Should redirect to repository
      expect([302, 404]).toContain(response.status);
    });

    it('should get plugin stats', async () => {
      const response = await request(app).get(`/api/v1/plugins/${pluginId}/stats`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('total_downloads');
      expect(response.body.data).toHaveProperty('average_rating');
    });

    it('should create plugin rating with auth', async () => {
      const response = await request(app)
        .post(`/api/v1/plugins/${pluginId}/rate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          stars: 5,
          review_title: 'Excellent plugin!',
          review_text: 'This plugin works great for testing.',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('should get plugin reviews', async () => {
      const response = await request(app).get(`/api/v1/plugins/${pluginId}/reviews`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      // Make rapid requests to trigger rate limit
      const requests = Array(150)
        .fill(null)
        .map(() => request(app).get('/health'));

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter((r) => r.status === 429);

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});

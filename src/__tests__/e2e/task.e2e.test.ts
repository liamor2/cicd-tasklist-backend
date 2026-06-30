import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import testPrisma from './setup.js';

// Mock the prisma singleton to use the test client
vi.mock('../../lib/prisma.js', () => ({
  default: testPrisma,
}));

// Import app AFTER mocking prisma
const { default: app } = await import('../../app.js');

import request from 'supertest';

describe('Task API E2E Tests', () => {
  beforeEach(async () => {
    // Clean up database between tests
    await testPrisma.task.deleteMany();
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  async function createTask(data: { title: string; description?: string }) {
    return testPrisma.task.create({ data });
  }

  describe('POST /api/tasks', () => {
    it('should create a new task', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'E2E Task', description: 'E2E Description' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe('E2E Task');
      expect(res.body.description).toBe('E2E Description');
      expect(res.body.completed).toBe(false);
    });

    it('should trim the title before creating a task', async () => {
      const res = await request(app).post('/api/tasks').send({ title: '  Trimmed Task  ' });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Trimmed Task');
      expect(res.body.description).toBeNull();
    });

    it.each([
      ['missing', {}],
      ['blank', { title: '   ' }],
      ['non-string', { title: 123 }],
    ])('should reject a %s title', async (_case, body) => {
      const res = await request(app).post('/api/tasks').send(body);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: 'Title is required and must be a non-empty string',
      });
    });
  });

  describe('GET /api/tasks', () => {
    it('should return all tasks ordered by most recent creation date', async () => {
      const olderTask = await createTask({
        title: 'Older Task',
        description: 'Created first',
      });
      const newerTask = await createTask({
        title: 'Newer Task',
        description: 'Created second',
      });

      const res = await request(app).get('/api/tasks');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].id).toBe(newerTask.id);
      expect(res.body[1].id).toBe(olderTask.id);
    });
  });

  describe('GET /api/tasks/:id', () => {
    it('should return a task by id', async () => {
      const task = await createTask({
        title: 'Readable Task',
        description: 'Found by id',
      });

      const res = await request(app).get(`/api/tasks/${task.id}`);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: task.id,
        title: 'Readable Task',
        description: 'Found by id',
        completed: false,
      });
    });

    it('should return 400 for an invalid id', async () => {
      const res = await request(app).get('/api/tasks/not-a-number');

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Invalid task ID' });
    });

    it('should return 404 for a missing task', async () => {
      const res = await request(app).get('/api/tasks/999');

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Task not found' });
    });
  });

  describe('PUT /api/tasks/:id', () => {
    it('should update an existing task', async () => {
      const task = await createTask({
        title: 'Original Task',
        description: 'Before update',
      });

      const res = await request(app).put(`/api/tasks/${task.id}`).send({
        title: 'Updated Task',
        description: 'After update',
        completed: true,
      });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: task.id,
        title: 'Updated Task',
        description: 'After update',
        completed: true,
      });
    });

    it('should return 400 for an invalid id', async () => {
      const res = await request(app).put('/api/tasks/not-a-number').send({ completed: true });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Invalid task ID' });
    });

    it('should return 404 when updating a missing task', async () => {
      const res = await request(app).put('/api/tasks/999').send({ completed: true });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Task not found' });
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('should delete an existing task', async () => {
      const task = await createTask({
        title: 'Disposable Task',
        description: 'Will be deleted',
      });

      const res = await request(app).delete(`/api/tasks/${task.id}`);

      expect(res.status).toBe(204);
      await expect(testPrisma.task.findUnique({ where: { id: task.id } })).resolves.toBeNull();
    });

    it('should return 400 for an invalid id', async () => {
      const res = await request(app).delete('/api/tasks/not-a-number');

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Invalid task ID' });
    });

    it('should return 404 when deleting a missing task', async () => {
      const res = await request(app).delete('/api/tasks/999');

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Task not found' });
    });
  });
});

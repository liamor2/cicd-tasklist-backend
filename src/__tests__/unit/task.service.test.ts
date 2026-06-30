import type { Task } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the prisma module before importing the service
vi.mock('../../lib/prisma.js', () => {
  return {
    default: {
      task: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    },
  };
});

import prisma from '../../lib/prisma.js';
import * as taskService from '../../services/task.service.js';

const mockPrisma = vi.mocked(prisma);

const mockTask: Task = {
  id: 1,
  title: 'Test Task',
  description: 'A test task description',
  completed: false,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('TaskService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all tasks ordered by createdAt desc', async () => {
      const tasks = [mockTask];
      (mockPrisma.task.findMany as any).mockResolvedValue(tasks);

      const result = await taskService.findAll();

      expect(result).toEqual(tasks);
      expect(mockPrisma.task.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findById', () => {
    it('should return the task matching the id', async () => {
      (mockPrisma.task.findUnique as any).mockResolvedValue(mockTask);

      const result = await taskService.findById(1);

      expect(result).toEqual(mockTask);
      expect(mockPrisma.task.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should return null when the task does not exist', async () => {
      (mockPrisma.task.findUnique as any).mockResolvedValue(null);

      const result = await taskService.findById(999);

      expect(result).toBeNull();
      expect(mockPrisma.task.findUnique).toHaveBeenCalledWith({
        where: { id: 999 },
      });
    });
  });

  describe('create', () => {
    it('should create a task with title and description', async () => {
      (mockPrisma.task.create as any).mockResolvedValue(mockTask);

      const result = await taskService.create({
        title: 'Test Task',
        description: 'A test task description',
      });

      expect(result).toEqual(mockTask);
      expect(mockPrisma.task.create).toHaveBeenCalledWith({
        data: {
          title: 'Test Task',
          description: 'A test task description',
        },
      });
    });

    it('should pass an undefined description when omitted', async () => {
      (mockPrisma.task.create as any).mockResolvedValue({
        ...mockTask,
        description: null,
      });

      await taskService.create({ title: 'Test Task' });

      expect(mockPrisma.task.create).toHaveBeenCalledWith({
        data: {
          title: 'Test Task',
          description: undefined,
        },
      });
    });
  });

  describe('update', () => {
    it('should update an existing task', async () => {
      const updatedTask = { ...mockTask, completed: true };
      (mockPrisma.task.findUnique as any).mockResolvedValue(mockTask);
      (mockPrisma.task.update as any).mockResolvedValue(updatedTask);

      const result = await taskService.update(1, { completed: true });

      expect(result).toEqual(updatedTask);
      expect(mockPrisma.task.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockPrisma.task.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { completed: true },
      });
    });

    it('should throw when updating a missing task', async () => {
      (mockPrisma.task.findUnique as any).mockResolvedValue(null);

      await expect(taskService.update(999, { completed: true })).rejects.toThrow('Task not found');
      expect(mockPrisma.task.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete an existing task', async () => {
      (mockPrisma.task.findUnique as any).mockResolvedValue(mockTask);
      (mockPrisma.task.delete as any).mockResolvedValue(mockTask);

      const result = await taskService.remove(1);

      expect(result).toEqual(mockTask);
      expect(mockPrisma.task.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockPrisma.task.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw when deleting a missing task', async () => {
      (mockPrisma.task.findUnique as any).mockResolvedValue(null);

      await expect(taskService.remove(999)).rejects.toThrow('Task not found');
      expect(mockPrisma.task.delete).not.toHaveBeenCalled();
    });
  });
});

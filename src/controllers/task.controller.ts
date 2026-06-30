import type { Request, Response } from 'express';
import * as taskService from '../services/task.service.js';

export async function getAllTasks(_req: Request, res: Response): Promise<void> {
  try {
    const tasks = await taskService.findAll();
    res.status(200).json(tasks);
  } catch (error) {
    console.error('Error in getAllTasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
}

export async function getTaskById(req: Request, res: Response): Promise<void> {
  try {
    const id = Number.parseInt(req.params.id as string, 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid task ID' });
      return;
    }

    const task = await taskService.findById(id);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    res.status(200).json(task);
  } catch (error) {
    console.error('Error in getTaskById:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
}

export async function createTask(req: Request, res: Response): Promise<void> {
  try {
    const { title, description } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      res.status(400).json({ error: 'Title is required and must be a non-empty string' });
      return;
    }

    const task = await taskService.create({
      title: title.trim(),
      description: description ?? undefined,
    });

    res.status(201).json(task);
  } catch (error) {
    console.error('Error in createTask:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
}

export async function updateTask(req: Request, res: Response): Promise<void> {
  try {
    const id = Number.parseInt(req.params.id as string, 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid task ID' });
      return;
    }

    const { title, description, completed } = req.body;
    const task = await taskService.update(id, { title, description, completed });

    res.status(200).json(task);
  } catch (error) {
    if (error instanceof Error && error.message === 'Task not found') {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    console.error('Error in updateTask:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
}

export async function deleteTask(req: Request, res: Response): Promise<void> {
  try {
    const id = Number.parseInt(req.params.id as string, 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid task ID' });
      return;
    }

    await taskService.remove(id);
    res.status(204).send();
  } catch (error) {
    if (error instanceof Error && error.message === 'Task not found') {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    console.error('Error in deleteTask:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
}

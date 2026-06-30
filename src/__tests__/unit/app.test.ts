import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../services/task.service.js', () => ({
  findAll: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));

import app from '../../app.js';
import taskRoutes from '../../routes/task.routes.js';
import * as taskService from '../../services/task.service.js';

const mockService = vi.mocked(taskService);

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create an Express app with middleware mounted', () => {
    expect(app).toBeDefined();
    expect(typeof app.use).toBe('function');
    expect(typeof app.listen).toBe('function');
  });

  it('should expose the task router without calling handlers during setup', () => {
    expect(taskRoutes).toBeDefined();
    expect(typeof taskRoutes.use).toBe('function');
    expect(mockService.findAll).not.toHaveBeenCalled();
    expect(mockService.findById).not.toHaveBeenCalled();
    expect(mockService.create).not.toHaveBeenCalled();
    expect(mockService.update).not.toHaveBeenCalled();
    expect(mockService.remove).not.toHaveBeenCalled();
  });
});

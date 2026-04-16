const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

// ─── Helper ───────────────────────────────────────────────────────────────────
const createTask = (overrides = {}) =>
  request(app)
    .post('/tasks')
    .send({ title: 'Test Task', priority: 'high', ...overrides });

// ═══════════════════════════════════════════════════════════════════════════════
// UNIT TESTS — taskService
// ═══════════════════════════════════════════════════════════════════════════════

describe('taskService — unit tests', () => {
  describe('create', () => {
    it('creates a task with required fields and sensible defaults', () => {
      const task = taskService.create({ title: 'Buy milk' });
      expect(task.id).toBeDefined();
      expect(task.title).toBe('Buy milk');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.description).toBe('');
      expect(task.dueDate).toBeNull();
      expect(task.completedAt).toBeNull();
      expect(task.createdAt).toBeDefined();
    });

    it('creates a task with all fields supplied', () => {
      const task = taskService.create({
        title: 'Ship it',
        description: 'Deploy to prod',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2025-12-31T00:00:00.000Z',
      });
      expect(task.status).toBe('in_progress');
      expect(task.priority).toBe('high');
      expect(task.dueDate).toBe('2025-12-31T00:00:00.000Z');
    });
  });

  describe('getAll', () => {
    it('returns empty array when no tasks', () => {
      expect(taskService.getAll()).toEqual([]);
    });

    it('returns all tasks', () => {
      taskService.create({ title: 'A' });
      taskService.create({ title: 'B' });
      expect(taskService.getAll()).toHaveLength(2);
    });

    it('returns a copy, not the internal array', () => {
      taskService.create({ title: 'A' });
      const result = taskService.getAll();
      result.push({ id: 'fake' });
      expect(taskService.getAll()).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('finds a task by id', () => {
      const task = taskService.create({ title: 'Find me' });
      expect(taskService.findById(task.id)).toEqual(task);
    });

    it('returns undefined for unknown id', () => {
      expect(taskService.findById('does-not-exist')).toBeUndefined();
    });
  });

  describe('getByStatus', () => {
    it('returns only tasks with the exact matching status', () => {
      taskService.create({ title: 'A', status: 'todo' });
      taskService.create({ title: 'B', status: 'in_progress' });
      taskService.create({ title: 'C', status: 'done' });

      expect(taskService.getByStatus('todo')).toHaveLength(1);
      expect(taskService.getByStatus('in_progress')).toHaveLength(1);
      expect(taskService.getByStatus('done')).toHaveLength(1);
    });

    it('does NOT partially match status strings (regression: was using .includes)', () => {
      // Before fix, querying "in" would match "in_progress"
      taskService.create({ title: 'A', status: 'in_progress' });
      expect(taskService.getByStatus('in')).toHaveLength(0);
    });

    it('returns empty array when no tasks match', () => {
      taskService.create({ title: 'A', status: 'todo' });
      expect(taskService.getByStatus('done')).toHaveLength(0);
    });
  });

  describe('getPaginated', () => {
    beforeEach(() => {
      for (let i = 1; i <= 15; i++) {
        taskService.create({ title: `Task ${i}` });
      }
    });

    it('page=1 returns the first page of results', () => {
      const page = taskService.getPaginated(1, 10);
      expect(page).toHaveLength(10);
    });

    it('page=2 returns the second page', () => {
      const page = taskService.getPaginated(2, 10);
      expect(page).toHaveLength(5);
    });

    it('page 1 and page 2 do not overlap', () => {
      const page1 = taskService.getPaginated(1, 10);
      const page2 = taskService.getPaginated(2, 10);
      const ids1 = new Set(page1.map((t) => t.id));
      page2.forEach((t) => expect(ids1.has(t.id)).toBe(false));
    });

    it('covers all items across pages with no gaps (regression: was off-by-one)', () => {
      // Before fix, page=1 offset was 1*10=10, skipping the first 10 tasks
      const page1 = taskService.getPaginated(1, 10);
      const page2 = taskService.getPaginated(2, 10);
      expect(page1.length + page2.length).toBe(15);
    });
  });

  describe('update', () => {
    it('updates specified fields and leaves others intact', () => {
      const task = taskService.create({ title: 'Original', priority: 'low' });
      const updated = taskService.update(task.id, { title: 'Updated' });
      expect(updated.title).toBe('Updated');
      expect(updated.priority).toBe('low');
    });

    it('returns null for unknown id', () => {
      expect(taskService.update('ghost', { title: 'x' })).toBeNull();
    });
  });

  describe('remove', () => {
    it('removes an existing task and returns true', () => {
      const task = taskService.create({ title: 'Delete me' });
      expect(taskService.remove(task.id)).toBe(true);
      expect(taskService.findById(task.id)).toBeUndefined();
    });

    it('returns false for unknown id', () => {
      expect(taskService.remove('nope')).toBe(false);
    });
  });

  describe('completeTask', () => {
    it('sets status to done and sets completedAt', () => {
      const task = taskService.create({ title: 'Finish me', priority: 'high' });
      const completed = taskService.completeTask(task.id);
      expect(completed.status).toBe('done');
      expect(completed.completedAt).not.toBeNull();
    });

    it('preserves original priority (regression: was resetting to medium)', () => {
      // Before fix, completing a high-priority task would silently downgrade it
      const task = taskService.create({ title: 'Urgent', priority: 'high' });
      const completed = taskService.completeTask(task.id);
      expect(completed.priority).toBe('high');
    });

    it('returns null for unknown id', () => {
      expect(taskService.completeTask('ghost')).toBeNull();
    });
  });

  describe('getStats', () => {
    it('counts tasks by status correctly', () => {
      taskService.create({ title: 'A', status: 'todo' });
      taskService.create({ title: 'B', status: 'todo' });
      taskService.create({ title: 'C', status: 'in_progress' });
      taskService.create({ title: 'D', status: 'done' });

      const stats = taskService.getStats();
      expect(stats.todo).toBe(2);
      expect(stats.in_progress).toBe(1);
      expect(stats.done).toBe(1);
    });

    it('counts overdue tasks (past due date, not done)', () => {
      taskService.create({ title: 'Overdue', status: 'todo', dueDate: '2000-01-01T00:00:00.000Z' });
      taskService.create({ title: 'Done but past due', status: 'done', dueDate: '2000-01-01T00:00:00.000Z' });
      taskService.create({ title: 'Future', status: 'todo', dueDate: '2099-01-01T00:00:00.000Z' });

      const stats = taskService.getStats();
      expect(stats.overdue).toBe(1);
    });

    it('returns zeros for empty store', () => {
      expect(taskService.getStats()).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
    });
  });

  describe('assignTask', () => {
    it('assigns a task to a user', () => {
      const task = taskService.create({ title: 'Assign me' });
      const assigned = taskService.assignTask(task.id, 'Alice');
      expect(assigned.assignee).toBe('Alice');
    });

    it('returns null for unknown id', () => {
      expect(taskService.assignTask('ghost', 'Alice')).toBeNull();
    });

    it('overwrites a previous assignee', () => {
      const task = taskService.create({ title: 'Reassign' });
      taskService.assignTask(task.id, 'Alice');
      const reassigned = taskService.assignTask(task.id, 'Bob');
      expect(reassigned.assignee).toBe('Bob');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INTEGRATION TESTS — HTTP routes via Supertest
// ═══════════════════════════════════════════════════════════════════════════════

describe('POST /tasks', () => {
  it('creates a task with required title', async () => {
    const res = await createTask({ title: 'Hello' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.title).toBe('Hello');
  });

  it('returns 400 if title is missing', async () => {
    const res = await request(app).post('/tasks').send({ priority: 'low' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title/);
  });

  it('returns 400 if title is empty string', async () => {
    const res = await request(app).post('/tasks').send({ title: '   ' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid status', async () => {
    const res = await request(app).post('/tasks').send({ title: 'T', status: 'flying' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/status/);
  });

  it('returns 400 for invalid priority', async () => {
    const res = await request(app).post('/tasks').send({ title: 'T', priority: 'urgent' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/priority/);
  });

  it('returns 400 for invalid dueDate', async () => {
    const res = await request(app).post('/tasks').send({ title: 'T', dueDate: 'not-a-date' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/dueDate/);
  });
});

describe('GET /tasks', () => {
  it('returns empty array when no tasks', async () => {
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns all tasks', async () => {
    await createTask({ title: 'A' });
    await createTask({ title: 'B' });
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('filters by status', async () => {
    await createTask({ title: 'Todo', status: 'todo' });
    await createTask({ title: 'Done', status: 'done' });
    const res = await request(app).get('/tasks?status=todo');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Todo');
  });

  it('does not partially match status (regression)', async () => {
    await createTask({ title: 'In progress', status: 'in_progress' });
    const res = await request(app).get('/tasks?status=in');
    expect(res.body).toHaveLength(0);
  });

  it('paginates with page=1 returning the first page', async () => {
    for (let i = 0; i < 12; i++) await createTask({ title: `Task ${i}` });
    const res = await request(app).get('/tasks?page=1&limit=10');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(10);
  });

  it('page=2 returns remaining items', async () => {
    for (let i = 0; i < 12; i++) await createTask({ title: `Task ${i}` });
    const res = await request(app).get('/tasks?page=2&limit=10');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});

describe('GET /tasks/stats', () => {
  it('returns correct stats', async () => {
    await createTask({ title: 'A', status: 'todo' });
    await createTask({ title: 'B', status: 'in_progress' });
    await createTask({ title: 'C', status: 'done' });
    const res = await request(app).get('/tasks/stats');
    expect(res.status).toBe(200);
    expect(res.body.todo).toBe(1);
    expect(res.body.in_progress).toBe(1);
    expect(res.body.done).toBe(1);
    expect(res.body.overdue).toBeDefined();
  });

  it('counts overdue tasks', async () => {
    await createTask({ title: 'Overdue', status: 'todo', dueDate: '2000-01-01T00:00:00.000Z' });
    const res = await request(app).get('/tasks/stats');
    expect(res.body.overdue).toBe(1);
  });
});

describe('PUT /tasks/:id', () => {
  it('updates a task', async () => {
    const created = await createTask({ title: 'Old' });
    const res = await request(app)
      .put(`/tasks/${created.body.id}`)
      .send({ title: 'New', priority: 'low' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('New');
    expect(res.body.priority).toBe('low');
  });

  it('returns 404 for unknown task', async () => {
    const res = await request(app).put('/tasks/nonexistent').send({ title: 'X' });
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid status in update', async () => {
    const created = await createTask({ title: 'T' });
    const res = await request(app)
      .put(`/tasks/${created.body.id}`)
      .send({ status: 'flying' });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /tasks/:id', () => {
  it('deletes a task and returns 204', async () => {
    const created = await createTask({ title: 'Delete me' });
    const res = await request(app).delete(`/tasks/${created.body.id}`);
    expect(res.status).toBe(204);
  });

  it('returns 404 when task does not exist', async () => {
    const res = await request(app).delete('/tasks/ghost');
    expect(res.status).toBe(404);
  });

  it('task is actually gone after deletion', async () => {
    const created = await createTask({ title: 'Gone' });
    await request(app).delete(`/tasks/${created.body.id}`);
    const all = await request(app).get('/tasks');
    expect(all.body).toHaveLength(0);
  });
});

describe('PATCH /tasks/:id/complete', () => {
  it('marks a task as done', async () => {
    const created = await createTask({ title: 'Complete me' });
    const res = await request(app).patch(`/tasks/${created.body.id}/complete`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
    expect(res.body.completedAt).not.toBeNull();
  });

  it('preserves priority when completing (regression: was resetting to medium)', async () => {
    const created = await createTask({ title: 'Urgent', priority: 'high' });
    const res = await request(app).patch(`/tasks/${created.body.id}/complete`);
    expect(res.body.priority).toBe('high');
  });

  it('returns 404 for unknown task', async () => {
    const res = await request(app).patch('/tasks/ghost/complete');
    expect(res.status).toBe(404);
  });
});

describe('PATCH /tasks/:id/assign', () => {
  it('assigns a task to a user', async () => {
    const created = await createTask({ title: 'Assign me' });
    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: 'Alice' });
    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Alice');
  });

  it('returns 404 for unknown task', async () => {
    const res = await request(app)
      .patch('/tasks/ghost/assign')
      .send({ assignee: 'Alice' });
    expect(res.status).toBe(404);
  });

  it('returns 400 if assignee is missing', async () => {
    const created = await createTask({ title: 'T' });
    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/assignee/);
  });

  it('returns 400 if assignee is an empty string', async () => {
    const created = await createTask({ title: 'T' });
    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: '   ' });
    expect(res.status).toBe(400);
  });

  it('returns 400 if assignee is not a string', async () => {
    const created = await createTask({ title: 'T' });
    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: 42 });
    expect(res.status).toBe(400);
  });

  it('trims whitespace from assignee', async () => {
    const created = await createTask({ title: 'T' });
    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: '  Bob  ' });
    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Bob');
  });

  it('can reassign to a different user', async () => {
    const created = await createTask({ title: 'T' });
    await request(app).patch(`/tasks/${created.body.id}/assign`).send({ assignee: 'Alice' });
    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: 'Bob' });
    expect(res.body.assignee).toBe('Bob');
  });

  it('returns the full updated task object', async () => {
    const created = await createTask({ title: 'Full Task', priority: 'high' });
    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: 'Alice' });
    expect(res.body.id).toBe(created.body.id);
    expect(res.body.title).toBe('Full Task');
    expect(res.body.priority).toBe('high');
    expect(res.body.assignee).toBe('Alice');
  });
});
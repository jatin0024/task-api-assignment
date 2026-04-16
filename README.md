# Take-Home Assignment — The Untested API

A Node.js/Express Task Manager API — tested, debugged, and extended as part of a 2-day take-home assignment.

> **Submission by Jatin Agarwal**
> See [BUG_REPORT.md](./BUG_REPORT.md) and [SUBMISSION_NOTES.md](./SUBMISSION_NOTES.md) for full writeups.

---

## What was done

### ✅ Tests written — 58 tests, 95%+ coverage

Unit tests for every `taskService` function and integration tests (via Supertest) for every HTTP endpoint, including happy paths, edge cases, and regression tests for each bug found.

```
Tests:       58 passed, 58 total
Coverage:    95.42% statements | 100% on routes & services
```

### 🐛 3 Bugs found and fixed

| # | Bug | File | Fix |
|---|-----|------|-----|
| 1 | Pagination off-by-one — `page=1` skipped first 10 results | `taskService.js` | `page * limit` → `(page - 1) * limit` |
| 2 | Status filter used substring match — `status=in` matched `in_progress` | `taskService.js` | `.includes()` → strict `===` |
| 3 | Completing a task silently reset its priority to `'medium'` | `taskService.js` | Removed destructive `priority: 'medium'` overwrite |

See [BUG_REPORT.md](./BUG_REPORT.md) for full details on each bug.

### 🆕 New feature: `PATCH /tasks/:id/assign`

Assigns a task to a user by name. Validates that `assignee` is a non-empty string, trims whitespace, supports reassignment, and returns 404 for unknown tasks.

---

## Getting Started

**Prerequisites:** Node.js 18+

```bash
cd task-api
npm install
npm start        # runs on http://localhost:3000
```

**Tests:**

```bash
npm test           # run test suite
npm run coverage   # run with coverage report
```

---

## Project Structure

```
task-api/
  src/
    app.js                  # Express app setup
    routes/tasks.js         # Route handlers (+ /assign endpoint)
    services/taskService.js # Business logic + in-memory store (bugs fixed)
    utils/validators.js     # Input validation helpers
  tests/
    tasks.test.js           # Full test suite (58 tests)
  package.json
  jest.config.js
BUG_REPORT.md               # Bug writeups with root cause + fix
SUBMISSION_NOTES.md         # Reflection, questions, what I'd do next
ASSIGNMENT.md               # Original brief
```

> The data store is in-memory. It resets on every server restart.

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/tasks` | List all tasks. Supports `?status=`, `?page=`, `?limit=` |
| `POST` | `/tasks` | Create a new task |
| `PUT` | `/tasks/:id` | Update a task |
| `DELETE` | `/tasks/:id` | Delete a task (returns 204) |
| `PATCH` | `/tasks/:id/complete` | Mark a task as complete |
| `GET` | `/tasks/stats` | Counts by status + overdue count |
| `PATCH` | `/tasks/:id/assign` | Assign a task to a user ✨ new |

### Task shape

```json
{
  "id": "uuid",
  "title": "string",
  "description": "string",
  "status": "todo | in_progress | done",
  "priority": "low | medium | high",
  "dueDate": "ISO 8601 or null",
  "completedAt": "ISO 8601 or null",
  "assignee": "string or undefined",
  "createdAt": "ISO 8601"
}
```

### Sample requests

**Create a task**
```bash
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Write tests", "priority": "high"}'
```

**Filter by status**
```bash
curl "http://localhost:3000/tasks?status=todo&page=1&limit=10"
```

**Mark complete**
```bash
curl -X PATCH http://localhost:3000/tasks/<id>/complete
```

**Assign a task**
```bash
curl -X PATCH http://localhost:3000/tasks/<id>/assign \
  -H "Content-Type: application/json" \
  -d '{"assignee": "Alice"}'
```

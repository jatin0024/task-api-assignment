# Bug Report

## Bug 1 — `getPaginated`: Off-by-one in page offset (FIXED)

**File:** `src/services/taskService.js`, `getPaginated()`

**Expected behavior:**  
`GET /tasks?page=1&limit=10` should return the first 10 tasks.

**Actual behavior:**  
`page=1` returns tasks 11–20 (skipping the entire first page). `page=0` would be needed to see the first page, which is non-standard and unintuitive.

**Root cause:**  
```js
// Before fix
const offset = page * limit;   // page=1 → offset=10 → skips first 10 items
```

The standard convention is that page 1 is the first page, so the offset should be `(page - 1) * limit`.

**Fix applied:**  
```js
const offset = (page - 1) * limit;
```

**How discovered:**I wrote a pagination test seeding 12 tasks and asserting that `page=1&limit=10` returns 10 items and `page=2` returns 2. Both failed before the fix.

---

## Bug 2 — `getByStatus`: Partial string match on status (FIXED)

**File:** `src/services/taskService.js`, `getByStatus()`

**Expected behavior:**  
`GET /tasks?status=in_progress` should return only tasks whose status is exactly `"in_progress"`.

**Actual behavior:**  
A query of `status=in` matches tasks with `in_progress` status. A query of `status=todo` also accidentally matches if any future status contained the substring `"todo"`.

**Root cause:**  
```js
// Before fix
tasks.filter((t) => t.status.includes(status))
```
`.includes()` on a string does a substring search, not an equality check.

**Fix applied:**  
```js
tasks.filter((t) => t.status === status)
```

**How discovered:** Test asserted that filtering by `"in"` returns 0 results when only `"in_progress"` tasks exist. The test failed before the fix.

---

## Bug 3 — `completeTask`: Silently resets task priority to `'medium'` (FIXED)

**File:** `src/services/taskService.js`, `completeTask()`

**Expected behavior:**  
Marking a task as complete should update `status` to `'done'` and set `completedAt`. The task's `priority` should be unchanged.

**Actual behavior:**  
Completing any task — regardless of its original priority — resets `priority` to `'medium'`. A `high`-priority task that gets completed will permanently show `priority: 'medium'`.

**Root cause:**  
```js
// Before fix
const updated = {
  ...task,
  priority: 'medium',  // ← destructive, always overwrites
  status: 'done',
  completedAt: new Date().toISOString(),
};
```
This looks like an unintentional leftover from a default value or copy-paste error.

**Fix applied:** Removed the `priority: 'medium'` line. The spread `...task` already preserves the original priority.

**How discovered:** Created a `high` priority task, called complete, and asserted `priority` was still `'high'`. Test failed before the fix.

---

## Bug 4 — `getPaginated`: Default page value inconsistency (no fix needed, noted)

**File:** `src/routes/tasks.js`

**Observed:**  
When only `page` is passed without a value (or `NaN`), the route defaults it to `1`:
```js
const pageNum = parseInt(page) || 1;
```
This is now correct after fixing Bug 1. However, if only `limit` is provided without `page`, it also defaults `pageNum` to `1`, which is reasonable. No change needed.

---

## Summary

| # | Bug | Severity | Status |
|---|-----|----------|--------|
| 1 | Pagination off-by-one (`page * limit` → should be `(page-1) * limit`) | High |  Fixed |
| 2 | Status filter uses substring match instead of equality | Medium |  Fixed |
| 3 | `completeTask` silently resets `priority` to `'medium'` | Medium |  Fixed |
| 4 | Minor: default page/limit edge cases | Low | Noted, no fix needed |

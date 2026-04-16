# Submission Notes

## What I'd test next if I had more time

- **Concurrent mutation safety:** The in-memory store uses a plain array. If multiple requests modified the array simultaneously (e.g., two deletes of the same ID), you could get subtle race conditions. Worth testing with concurrent requests via `Promise.all`.
- **`PUT /tasks/:id` as a "full" update:** Currently it merges fields rather than replacing the whole task. If this is meant to be a true `PUT` (full replacement), any field not supplied should probably revert to its default — the current behavior is closer to `PATCH`. I'd want to clarify the contract and test accordingly.
- **Stats with tasks having no `dueDate`:** Already passes, but I'd add more edge cases: task with `dueDate` exactly at "now", tasks in `in_progress` that are overdue, etc.
- **Validators coverage:** The `validators.js` uncovered lines (22, 28, 31) are the `dueDate` and `priority` validation branches in `validateUpdateTask`. I'd add tests for those specific code paths.
- **Ordering/sorting:** `GET /tasks` has no defined sort order. Tasks come back in insertion order. I'd want to test whether that's guaranteed, and possibly add `?sort=` support.

## Anything that surprised me in the codebase

1. **`completeTask` resetting priority** was the most surprising bug — it looked intentional at first glance but makes no semantic sense. Completing a task shouldn't change its urgency level. It's the kind of bug that would be invisible without tests because it doesn't crash anything.

2. **`getByStatus` using `.includes()`** — at first I thought this might be intentional ("fuzzy search"), but the route accepts it as a filter parameter with no documentation of partial-match behavior, so it's almost certainly unintentional. A query for `status=in` is ambiguous and would confuse API consumers.

3. **Pagination starting at page `0`** (before the fix) is the kind of off-by-one that's easy to miss in manual testing since most testers start with `page=1`. The first page of data was silently unreachable through the documented interface.

## Questions I'd ask before shipping to production

1. **Authentication/authorization:** Who can see, edit, or delete tasks? Is there any concept of ownership or team scoping? The assign feature assumes a free-text name string — should it validate against a real user list?

2. **Persistence:** The in-memory store resets on restart. Is there a database migration plan? What's the durability contract for users?

3. **`PUT` vs `PATCH` semantics:** `PUT /tasks/:id` currently acts as a partial update (merge). True `PUT` should replace the whole resource. Which behavior is intended?

4. **Status transition rules:** Should a `done` task be allowed to move back to `todo`? Should a task be assignable after it's `done`? Are there any invalid state transitions that should be enforced?

5. **Pagination total count:** Clients can't build "page X of Y" UI without knowing the total number of items. Should `GET /tasks` return pagination metadata (total count, total pages) alongside the results?

# Sprint 7 QA Checklist

Use this checklist before merging or demonstrating the Sprint 7 branch.

## Citizen Workflow

- Register a new citizen and confirm ward selection is persisted.
- Log in, log out, and restore a saved session.
- Request forgot-password and reset-password flows.
- Create a complaint with zero, one, and multiple valid images.
- Confirm invalid image types and oversized images return clear errors.
- Submit a complaint and verify AI analysis is queued.
- Browse, search, filter, follow, upvote, comment, and rate a resolved complaint.
- Confirm profile, notification preferences, leaderboard, badges, and stats use API responses.

## Officer Workflow

- Log in as officer, supervisor, and administrator.
- Verify dashboard KPI cards and widgets refresh from APIs.
- Search, filter, sort, paginate, and open the complaint queue.
- Assign, reassign, remove assignment, update status, change priority, change department, resolve, reject, and reopen.
- Add/edit/delete own internal notes and official responses.
- Confirm analytics filters change chart data.
- Warn, suspend/ban, and unban citizens with role restrictions.
- Update settings, notification preferences, password, sessions, and escalation rules.

## Realtime

- Open citizen and officer sessions at the same time.
- Confirm new complaints update officer queues without manual refresh.
- Confirm status changes, official responses, comments, notifications, assignments, and resolutions trigger live refresh.
- Disconnect and reconnect the browser, then verify REST refresh still works.

## Release Readiness

- Run `npm run typecheck`.
- Run `npm test`.
- Start API and Expo web, then verify no startup console errors.
- Confirm protected routes reject unauthenticated requests.
- Confirm role-restricted officer/admin actions return `403`.
- Confirm health endpoints return `ok`.

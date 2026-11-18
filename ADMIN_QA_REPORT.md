# Admin Console QA Report

Date: 2026-11-18

Scope: administrator dashboard only (UI + `/api/admin/*`). The API was run
against the local PostgreSQL database, the seeded administrator was used to
sign in, and every admin page was opened in the browser.

## What was verified

- Local admin sign-in (`/admin/login`, `POST /api/auth/admin/login`) and
  admin-only route protection.
- Every admin page in `apps/web/src/app/router.tsx` (31 routes, including group
  detail tabs) renders with API data and no browser console errors.
- Every admin endpoint in `apps/api/src/admin/**/*.controller.ts` returns a
  successful response; 129/129 checks in `test-admin-api.mjs` pass.
- Create/update/delete flows for businesses, programmes, campaigns,
  relationships, groups, members, membership plans, rewards/deals, locations,
  report schedules, content and configuration.
- Invitation approve/decline/cancel, moderation approve/reject, and contribution
  updates persist and are reflected in subsequent reads.
- Anonymous requests to `/api/admin/*` are rejected.

## Defects found and fixed

### Fabricated data removed

- `GET /admin/groups/:id/contribution` invented `paid`/`pending`/`overdue`
  states from array indexes. Contribution state is now stored on
  `group_members` (`contribution_status`, `contribution_paid_at`) and the ledger
  is computed from those real values.
- Added `PATCH /admin/groups/:id/members/:memberId/contribution`; the admin
  "Mark Paid" action now persists instead of only changing local React state.
- Removed the fake contribution payout/collection text and the hardcoded
  "Next payout scheduled: 1st November 2026".
- Removed the hash-based "Online Now" presence from the circle visualisation;
  no presence API exists.
- The completeness/sign-off checks are now computed from configuration and
  record counts instead of always reporting "Verified".

### Broken or non-persisting actions

- Invitation approval now:
  - only works on pending invitations (409 otherwise),
  - creates the `GroupMember` record and increments `member_count`,
  - cancels duplicate pending invitations for the same group/invitee.
- Invitation cancellation is guarded to pending invitations.
- Moderation approve/reject only works from `Pending Review` (409 otherwise) and
  records `group-rejected` rather than pretending the group was closed.
- Group access-rules save no longer overwrites `partnerDefaults`.
- Numeric partner permissions are editable on both Permissions and Partners
  pages (previously the click re-sent the old value).
- Users page uses the API's real `status`/`verified` fields instead of forcing
  every account to Active/Verified.
- Group members page uses `/members` for join dates and stored contribution
  state instead of showing the group creation date for everyone and assuming
  unpaid members are paid.
- Moderation page and group detail banner call the real
  `approve/reject` endpoints.
- Rewards create form has a real expiry date field (previous hardcoded
  `2026-12-31`); reward stats come from `/admin/rewards-deals/stats`.
- Overview and settings/report metrics use `/admin/overview` and
  `/admin/settings-reports` instead of re-deriving or hardcoding values.
- Group creation now respects draft/active and passes target size.
- CSV export buttons on the group reports tab now produce real CSV files.
- All admin pages set a page-specific document title; the sidebar now links the
  previously orphaned admin routes.

### Database performance / N+1 / caching

- Removed whole-table loads used only to count members; `member_count` and
  database aggregates are used instead.
- Group list filters and audit-log/campaign/invitation filters now run in SQL
  instead of loading a whole table and filtering in memory.
- Group relationships only load the three referenced relationship rows.
- User registration de-duplication changed from O(n²) to a `Set`.
- Overview, group report and settings report now use `count`/`groupBy`/
  `aggregate` instead of loading entire tables.
- Content defaults are seeded once with `createMany(skipDuplicates)` instead of
  eight sequential upserts on every content request; publish-all is a single
  transaction.
- Admin configuration is created with an atomic `upsert` and cached for 30
  seconds; the cache is invalidated on every patch.
- `getConfig` no longer loads the newest 50 audit rows on every config read.
- Empty/unknown config patches are rejected with 400.
- Added composite indexes for the admin list/sort paths (`groups`,
  `group_members`, `group_activities`, `invitations`, `audit_log`,
  `businesses`, `partners`, `reward_deals`, `campaigns`,
  `platform_accounts`, `report_schedules`).
- Added `GET /admin/circles` so the Mandatory Circles page and circle-type
  in-use guard read real group/business circles.

### Verification tooling

- `test-admin-api.mjs` was rewritten to create its own fixtures and clean them
  up. It no longer depends on demo ids such as `cons-liam` or `inv-002`, and it
  now covers the contribution, circle, moderation, and user status endpoints.

## Known scope limits (not simulated)

- The eligibility section of the group access-rules tab is documentation only;
  there is no persistence model for those criteria, so the UI no longer shows a
  fake "saved" toast.
- Partner financial rules remain an explicit specification placeholder.
- There is no payment gateway or notification worker in this repo, so
  contributions are administrator-recorded and the "Remind" action was removed
  rather than pretending a reminder was sent.
- Pre-existing lint errors in non-admin pages are outside this pass.

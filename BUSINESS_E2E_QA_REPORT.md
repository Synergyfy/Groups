# Business Dashboard E2E QA — 2026-11-18

Scope: Central Hub account creation → Groups SSO → `/business/*` dashboard,
multi-business interaction flows, and API/frontend correctness.

Environment:

- Web: http://localhost:4088
- Groups API: http://localhost:4089/api
- Central Hub frontend: http://localhost:3000 (started for this pass)
- Central Hub backend: http://localhost:3010
- Database: local PostgreSQL (`247gbs_groups`, `mcom_solutions`)

No Central Hub source code was changed. Central Hub backend was restarted once
from its existing `dist` build after it stopped accepting connections.

## Accounts created through Central Hub

All created with `POST /api/v1/auth/register` (`role: BUSINESS`) and then signed
in through real MCOM SSO on `/login`.

| Business | Email | Password | Membership chosen in Groups |
| --- | --- | --- | --- |
| Aurora Coffee Co | aurora.coffee.qa@mcomtest.co.uk | QaPass2026! | Platinum Pro+ |
| Brightwave Marketing | brightwave.qa@mcomtest.co.uk | QaPass2026! | Gold Pro+ |
| Cedar Fitness Studio | cedar.fitness.qa@mcomtest.co.uk | QaPass2026! | Bronze Pro |
| Harbour Legal Partners | harbour.legal.qa@mcomtest.co.uk | QaPass2026! | Silver Pro |

## Flows exercised

### Authentication / onboarding

- Central Hub email + password sign-in through the Groups `/login` SSO redirect.
- First Groups sign-in upserts the local business, creates the business and
  membership records, and records the chosen membership tier.
- Paid Access Agreement gate: plan selection, agreement checkbox, activation,
  and access expiry/quota display on Account Settings.
- Sign-out and account switching across all four businesses.

### Group creation

- Required group wizard end-to-end: Free/Paid → Type → Details → Rules → Review.
- Created free **Marketing** (request access), free **Advertising** (open),
  and paid **Partner** (£50 monthly, invitation-only).
- Required-group enforcement blocked other types until Marketing, Advertising
  and Partner existed; unlocked **B2B** and **Event / Expo** afterwards.
- Created B2B with `eligibility` access and Event / Expo with £15 one-off,
  open access.
- Non-Platinum memberships are correctly blocked from the wizard.

### Cross-business interaction

- Brightwave joined Aurora's open Advertising group instantly.
- Brightwave requested Aurora Marketing; Aurora approved it.
- Aurora invited Brightwave to the paid Partner group from the directory; the
  invitation appeared in Brightwave's inbox, the review page showed the £50
  monthly contribution, and acceptance added the member.
- Brightwave left the Partner group; owner counts and activity updated.
- Aurora removed Brightwave from Marketing; member list and counts updated.
- Cedar received an email-only invitation to Advertising, saw it in the inbox,
  opened the review page, accepted it, and joined.
- Cedar requested Marketing and B2B; Aurora accepted Marketing and declined B2B.
- Harbour joined Advertising instantly and requested B2B; Aurora accepted.
- Cedar joined the paid open Event / Expo group instantly; member contribution
  status is tracked as pending.

### Invitations / requests

- Inbox tabs: Incoming, Outgoing, My requests, and the new **Requests to join**
  owner inbox.
- Email-only invitations are visible to the matching signed-in business.
- Owner can accept/decline join requests from both the group Invitations tab and
  the global invitation inbox.
- Directory invitations, email invitations and join requests all recorded in
  group activity.

### Groups, network, circles, settings

- My Groups counts and `/created`, `/joined` lists.
- Explore search/filters, membership state, paid contribution badge, and
  eligibility label.
- Group overview, members, activity, invitations and settings tabs.
- Group status/stage changes persisted; stage can be cleared again.
- My Network: created a B2B list, added a pending contact, created a Nearby
  circle from the list, edited its duration/interaction/visibility, and added a
  second contact to the circle.
- Account Settings saved city/local area/category and persisted.
- Location hierarchy, National Community, Campaigns, Rewards and Journey pages
  render without console errors.

## Defects found and fixed

1. **Owner join requests were invisible outside each group page.**
   The API already exposed an `owner-requests` view and `openRequests` count,
   but the global Invitations inbox had no tab for them and the dashboard badge
   ignored them.
   - Added a **Requests to join** inbox tab with Accept/Decline/View group.
   - Dashboard Invitations badge now includes owner requests.
   - Files: `features/invitations/InvitationsInboxPage.tsx`,
     `features/groups/GroupsOverviewPage.tsx`.

2. **Email-only invitations were invisible to the recipient and blocked on the
   review page.**
   The API mapped them correctly, but the UI filtered on `inviteeId` only.
   - Inbox now matches `inviteeId` or the signed-in business email.
   - Invitation review page uses the same email match.
   - Invitation detail page trusts the server's `canRespond`.
   - Files: `InvitationsInboxPage.tsx`, `InvitationReviewPage.tsx`,
     `InvitationDetailPage.tsx`.

3. **Activation threshold used the viewer's membership on the members endpoint.**
   A Bronze/Silver/Gold member viewing a Platinum owner's group saw the wrong
   recruitment target and active state.
   - `getMembers` and the open-join response now resolve the owner's membership,
     consistent with the group detail endpoint.
   - Files: `business/groups/business-groups.service.ts`.

4. **Existing members could be invited again (API).**
   Directory UI filtered them out, but direct API calls created pending
   invitations for members/owners.
   - Invites now skip existing members and owners and report `skipped`.
   - File: `business/groups/business-groups.service.ts`.

5. **Group stage could never be cleared.**
   The UI sent `undefined` for "No stage", so the backend kept the old value.
   - UI sends the empty value; backend stores `null`.
   - Files: `GroupSettingsPage.tsx`, `business-groups.service.ts`.

6. **Members page flashed raw business UUIDs while loading.**
   It rendered a directory fallback from `memberIds` before the API response.
   - Shows a skeleton until the member response arrives.
   - File: `GroupMembersPage.tsx`.

7. **Join actions were offered for closed/suspended groups.**
   The backend rejected the join, but the UI still showed the action.
   - Join plans now return "Group closed" for `Closed`/`Suspended`.
   - Files: `business/business.rules.ts`, `ExploreGroupsPage.tsx`,
     `GroupDetailsPage.tsx`.

8. **Paid groups did not show their contribution in the Explore list.**
   - Added the contribution badge (e.g. `£50 monthly per member`) to group list
     items. File: `GroupListItem.tsx`.

9. **Eligibility groups were labelled "Request to join".**
   - Explore now shows "Check eligibility", matching the backend join plan.
   - File: `ExploreGroupsPage.tsx`.

10. **Directory invitations displayed raw UUIDs.**
    - Invitee subtitle now shows the email or "Business directory"; the group
      invitations request buttons have accessible labels.
    - File: `GroupInvitationsPage.tsx`.

## Configuration / test data changes

- Seeded three location cities and nine local areas (Birmingham, Manchester,
  London) because the Groups DB location catalogue was empty; this enables the
  Account Settings city/area selectors, My Location and city/area filters.
- Updated `sso_clients` for `mcom-group` in the Central Hub DB to match
  `Groups/.env`: service scopes, allowed audiences, allowed callers and
  service base URL. This makes `pnpm mcom:smoke` pass and registers the app in
  the ecosystem directory.
- Test businesses, groups, invitations, network list/contact, circle and
  activity remain in the database for inspection.

## Verification

- `pnpm --filter @247gbs/web typecheck` — pass
- `pnpm --filter @247gbs/api typecheck` — pass
- `pnpm --filter @247gbs/api build` — pass; API restarted from `dist`
- `pnpm mcom:smoke` — pass (discovery, RS256 service token, 9 peers)
- Browser console error sweep over Groups overview, Mine, Explore, Invitations,
  Circles, members, settings and Account Settings — no console errors
- API health: `{"status":"ok","database":"up"}`

## Remaining notes

- The Central Hub frontend on port 3000 was not running at the start; it was
  started for this pass. The Central Hub backend was restarted once after it
  stopped listening.
- Inbound service-to-service calls to `/api/mcom/service/health` were not
  exercised with a peer credential, because the other apps' client secrets are
  not available in this repo. The registry entry and caller allow-list are now
  configured.
- All testing used synthetic QA accounts and test data.

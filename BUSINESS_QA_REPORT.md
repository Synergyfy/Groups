# Business Dashboard QA Report

Date: 2026-11-18

Scope: business dashboard (`/business/*`) and the business ↔ business flows in
the Groups app. Sign-in and sign-up were exercised through the running MCOM
Central Hub SSO, not through local business credentials.

No code changes were made to the Central Hub Solution (MCOM) repository. MCOM
was only used as the identity provider; its backend was restarted from its
existing `dist` build after it had stopped accepting connections.

## Accounts used

Seeded MCOM business accounts (real SSO accounts, not local Groups accounts):

- Global Retailers Ltd — `contact@globalretailers.com` (Gold Pro+ initially)
- Eco Market — `info@ecomarket.co.uk` (Silver)

## Flows tested

### Authentication and registration

- `/login` exposes only **Continue with MCOM Central Hub** for businesses.
- `/register` now redirects to MCOM business onboarding
  (`/getstarted/business` with the Groups client/redirect/state), replacing the
  previous fake sign-up simulation.
- Admin SSO does not enter the Groups business dashboard; administrators remain
  on the local `/admin/login` flow.
- A business visiting `/admin/overview` is redirected back to `/business/groups`.

### Plan purchase / paid access

- Global Retailers was gated by the paid-access agreement and bought
  **Gold Standard** through the UI (£25 90-day access fee + plan).
- It was then upgraded to **Platinum Pro+**, which unlocked group creation.
- Eco Market bought **Silver Pro** through the same agreement flow.
- Membership values, quotas and access expiry persisted and were shown on
  Account Settings.

### Group creation wizard

- Free/paid → type → details → rules → review was completed through the UI.
- Marketing and Advertising were created as free groups.
- Partner was forced to paid by admin rules and created at **£50 monthly**.
- Required groups blocked creation of other group types until all three
  existed.
- Paid group pricing and frequency appeared correctly on the review and group
  pages.

### Group dashboard pages

Verified with live data and no browser console errors:

- `/business/groups`
- `/business/groups/mine`, `/mine/created`, `/mine/joined`
- `/business/groups/network`
- `/business/groups/explore`
- group overview / members / activity / invitations / settings
- `/business/groups/create` and `/business/groups/create/success`

### Cross-business interaction

- Eco Market discovered Global Retailers' three groups in Explore and sent a
  join request to the Marketing group.
- Global Retailers saw the pending request and approved it; Eco Market became a
  member, counts and activity updated.
- Global Retailers invited Eco Market to the Advertising group.
- Eco Market's invitation inbox showed the invitation, the review page worked,
  and accepting it added Eco Market as a member.
- Global Retailers removed Eco Market from the Marketing group from the member
  roster.
- Eco Market left the Advertising group from group settings; membership and
  counts updated.
- Group activity recorded request, join, invitation and leave events.

### Network lists and circles

- Created a My Network list ("Birmingham Retailers").
- Added a contact (pending confirmation) and it appeared with the real contact
  count.
- Created a Marketing circle from that list and opened the circle workspace.

### Settings

- Business account settings saved category and returned the updated profile.
- Group settings saved status and stage; closing and reopening the group
  persisted.

## Defects found and fixed in the Groups repo

1. **Invitations never appeared in the recipient inbox.**
   `direction` was stored from the sender's perspective and returned unchanged
   to the recipient. Invitations now map to the viewer's perspective
   (`incoming` for the invitee, including email-only invitations), and the
   dashboard pending-invite count no longer filters on the raw direction.

2. **Circle workspace crashed after creation.**
   Circle detail source lists omitted `contactIds`, which `StatsPanel` read
   directly. The API now returns the real contact count and the panel treats it
   safely.

3. **Fake online presence in business group views.**
   Members were marked online/offline from a hash of their id. Business group
   circle, member search and detail views now only mark the signed-in account
   as online; other members show as normal members.

4. **Group activation threshold used the viewer's plan.**
   When a non-owner opened a group, activation could use the viewer's membership
   (or a hardcoded `Standard` variant). It now resolves the group owner's actual
   membership tier and variant.

5. **Fake business sign-up.**
   `/register` used a timer and displayed "Account created successfully" without
   creating anything. It now redirects into real MCOM business onboarding with
   the SSO continuation parameters.

## Test data

The QA businesses, groups, plan purchases, network list/contact and circle
created during this pass are still present so the flows can be inspected. They
are all named `Global Retailers …`, `Eco …`, `Birmingham Retailers`, etc.

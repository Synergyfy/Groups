# 247GBS Groups

Monorepo for the 247 GBS Groups product, managed with **pnpm workspaces** and **Turborepo**.

## Workspace layout

```
apps/
  api/   NestJS + Prisma API (PostgreSQL)
  web/   React + Vite front end
```

## Requirements

- Node.js >= 22.12
- pnpm 12+
- PostgreSQL running locally

## Setup

```bash
pnpm install
```

### Environment

Copy the example env file and point it at your local PostgreSQL instance:

```bash
cp .env.example .env
```

The file configures both apps:

```dotenv
DATABASE_URL="postgresql://postgres:password@localhost:5432/247gbs_groups?schema=public"

API_PORT=4089
CORS_ORIGIN="http://localhost:4088"

WEB_PORT=4088
# Optional: override the API target used by the Vite dev proxy.
# API_TARGET="http://localhost:4089"

AUTH_JWT_SECRET="replace-with-a-long-random-secret"
ADMIN_EMAIL="admin@centralhubsolution.com"
ADMIN_PASSWORD="change-this-admin-password"

MCOM_SOLUTIONS_URL="http://localhost:3010"
MCOM_CLIENT_ID="mcom-group"
MCOM_CLIENT_SECRET="..."
MCOM_HMAC_SECRET="..."
MCOM_WEBHOOK_SECRET="..."
MCOM_PAY_ENABLED="true"
MCOM_REDIRECT_URI="http://localhost:4088/auth/callback"
MCOM_SCOPES="profile email business membership packages"

WEB_PUBLIC_URL="http://localhost:4088"
VITE_STRIPE_PUBLISHABLE_KEY="pk_test_..."
VITE_MCOM_WALLET_TOPUP_URL="http://localhost:3010/dashboard/wallet"
```

### MCOM Pay

Plan access and paid-group contributions are collected through **MCOM Pay**
(Stripe, PayPal or the MCOM Wallet) using the partner API on Central Hub.

- `MCOM_HMAC_SECRET` and `MCOM_WEBHOOK_SECRET` come from the app's entry in
  **MCOM Console**.
- Register the webhook URL in the Console:
  `http://localhost:4089/api/payments/webhook/mcom` (use a tunnel outside
  localhost).
- `VITE_STRIPE_PUBLISHABLE_KEY` must belong to the same Stripe account as
  Central Hub's secret key. Card payments cannot load without it.
- `MCOM_PAY_ENABLED=false` keeps the legacy free plan activation path for local
  development only.
- Plan prices, group contributions and payment amounts are stored as integer
  pence. The admin plan form accepts pounds and the API converts to pence.

Create the database if it does not exist:

```bash
createdb -h localhost -U postgres 247gbs_groups
```

Then apply the schema and create only the administrator configured by
`ADMIN_EMAIL` and `ADMIN_PASSWORD`:

```bash
pnpm db:migrate
pnpm db:seed
```

## Development

Run both apps:

```bash
pnpm dev
```

Or run them individually:

```bash
pnpm dev:web
pnpm dev:api
```

- Web: http://localhost:4088
- API: http://localhost:4089/api
- Health check: http://localhost:4089/api/health

Vite proxies `/api` requests to the API on port 4089. Both ports come from the
root `.env` file (`WEB_PORT` and `API_PORT`).

## Authentication & dashboard roles

- **Business, consumer, agent, consultant, account-manager and partner accounts** sign in through MCOM Solutions Central Hub SSO at `/login`.
- **Administrators** use the separate local login at `/admin/login`. Administrator accounts are stored in the database and seeded from `ADMIN_EMAIL` / `ADMIN_PASSWORD` by `pnpm db:seed`. After changing either value, run `pnpm db:seed` again. Administrators do not use Central Hub SSO.
- Dashboard routes are role-gated:
  - `/admin/*` → `ADMIN`
  - `/business/*` → `BUSINESS`
  - `/consumer/*` → `CUSTOMER` (and Central Hub agent/partner roles)
  - `/participant/*` → invited-business participant sessions
- Opening another role's dashboard redirects the user back to their own dashboard. Unauthenticated visitors are sent to the matching login page.

The SSO callback is handled by `/auth/callback` in the web app, which exchanges the code with the API at `POST /api/auth/mcom/callback`.

### Development entitlement bypass

`MCOM_ENFORCE_ENTITLEMENTS` controls whether the API enforces Central Hub's
`entitlement.access.hasAccess` verdict.

```dotenv
# Strict (production): reject users Central Hub says are not entitled
MCOM_ENFORCE_ENTITLEMENTS=true

# Development: allow any successfully authenticated Central Hub user
MCOM_ENFORCE_ENTITLEMENTS=false
```

When set to `false`, the entitlement and white-label gates are skipped, but
Central Hub administrators are still required to use `/admin/login`.
`.env.example` defaults to `true`; keep it `true` in production.

### Central Hub membership, access pass and trial access

A business can reach this dashboard through any of the three Central Hub access
models. Central Hub is the source of truth; the Groups app mirrors the verdict:

| Access model | `accessSource` | Local plan treatment |
| --- | --- | --- |
| Membership bundling a Groups plan | `membership` | Active, paid; expiry follows the membership |
| Central Hub access pass | `access_pass` | Active, paid; `accessExpiresAt` = pass expiry |
| Dashboard access / trial | `trial` | Active, unpaid; `accessExpiresAt` = trial expiry |
| Locally purchased plan | `local` | Existing plan/payment rules apply |

- The SSO token response and `GET /api/v1/auth/sso/entitlement` are read through
  `decideAccess()` (`apps/api/src/auth/entitlement-access.ts`), which applies
  the published priority order and rejects expired plans even when
  `access.hasAccess` is still cached as true.
- `BusinessContextService.resolve()` provisions or revokes the local
  `BusinessPlan` row (`accessSource`, `externalPlanId`, `membershipName`,
  `accessExpiresAt`, `programmeTasks`, `centralQuotas`). `plan.planId` is mapped
  to a published local plan when the IDs match, otherwise to the plan name.
- The entitlement is revalidated at most every five minutes using
  `MCOM_API_KEY` (`GET /api/v1/auth/sso/entitlement`). Set the key or background
  revalidation is skipped.
- `BusinessAccessGuard` and `BusinessLayout` treat a Central Hub grant as
  covering the local access fee and agreement. Denials carry the Central Hub
  `reason` and `upgradeUrl` so the UI can send the business back to
  Central Hub.
- Trial programme tasks returned in `trialContext.programmeTasks` are shown on
  the plan page with the remaining days.
- Local plan purchases are disabled while a Central Hub grant is active,
  because Central Hub takes priority and would overwrite the local plan on the
  next revalidation.

Plan/access-pass IDs should be stable and published in the local catalogue
(`/admin/plans`). A Central Hub plan whose ID matches a local plan inherits that
plan's name, variant, quotas and group-creation rights.

### Central Hub mesh smoke test

```bash
node --env-file=.env test-mcom-mesh.mjs
```

Outbound mesh access is deny-by-default. If the service-token request returns
`403`, configure the app's allowed audiences/scopes in **MCOM Console → Service
Mesh Policy** first.

## Useful scripts

| Command            | Description                                  |
| ------------------ | -------------------------------------------- |
| `pnpm build`       | Build all apps with Turborepo                |
| `pnpm typecheck`   | Type-check all apps                          |
| `pnpm lint`        | Lint all apps                                |
| `pnpm test`        | Run the web smoke tests                      |
| `pnpm db:generate` | Generate the Prisma client                   |
| `pnpm db:migrate`  | Create/apply migrations in development       |
| `pnpm db:deploy`   | Apply committed migrations in production     |
| `pnpm db:seed`     | Create the configured administrator only     |
| `pnpm db:studio`   | Open Prisma Studio                           |
| `pnpm mcom:smoke`  | Run the Central Hub mesh/auth smoke test      |

## API

The API is a NestJS application using Prisma 7 with the PostgreSQL driver adapter.

| Method   | Route                          | Description                             |
| -------- | ------------------------------ | --------------------------------------- |
| `GET`    | `/api/health`                  | Health check, including DB status       |
| `GET`    | `/api/auth/mcom/login`         | Start Central Hub SSO                   |
| `POST`   | `/api/auth/mcom/callback`      | Exchange SSO code and create session    |
| `POST`   | `/api/auth/admin/login`        | Local administrator sign-in             |
| `GET`    | `/api/auth/me`                 | Current session user                    |
| `POST`   | `/api/auth/logout`             | Clear the session cookie                |
| `GET`    | `/api/mcom/discovery`          | Central Hub discovery document          |
| `GET`    | `/api/mcom/services`           | Ecosystem peer registry                 |
| `GET`    | `/api/mcom/service/health`     | Inbound mesh-protected health endpoint  |
| `GET`    | `/api/groups`                  | List groups (`?visibility=PUBLIC`)      |
| `GET`    | `/api/groups/:id`              | Get a group                             |
| `POST`   | `/api/groups`                  | Create a group                          |
| `PATCH`  | `/api/groups/:id`              | Update a group                          |
| `DELETE` | `/api/groups/:id`              | Delete a group                          |

Prisma schema: `apps/api/prisma/schema.prisma`.

## Consumer API

Consumer dashboard data is persisted in PostgreSQL and requires a signed-in
`CUSTOMER` session.

| Area | Endpoints |
| ---- | --------- |
| Profile and dashboard | `GET /api/consumer/profile`, `GET /api/consumer/dashboard` |
| Groups | `GET /api/consumer/groups`, `GET /api/consumer/groups/explore`, `GET /api/consumer/groups/:id`, `PATCH /api/consumer/groups/:id/join`, `DELETE /api/consumer/groups/:id/leave` |
| Invitations | `GET /api/consumer/invitations`, `PATCH /api/consumer/invitations/:id/respond` |

## Admin console API

Every admin dashboard page is backed by `/api/admin/*`. All routes require an
administrator session (`JwtAuthGuard` + `ADMIN` role check); anonymous requests
receive `401`, non-admin sessions `403`.

| Area | Endpoints |
| ---- | --------- |
| Overview | `GET /api/admin/overview` |
| Users | `GET /api/admin/users`, `GET /api/admin/users/registrations`, `GET/PATCH /api/admin/users/:id`, `POST /api/admin/users/:id/suspend\|activate` |
| Groups | `GET/POST /api/admin/groups`, `GET /api/admin/groups/dashboard`, `GET /api/admin/groups/hub`, `GET/PATCH/DELETE /api/admin/groups/:id`, `POST /api/admin/groups/:id/approve\|suspend\|close`, `GET /api/admin/circles` |
| Group detail tabs | `GET/POST /api/admin/groups/:id/members`, `DELETE /api/admin/groups/:id/members/:memberId`, `PATCH /api/admin/groups/:id/members/:memberId/contribution`, `GET /api/admin/groups/:id/activity`, `GET/PATCH /api/admin/groups/:id/relationships`, `GET /api/admin/groups/:id/contribution`, `GET /api/admin/groups/:id/circles`, `GET /api/admin/groups/:id/invitations` |
| Businesses | `GET/POST /api/admin/businesses`, `GET/PATCH/DELETE /api/admin/businesses/:id`, `POST /api/admin/businesses/:id/verify\|suspend` |
| Partners | `GET/POST /api/admin/partners`, `GET/PATCH/DELETE /api/admin/partners/:id`, `GET /api/admin/partner-groups` |
| Programmes | `GET/POST /api/admin/programmes`, `PATCH/DELETE /api/admin/programmes/:id` |
| Campaigns | `GET/POST /api/admin/campaigns`, `PATCH/DELETE /api/admin/campaigns/:id` |
| Relationships | `GET/POST /api/admin/relationships`, `PATCH/DELETE /api/admin/relationships/:id` |
| Plans | `GET/POST /api/admin/plans`, `PATCH/DELETE /api/admin/plans/:id`, `GET /api/admin/plans/stats` |
| Rewards & deals | `GET/POST /api/admin/rewards-deals`, `PATCH/DELETE /api/admin/rewards-deals/:id`, `GET /api/admin/rewards-deals/stats` |
| Invitations | `GET /api/admin/invitations`, `GET /api/admin/invitations/counts`, `POST /api/admin/invitations/:id/approve\|decline\|cancel` |
| Moderation | `GET /api/admin/pending-review`, `POST /api/admin/pending-review/:id/approve\|reject` |
| Audit log | `GET /api/admin/audit-log` |
| Configuration | `GET/PATCH /api/admin/config`, plus `GET/PATCH /api/admin/config/automatic`, `GET/PATCH /api/admin/config/group-rules`, `GET/PUT /api/admin/config/types`, `GET/PUT /api/admin/config/circles`, `GET/PUT /api/admin/config/mandatory-circles`, `GET/PUT /api/admin/config/mandatory-groups`, `GET/PUT /api/admin/config/stages`, `GET/PATCH /api/admin/config/payment-rules` |
| Permissions & access | `GET/PATCH /api/admin/permissions`, `GET/PATCH /api/admin/settings` |
| Locations | `GET /api/admin/locations`, `POST /api/admin/locations/cities`, `PATCH/DELETE /api/admin/locations/cities/:id`, `POST /api/admin/locations/cities/:cityId/areas`, `PATCH/DELETE /api/admin/locations/areas/:id` |
| Content | `GET /api/admin/content`, `GET /api/admin/content/status`, `GET/PATCH /api/admin/content/:id`, `POST /api/admin/content/:id/publish`, `POST /api/admin/content/publish-all` |
| Reports | `GET /api/admin/reports`, `GET/POST /api/admin/reports/schedules`, `PATCH/DELETE /api/admin/reports/schedules/:id`, `GET /api/admin/settings-reports` |

Admin Prisma models are created by the `admin_console` migration. Runtime data is
created through the API; the seed command does not create sample groups,
businesses, plans, invitations, locations, or other demo records.

### Admin API smoke test

With the API running and the database seeded:

```bash
pnpm admin:smoke
```

The script signs in as the seeded administrator, exercises every admin page's
endpoint, creates the data it needs (plus create/update/delete flows), verifies
anonymous access is rejected, and cleans its own fixtures up again. Override the
target with `API_PORT` if needed.

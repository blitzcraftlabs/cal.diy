# OSSCalendar Decomposition Baseline

Phase 1 establishes reproducible metrics before and after conservative dead-surface removal. Measurements were taken on 2026-08-26 from `/home/danielmark/Projects/cal.diy`.

## Metrics

| Metric | Before Phase 1 | After Phase 1 | Delta | How measured | Notes |
|--------|----------------|---------------|-------|--------------|-------|
| Yarn workspace count | 115 | 114 | −1 | `yarn workspaces list \| wc -l` | Removed `@calcom/example-app-credential-sync` |
| TS/TSX source files | 5,400 | 5,391 | −9 | `find . -type f \( -name '*.ts' -o -name '*.tsx' \) -not -path '*/node_modules/*' -not -path '*/.next/*' -not -path '*/dist/*' -not -path '*/.turbo/*' \| wc -l` | Source tree only |
| App-store integration dirs | 113 | 113 | 0 | `find packages/app-store -maxdepth 1 -mindepth 1 -type d \| wc -l` | Unchanged in Phase 1 |
| Prisma model count | 100 | 100 | 0 | `rg -c '^model ' packages/prisma/schema.prisma` | No schema changes |
| Prisma migration count | 595 | 595 | 0 | `find packages/prisma/migrations -mindepth 1 -maxdepth 1 -type d \| wc -l` | No migration changes |
| Source-only repo size | Not reproducibly measured (pre-change) | 1.2G | — | `du -sh --exclude='.git' --exclude='node_modules' --exclude='.next' --exclude='dist' --exclude='.turbo' .` (repo root) | Pre-change used `du -sh .` without exclusions; corrected command excludes VCS, dependencies, and build/cache dirs |
| `packages/app-store` file count | 1,567 | 1,567 | 0 | `find packages/app-store -type f -not -path '*/node_modules/*' \| wc -l` | |
| `packages/app-store` size | 156M | 156M | 0 | `du -sh packages/app-store` | |
| Web dependency graph workspaces | 21 | 21 | 0 | Recursive `workspace:` dependency walk from `apps/web/package.json` | Approximate; counts direct/transitive workspace packages only |
| Cold `yarn dx` startup | Not measured | Not measured | — | — | Requires full local infra (DB, env). Deferred to manual CI/dev validation |
| Warm `yarn dx` startup | Not measured | Not measured | — | — | Same constraint as cold startup |
| Type-check duration (`@calcom/web` + `@calcom/ui`) | Not measured (pre-change) | 217.2s | — | `yarn turbo run type-check:ci --filter=@calcom/web --filter=@calcom/ui --force` | Full monorepo `yarn type-check:ci --force` exceeds practical local runtime; scoped check validates changed packages |
| Booking/availability tests | Not measured (pre-change) | 62 passed (availability) + 8 passed (per-host-locations) | — | `TZ=UTC yarn test packages/features/bookings/lib/handleNewBooking/test/per-host-locations.test.ts packages/features/availability` | Scheduling-critical paths green |
| CreditsBadge unit tests | Not measured (pre-change) | 2 passed | — | `TZ=UTC yarn test packages/ui/components/badge/CreditsBadge.test.tsx` | Team billing link + non-linkable unavailable destinations |
| inotify `max_user_watches` | 65,536 | 65,536 | 0 | `cat /proc/sys/fs/inotify/max_user_watches` | Host limit; Turbopack dev can hit ENOSPC when multiple heavy watchers run concurrently |
| inotify `max_user_instances` | 128 | 128 | 0 | `cat /proc/sys/fs/inotify/max_user_instances` | |
| Per-process watcher count | Not measured reliably | Not measured reliably | — | — | No stable cross-platform tool in repo; host limit documented instead |

## Phase 1 removals

### Removed directories/files

- `example-apps/credential-sync/` (entire example workspace)
- `apps/web/app/(use-page-wrapper)/enterprise/page.tsx`
- `apps/web/app/(use-page-wrapper)/upgrade/page.tsx`
- `apps/web/modules/upgrade/upgrade-view.tsx`

### Removed configuration

- `example-apps/*` workspace entry in root `package.json`
- Dead routing-forms rewrites/redirects in `apps/web/next.config.ts`:
  - `/forms/:formQuery*` → `/apps/routing-forms/routing-link/:formQuery*`
  - `/routing-forms` → `/apps/routing-forms/forms`
  - `/routing/:path*` → `/apps/routing-forms/:path*`
  - redirect `/apps/routing-forms` → `/apps/routing-forms/forms`

### Removed navigation / UI stubs

- Organization settings: SSO, directory sync, delegation credential, roles/PBAC, organization billing
- Admin settings: create organization, create license key
- Host locations upgrade badge linking to `/enterprise`
- `CreditsBadge` links to removed personal/org billing routes; team billing link preserved when `teamId` is set and `isOrganization` is false

### Preserved (ambiguous or active)

- Shared credential-sync production constants/API (`packages/lib/constants.ts`, OAuth tests)
- Organization settings entries for profile/general/guest-notifications/privacy/features (team/org product surface; routes not implemented yet)
- Organization domain rewrites in `next.config.ts` (active team/org routing)
- `auth/new` redirect to hosted Cal.com (legacy; left for follow-up)
- `UpgradeTip` noop wrapper (used broadly; not a route stub)

## Scheduling kernel

**Scheduling kernel modified: NO**

Protected paths (`AvailableSlotsService`, `UserAvailabilityService`, booking/availability packages, etc.) were not edited.

## Validation

### Automated (Phase 1 corrective pass, 2026-08-26)

```bash
yarn turbo run type-check:ci --filter=@calcom/web --filter=@calcom/ui --force  # exit 0, 217.2s
TZ=UTC yarn test packages/features/bookings/lib/handleNewBooking/test/per-host-locations.test.ts  # 8/8 passed
TZ=UTC yarn test packages/features/availability  # 62/62 passed
TZ=UTC yarn test packages/ui/components/badge/CreditsBadge.test.tsx  # 2/2 passed
```

### Manual smoke test (Phase 1 corrective pass, 2026-08-26)

Environment: local DB connected; production server (`yarn workspace @calcom/web build` + `yarn workspace @calcom/web start`). Default `yarn dev` (Turbopack) returns HTTP 500 on this host due to `inotify` watch limits (`max_user_watches=65536`, `max_user_instances=128`) — pre-existing host constraint, not introduced by Phase 1. Playwright browser E2E is blocked on this host (`Playwright does not support chromium on ubuntu26.04-x64`).

| Step | Result | Notes |
|------|--------|-------|
| App starts | PASS | Production server ready (`✓ Ready in 123ms`) |
| Login works | PASS | NextAuth credentials callback returns HTTP 200 |
| Event types page loads | PASS | `/event-types` HTTP 200 (authenticated) |
| Availability page loads | PASS | `/availability` HTTP 200 (authenticated) |
| Public booking page loads | NOT RUN | Playwright/browser unavailable on host; no scripted public-page probe completed in this pass |
| Normal booking can be completed | NOT RUN | Browser E2E unavailable; covered indirectly by `per-host-locations` booking unit tests (8/8 pass) |
| Booking can be rescheduled | NOT RUN | Browser E2E unavailable |
| Booking can be cancelled | NOT RUN | Browser E2E unavailable |
| Settings nav hides removed dead destinations | PASS | Authenticated `/settings/my-account/profile` HTML contains none of: `organizations/sso`, `organizations/dsync`, `organizations/billing`, `organizations/delegation-credential`, `organizations/roles`, `settings/organizations/new`, `settings/license-key/new`; `/upgrade` returns HTTP 404 |

## Validation commands (after Phase 1)

```bash
yarn install
yarn turbo run type-check:ci --filter=@calcom/web --filter=@calcom/ui --force  # exit 0, ~120s
TZ=UTC yarn test packages/features/bookings/lib/handleNewBooking/test/per-host-locations.test.ts  # 8/8 passed
TZ=UTC yarn test packages/features/availability  # passed
```

Manual smoke test (partial on this host): login, event types, availability, settings nav, and `/upgrade` removal verified via production server HTTP checks. Full browser booking/reschedule/cancel flow deferred — Playwright unsupported on ubuntu26.04; scheduling paths covered by focused unit tests above.

## Phase 2 metrics (redirect-only app-store purge)

Measured 2026-08-26 from `/home/danielmark/Projects/cal.diy` immediately before and after deleting 28 verified redirect-only integrations (Zapier retained).

| Metric | Before Phase 2 | After Phase 2 | Delta | How measured | Notes |
|--------|----------------|---------------|-------|--------------|-------|
| Yarn workspace count | 114 | 112 | −2 | `yarn workspaces list \| wc -l` | Removed `@calcom/linear`, `@calcom/famulor` workspaces |
| TS/TSX source files | 5,788 | 5,781 | −7 | `find . -type f \( -name '*.ts' -o -name '*.tsx' \) -not -path '*/node_modules/*' -not -path '*/.next/*' -not -path '*/dist/*' -not -path '*/.turbo/*' \| wc -l` | Includes other in-flight local changes |
| App-store integration dirs | 113 | 85 | −28 | `find packages/app-store -maxdepth 1 -mindepth 1 -type d \| wc -l` | 28 redirect-only app directories removed |
| `packages/app-store` file count | 1,567 | 1,371 | −196 | `find packages/app-store -type f -not -path '*/node_modules/*' \| wc -l` | Mostly static assets + config |
| `packages/app-store` size | 156M | 139M | −17M | `du -sh packages/app-store` | |
| Generated metadata import count | 93 | 65 | −28 | `rg -c 'import .*(_config_json\|_metadata_ts)' packages/app-store/apps.metadata.generated.ts` | One fewer entry per removed integration |
| Source-only repo size | 1.2G | 1.2G | 0 | `du -sh --exclude='.git' --exclude='node_modules' --exclude='.next' --exclude='dist' --exclude='.turbo' .` | Unchanged at this granularity |
| Web dependency graph workspaces | 21 | 21 | 0 | Recursive `workspace:` dependency walk from `apps/web/package.json` | Unchanged; deleted apps were not in web dependency graph |
| Type-check duration (`@calcom/web` + `@calcom/app-store`) | Not measured (pre-change) | 126.4s | — | `yarn turbo run type-check:ci --filter=@calcom/web --filter=@calcom/app-store --force` | exit 0 |
| Redirect-only integrations deleted | — | 28 | — | Manual audit + `externalLink` config scan | Zapier deferred (active webhook/subscription runtime) |

## Phase 2 removals

### Deleted redirect-only integrations (28)

`amie`, `autocheckin`, `baa-for-hipaa`, `bolna`, `caretta`, `chatbase`, `clara`, `clic`, `cron`, `deel`, `elevenlabs`, `famulor`, `fonio-ai`, `framer`, `granola`, `greetmate-ai`, `lindy`, `linear`, `millis-ai`, `monobot`, `n8n`, `pipedream`, `raycast`, `retell-ai`, `synthflow`, `telli`, `vimcal`, `wordpress`

Each contained only marketplace metadata (`config.json`, `DESCRIPTION.md`, static assets). `linear` and `famulor` had declarative redirect `api/add.ts` stubs (install + external URL) unused by `isRedirectApp` UI flow. `wordpress` had template `zod.ts` scaffolding only.

### Deferred from redirect set

- **zapier** — `externalLink` marketplace entry, but active runtime: subscription API handlers consumed by `packages/features/webhooks/lib/scheduleTrigger.ts` and OOO tRPC handler.

### Regenerated artifacts

`yarn app-store:build` regenerated: `apps.metadata.generated.ts`, `apps.server.generated.ts`, `apps.schemas.generated.ts`, `apps.keys-schemas.generated.ts`, `redirect-apps.generated.ts` (and other unchanged generated maps where no entries existed).

## Scheduling kernel (Phase 2)

**Scheduling kernel modified: NO**

**Prisma schema modified: NO**

**Prisma migrations modified: NO**

## Validation (Phase 2)

```bash
yarn app-store:build  # exit 0
yarn install  # exit 0
yarn env-check:app-store  # exit 0
yarn turbo run type-check:ci --filter=@calcom/web --filter=@calcom/app-store --force  # exit 0, 126.4s
TZ=UTC yarn test packages/features/bookings/lib/handleNewBooking/test/per-host-locations.test.ts packages/features/availability packages/ui/components/badge/CreditsBadge.test.tsx packages/app-store/_utils/getAppCategories.test.ts packages/app-store/utils.test.ts  # 68/68 passed
```

## Next phase readiness

Repository is ready for **Phase 3 — analytics and marketing integration purge**, with these prerequisites noted:

1. Zapier remains the sole `REDIRECT_APPS` entry because it has active automation webhook APIs despite `externalLink` metadata.
2. Analytics integrations (`ga4`, `gtm`, `fathom`, `plausible`, `posthog`, `metapixel`, `matomo`, `umami`, `databuddy`, `insihts`, `twipla`) and CRM/payment/calendar/video integrations were intentionally preserved.
3. Run full `yarn type-check:ci --force` in CI before merge (local scoped check passed).
4. Static conferencing integrations (e.g. `facetime`, `skype`, `horizon-workrooms`) need explicit runtime audit before any Phase 3+ video pruning.

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

Measured 2026-08-27 from clean Git revisions via detached worktrees (`git worktree add` at base `25a3ccdfc5` and head `c59862a923`). Commands run identically in each worktree root; no dirty working-tree files included.

| Metric | Before Phase 2 | After Phase 2 | Delta | How measured | Notes |
|--------|----------------|---------------|-------|--------------|-------|
| Yarn workspace count | 114 | 112 | −2 | `yarn workspaces list \| wc -l` | Removed `@calcom/linear`, `@calcom/famulor` workspaces |
| TS/TSX source files | 5,017 | 5,010 | −7 | `find . -type f \( -name '*.ts' -o -name '*.tsx' \) -not -path '*/node_modules/*' -not -path '*/.next/*' -not -path '*/dist/*' -not -path '*/.turbo/*' \| wc -l` | Matches `git ls-tree` tracked count at each revision |
| App-store integration dirs | 113 | 85 | −28 | `find packages/app-store -maxdepth 1 -mindepth 1 -type d \| wc -l` | 28 redirect-only app directories removed |
| `packages/app-store` file count | 1,567 | 1,371 | −196 | `find packages/app-store -type f -not -path '*/node_modules/*' \| wc -l` | Mostly static assets + config |
| `packages/app-store` size | 155M | 137M | −18M | `du -sh packages/app-store` | |
| Generated metadata import count | 112 | 84 | −28 | `rg 'import ' packages/app-store/apps.metadata.generated.ts \| wc -l` | One fewer entry per removed integration |
| Source-only repo size | 217M | 200M | −17M | `du -sh --exclude='.git' --exclude='node_modules' --exclude='.next' --exclude='dist' --exclude='.turbo' .` | Measured in clean worktrees (no local build artifacts) |
| Web dependency graph workspaces | 25 | 25 | 0 | Recursive `workspace:` dependency walk from `apps/web/package.json` (all `package.json` dirs indexed; follows `dependencies` + `devDependencies`) | Phase 1 absolute count (21) not reproducible from documented command alone; reproducible walk unchanged across Phase 2 |
| Type-check duration (`@calcom/web` + `@calcom/app-store`) | Not measured (pre-change) | 86.2s | — | `yarn turbo run type-check:ci --filter=@calcom/web --filter=@calcom/app-store --force` | exit 0 (corrective pass 2026-08-27) |
| Redirect-only integrations deleted | — | 28 | — | Manual audit + `externalLink` config scan | Zapier deferred (active webhook/subscription runtime) |

## Phase 2 removals

### Deleted redirect-only integrations (28)

`amie`, `autocheckin`, `baa-for-hipaa`, `bolna`, `caretta`, `chatbase`, `clara`, `clic`, `cron`, `deel`, `elevenlabs`, `famulor`, `fonio-ai`, `framer`, `granola`, `greetmate-ai`, `lindy`, `linear`, `millis-ai`, `monobot`, `n8n`, `pipedream`, `raycast`, `retell-ai`, `synthflow`, `telli`, `vimcal`, `wordpress`

Each contained only marketplace metadata (`config.json`, `DESCRIPTION.md`, static assets) plus redirect install stubs where noted. `linear` and `famulor` had declarative redirect `api/add.ts` stubs (install + external URL) unused by `isRedirectApp` UI flow.

**`wordpress` audit:** The app-store entry was `externalLink`-only (marketplace link to wordpress.org/plugins/cal-com/). The directory also contained legacy WordPress plugin source (`plugin.php` implementing a `[cal]` shortcode with inlined embed snippet). Repository-wide search at Phase 2 base (`25a3ccdfc5`) found no build, packaging, publish, CI, app-store-cli, or static-copy tooling that consumed `plugin.php`; references were limited to generated metadata, a sync comment in `packages/embeds/embed-snippet/src/index.ts`, and an unrelated embed-param comment in `bookingSuccessRedirect.ts`. The published WordPress plugin lives on wordpress.org, not in this repo's build output. Safe to remove in Phase 2.

### Deferred from redirect set

- **zapier** — `externalLink` marketplace entry, but active runtime: subscription API handlers consumed by `packages/features/webhooks/lib/scheduleTrigger.ts` and OOO tRPC handler.

### Regenerated artifacts

`yarn app-store:build` regenerated: `apps.metadata.generated.ts`, `apps.server.generated.ts`, `apps.schemas.generated.ts`, `apps.keys-schemas.generated.ts`, `redirect-apps.generated.ts` (and other unchanged generated maps where no entries existed).

## Scheduling kernel (Phase 2)

**Scheduling kernel modified: NO**

**Prisma schema modified: NO**

**Prisma migrations modified: NO**

## Validation (Phase 2)

Measured 2026-08-27 (corrective pass).

```bash
yarn app-store:build  # exit 0
yarn install  # exit 0
yarn env-check:app-store  # exit 0
yarn turbo run type-check:ci --filter=@calcom/web --filter=@calcom/app-store --force  # exit 0, 86.2s
TZ=UTC yarn test packages/features/bookings/lib/handleNewBooking/test/per-host-locations.test.ts packages/features/availability packages/ui/components/badge/CreditsBadge.test.tsx packages/app-store/_utils/getAppCategories.test.ts packages/app-store/utils.test.ts  # 68/68 passed
```

## Next phase readiness (post-Phase 2)

Repository was ready for **Phase 3 — analytics and marketing integration purge**, with these prerequisites noted:

1. Zapier remains the sole `REDIRECT_APPS` entry because it has active automation webhook APIs despite `externalLink` metadata.
2. Analytics integrations (`ga4`, `gtm`, `fathom`, `plausible`, `posthog`, `metapixel`, `matomo`, `umami`, `databuddy`, `insihts`, `twipla`, `dub`) were targeted for Phase 3 removal; CRM/payment/calendar/video integrations were intentionally preserved.
3. Run full `yarn type-check:ci --force` in CI before merge (local scoped check passed).
4. Static conferencing integrations (e.g. `facetime`, `skype`, `horizon-workrooms`) need explicit runtime audit before any Phase 3+ video pruning.

## Phase 3 metrics (analytics/marketing app-store purge)

Measured 2026-08-27 from clean Git revisions via detached worktrees at base `e4fc69994b4b7e47fe47164cc6b47e5689c257f6` (Phase 2 corrective HEAD) and head `6a30a58c418a83d35e4c268e174404acd8ea5163` (Phase 3 PR final head). Commands run identically in each worktree root; no dirty working-tree files included.

```bash
# Create clean worktrees
git worktree add /tmp/cal-decomp-metrics-phase3/base e4fc69994b4b7e47fe47164cc6b47e5689c257f6
git worktree add /tmp/cal-decomp-metrics-phase3/head 6a30a58c418a83d35e4c268e174404acd8ea5163

# Run in each worktree root:
yarn workspaces list | wc -l
find . -type f \( -name '*.ts' -o -name '*.tsx' \) -not -path '*/node_modules/*' -not -path '*/.next/*' -not -path '*/dist/*' -not -path '*/.turbo/*' | wc -l
find packages/app-store -maxdepth 1 -mindepth 1 -type d | wc -l
find packages/app-store -type f -not -path '*/node_modules/*' | wc -l
du -sh packages/app-store
rg 'import ' packages/app-store/apps.metadata.generated.ts | wc -l
du -sh --exclude='.git' --exclude='node_modules' --exclude='.next' --exclude='dist' --exclude='.turbo' .
# Web dependency graph: recursive workspace: dependency walk from apps/web/package.json
node -e "const fs=require('fs');const path=require('path');const packages=new Map();function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,entry.name);if(['node_modules','.git','.next','dist','.turbo'].includes(entry.name))continue;if(entry.isDirectory())walk(full);else if(entry.name==='package.json'){try{const pkg=JSON.parse(fs.readFileSync(full,'utf8'));if(pkg.name)packages.set(pkg.name,pkg);}catch{}}}}walk('.');function workspaceDeps(pkg){const deps={...pkg.dependencies,...pkg.devDependencies};return Object.entries(deps).filter(([,v])=>typeof v==='string'&&v.startsWith('workspace:')).map(([n])=>n);}const visited=new Set();const queue=['@calcom/web'];while(queue.length){const name=queue.shift();if(visited.has(name))continue;visited.add(name);const pkg=packages.get(name);if(!pkg)continue;for(const dep of workspaceDeps(pkg))if(!visited.has(dep))queue.push(dep);}console.log(visited.size);"
```

| Metric | Before Phase 3 | After Phase 3 | Delta | How measured | Notes |
|--------|----------------|---------------|-------|--------------|-------|
| Yarn workspace count | 112 | 100 | −12 | `yarn workspaces list \| wc -l` | Removed 12 analytics integration workspaces |
| TS/TSX source files | 5,010 | 4,930 | −80 | `find . -type f \( -name '*.ts' -o -name '*.tsx' \) -not -path '*/node_modules/*' -not -path '*/.next/*' -not -path '*/dist/*' -not -path '*/.turbo/*' \| wc -l` | Direct count at each clean revision |
| App-store integration dirs | 85 | 73 | −12 | `find packages/app-store -maxdepth 1 -mindepth 1 -type d \| wc -l` | |
| `packages/app-store` file count | 1,371 | 1,216 | −155 | `find packages/app-store -type f -not -path '*/node_modules/*' \| wc -l` | |
| `packages/app-store` size | 137M | 128M | −9M | `du -sh packages/app-store` | |
| Generated metadata import count | 84 | 71 | −13 | `rg 'import ' packages/app-store/apps.metadata.generated.ts \| wc -l` | 12 integrations + `booking-pages-tag` template |
| Source-only repo size | 200M | 191M | −9M | `du -sh --exclude='.git' --exclude='node_modules' --exclude='.next' --exclude='dist' --exclude='.turbo' .` | Clean worktrees only |
| Web dependency graph workspaces | 25 | 25 | 0 | Recursive `workspace:` dependency walk from `apps/web/package.json` | Unchanged across Phase 3 |
| Analytics integrations removed | — | 12 | — | Manual audit of `variant: analytics` integrations | Plus `templates/booking-pages-tag` demo template |

## Phase 3 removals

### Deleted analytics/marketing integrations (12)

`ga4`, `gtm`, `fathom`, `plausible`, `posthog`, `metapixel`, `matomo`, `umami`, `databuddy`, `insihts`, `twipla`, `dub`

Each provided customer-configured booking-page script injection (`appData.tag`) and/or event-type app configuration. `dub` additionally exposed OAuth install + server-side lead tracking via tasker (`handleAnalyticsEvents`); first-party `@dub/analytics` / `dub` SDK usage in signup/auth/referrals was preserved.

### Deleted template

- `packages/app-store/templates/booking-pages-tag` — CLI demo template for analytics tag apps

### Deleted shared analytics execution path (proven unused after integration removal)

- `packages/app-store/_utils/getAnalytics.ts` — loaded `AnalyticsServiceMap`; only consumer was tasker `AnalyticsManager`
- `packages/features/tasker/tasks/analytics/*` — removed analytics task producer/handler pipeline for app-store Dub lead events
- `packages/features/tasker/tasks/sendAnalyticsEvent.ts` — legacy tombstone handler retained to drain persisted pre-Phase-3 `sendAnalyticsEvent` tasks as a no-op (no new producers)
- `packages/types/AnalyticsService.d.ts` — type surface for deleted `AnalyticsService` implementations
- `handleAnalyticsEvents` call + `dub_id` booking body field — only used for deleted Dub app-store integration
- `BookingPageTagManager` analytics script injection (`next/script`, `cal_analytics_app_*` globals, `appData.tag` scanning) — removed in corrective pass; component now only registers SDK event forwarding to `window.opener`

### Preserved shared infrastructure

- `BookingPageTagManager` — still imported on Booker/booking-success to register module-level `sdkActionManager` listener; `handleEvent` forwards non-internal SDK events to `window.opener` (rerouting/rescheduling).
- `getEventTypeAppData` — generic; stale `metadata.apps.{removedSlug}` keys are ignored (no matching `appStoreMetadata` entry).
- Stale `Credential` rows whose `appId` references a removed integration (e.g. `gtm`, `ga4`, `dub`, `posthog`) may remain in the database; `getApps` / connected-app resolution ignores them because the slug no longer exists in `appStoreMetadata`. No migration deletes these rows in Phase 3.
- `appData.tag` on `AppMeta` / `AppMetaSchema` — retained as generic app-store type surface for generator/templates; no integrations currently populate it.
- `analytics` app-store category removed from `getAppCategories` navigation surface (no integrations remain in that category).
- First-party telemetry: `posthog-js` product analytics, `@dub/analytics` signup attribution, `@calcom/lib/gtm` signup GTM, Sentry/Axiom/logging unchanged.
- First-party `dub` SDK in `@calcom/feature-auth` — preserved at `0.61.14` (previously resolved via app-store `dub-package` alias `npm:dub@^0.61.12` → `0.61.14`); direct import after app-store workspace deletion.

### Regenerated artifacts

`yarn app-store:build` regenerated all generated registries. `analytics.services.generated.ts` remains in the generator contract (`packages/app-store-cli/src/build.ts` `filesToGenerate`) and outputs an empty `AnalyticsServiceMap` when no integrations define `lib/AnalyticsService.ts`; left in place to avoid generator redesign in this pass.

## Scheduling kernel (Phase 3)

**Scheduling kernel behavior modified: NO.** `RegularBookingService` was touched only to remove the deleted Dub post-booking analytics side effect (`handleAnalyticsEvents` import and call).

**Prisma schema modified: NO**

**Prisma migrations modified: NO**

## Validation (Phase 3)

Measured 2026-08-27 (final corrective pass at head `6a30a58c418a83d35e4c268e174404acd8ea5163`).

```bash
yarn app-store:build  # exit 0
yarn env-check:app-store  # exit 0
yarn turbo run type-check:ci --filter=@calcom/web --filter=@calcom/app-store --force  # exit 0, ~300s
TZ=UTC yarn test packages/app-store/BookingPageTagManager.test.tsx packages/app-store/_utils/getAppCategories.test.ts packages/app-store/_utils/validateAppKeys.test.ts packages/app-store/utils.test.ts packages/features/bookings/lib/handleNewBooking/test/per-host-locations.test.ts packages/features/availability packages/features/tasker/tasks/sendAnalyticsEvent.test.ts  # 99/99 passed
```

## Next phase readiness (post-Phase 3)

Repository is ready for **Phase 4 — CRM integration removal**, with these prerequisites noted:

1. CRM integrations remain: `hubspot`, `salesforce`, `pipedrive-crm`, `closecom`, `attio`, `zoho-bigin`, `zohocrm` (audit each before deletion).
2. Zapier still deferred (active webhook runtime despite `externalLink` metadata).
3. Run full `yarn type-check:ci --force` in CI before merge.

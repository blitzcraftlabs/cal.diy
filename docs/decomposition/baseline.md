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
| Source-only repo size | 1.2G | 1.2G | ~0 | `du -sh .` excluding only via sandbox defaults | Modest file deletions; size dominated by non-source assets |
| `packages/app-store` file count | 1,567 | 1,567 | 0 | `find packages/app-store -type f -not -path '*/node_modules/*' \| wc -l` | |
| `packages/app-store` size | 156M | 156M | 0 | `du -sh packages/app-store` | |
| Web dependency graph workspaces | 21 | 21 | 0 | Recursive `workspace:` dependency walk from `apps/web/package.json` | Approximate; counts direct/transitive workspace packages only |
| Cold `yarn dx` startup | Not measured | Not measured | — | — | Requires full local infra (DB, env). Deferred to manual CI/dev validation |
| Warm `yarn dx` startup | Not measured | Not measured | — | — | Same constraint as cold startup |
| Type-check duration (`@calcom/web` + `@calcom/ui`) | Not measured (pre-change) | 119.7s | — | `yarn turbo run type-check:ci --filter=@calcom/web --filter=@calcom/ui --force` | Full monorepo `yarn type-check:ci --force` exceeds practical local runtime; scoped check validates changed packages |
| Booking/availability tests | Not measured (pre-change) | 8 passed (per-host-locations); availability suite passed | — | `TZ=UTC yarn test packages/features/bookings/.../per-host-locations.test.ts packages/features/availability` | Scheduling-critical paths green |
| inotify `max_user_watches` | 524,288 | 524,288 | 0 | `cat /proc/sys/fs/inotify/max_user_watches` | Raised limit already present on host |
| inotify `max_user_instances` | 512 | 512 | 0 | `cat /proc/sys/fs/inotify/max_user_instances` | |
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
- `CreditsBadge` link to `/settings/organizations/billing`

### Preserved (ambiguous or active)

- Shared credential-sync production constants/API (`packages/lib/constants.ts`, OAuth tests)
- Organization settings entries for profile/general/guest-notifications/privacy/features (team/org product surface; routes not implemented yet)
- Organization domain rewrites in `next.config.ts` (active team/org routing)
- `auth/new` redirect to hosted Cal.com (legacy; left for follow-up)
- `UpgradeTip` noop wrapper (used broadly; not a route stub)

## Scheduling kernel

**Scheduling kernel modified: NO**

Protected paths (`AvailableSlotsService`, `UserAvailabilityService`, booking/availability packages, etc.) were not edited.

## Validation commands (after Phase 1)

```bash
yarn install
yarn turbo run type-check:ci --filter=@calcom/web --filter=@calcom/ui --force  # exit 0, ~120s
TZ=UTC yarn test packages/features/bookings/lib/handleNewBooking/test/per-host-locations.test.ts  # 8/8 passed
TZ=UTC yarn test packages/features/availability  # passed
```

Manual smoke test still recommended before merge: login, event types, availability, public booking page, complete booking flow.

## Next phase readiness

Repository is ready for **Phase 2 — redirect-only app-store integration purge**, with these prerequisites noted:

1. Keep using this baseline doc for before/after comparisons.
2. Run full `yarn type-check:ci --force` in CI (local full run is slow).
3. Organization settings routes (`/settings/organizations/*`) remain absent except navigation stubs; a dedicated org-settings cleanup phase may precede or follow app-store purge.
4. Confirm `yarn dx` startup in a fully provisioned dev environment before large deletions.

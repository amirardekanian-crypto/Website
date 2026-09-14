# Supabase Edge Functions — source of truth

Until 2026-09-13 these functions existed **only as deployments**, so the code that creates
every athlete login lived nowhere in git. Each `index.ts` here is a copy of the deployed
source, retrieved with the Supabase MCP `get_edge_function`, and is what gets deployed from
now on.

| Function | Deployed version when committed | `verify_jwt` | What it does |
|---|---|---|---|
| `athlete-login` | v4 (deployed 2026-09-15: optional typed password) | **false**, deliberately (the coach check is inside; see its header) | create / reset / create_many / revoke athlete logins; coach-only |
| `assess-login` | v2 (deployed 2026-09-15: optional typed password) | **false**, deliberately (same coach check as athlete-login) | create / reset / revoke / restore logins for the tennis testing app (`/tennis-testing/`); coach-only. Revoke bans, never deletes |
| `tps-login` | v2 (deployed 2026-09-15: optional typed password) | **false**, deliberately (same coach check as athlete-login) | create / reset / revoke / restore logins for the Tennis Performance System course app (`/tennis/app/`); coach-only. Revoke bans, never deletes |

**Typed passwords (since 2026-09-15).** A single create, reset or restore can carry a `password`
that Amir typed in coach.html; without one, the function generates it (`athlete-login`'s
`create_many` always generates). Each function's `checkTyped()` and coach.html's `typedPassword()`
apply the same rule: 8-72 printable English characters, no spaces, not the username. Change them together.

## Rules
- **Edit here first, then deploy** with the Supabase MCP `deploy_edge_function`, keeping
  `verify_jwt` as listed above. Never edit a function in the dashboard: this copy would
  silently become a lie.
- **Before changing a function, check it still matches the deployment.** Fetch it with
  `get_edge_function` and diff against this file. If they differ, someone deployed without
  committing; reconcile first.
- **No secrets in these files.** Keys come from `Deno.env` (`SUPABASE_SERVICE_ROLE_KEY` etc.),
  which Supabase injects. The repo is public.
- `supabase/` is excluded from the Pages build (`_config.yml`), so none of this is served on
  the website. It is still readable on GitHub.

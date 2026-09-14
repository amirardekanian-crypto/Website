# Supabase Edge Functions — source of truth

Until 2026-09-13 these functions existed **only as deployments**, so the code that creates
every athlete login lived nowhere in git. Each `index.ts` here is a copy of the deployed
source, retrieved with the Supabase MCP `get_edge_function`, and is what gets deployed from
now on.

| Function | Deployed version when committed | `verify_jwt` | What it does |
|---|---|---|---|
| `athlete-login` | v3 (retrieved 2026-09-13, unchanged) | **false**, deliberately (the coach check is inside; see its header) | create / reset / create_many / revoke athlete logins; coach-only |
| `assess-login` | v1 (deployed 2026-09-14) | **false**, deliberately (same coach check as athlete-login) | create / reset / revoke / restore logins for the tennis testing app (`/tennis-testing/`); coach-only. Revoke bans, never deletes |

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

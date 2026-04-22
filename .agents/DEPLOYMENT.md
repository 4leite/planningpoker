## Deployment Notes

- Cloudflare Workers deployment is configured through `@cloudflare/vite-plugin` in `vite.config.ts`.
- Production build command: `pnpm build`
- Local preview command: `pnpm preview`
- Dry-run deploy command: `pnpm deploy:dry-run`
- Live deploy command: `pnpm deploy`
- Direct Wrangler access is exposed through `pnpm wrangler`
- Generate Worker binding types with `pnpm typegen` after changing `wrangler.jsonc`.
- Keep `@tanstack/devtools-vite` first in the Vite plugin array.
- Keep the Cloudflare plugin ahead of TanStack Start so workerd owns the SSR runtime.
- Keep `tanstackStart()` before `viteReact()` in the Vite plugin array.
- This Worker uses one isolated preview Worker per PR, named `planningpoker-pr-<number>`, so pull
  requests do not clobber each other.
- Production deploys attach the hostname configured in the `CLOUDFLARE_PRODUCTION_BASE_URL`
  repository variable.
- Preview deploys use each PR Worker's built-in `workers.dev` hostname, such as
  `planningpoker-pr-123.<account-subdomain>.workers.dev`, to avoid per-hostname certificate
  provisioning delays.
- Cloudflare Workers Custom Domains do not support wildcard hostnames, so per-PR custom preview
  hostnames add certificate issuance latency with little benefit here.
- Preview smoke tests still wait for the deployed HTTPS endpoint to become reachable before running
  Playwright, but the `workers.dev` target should be available much faster than a newly attached
  custom hostname.
- Preview smoke tests run against the deployed PR URL emitted by the deploy workflow.
- Closed pull requests delete their preview Worker via `.github/workflows/preview-cleanup.yml`.
- The production GitHub workflow performs a direct deploy to the stable production Worker, then can
  smoke the stable production URL.
- Protected smoke tests use Cloudflare Access service-token headers via
  `CLOUDFLARE_ACCESS_CLIENT_ID` and `CLOUDFLARE_ACCESS_CLIENT_SECRET` GitHub secrets.

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
- Preview smoke tests run against the deployed PR URL emitted by the deploy workflow.
- Preview URLs are constructed from the deployed worker name plus the
  `CLOUDFLARE_WORKERS_DEV_SUBDOMAIN` repository variable.
- Closed pull requests delete their preview Worker via `.github/workflows/preview-cleanup.yml`.
- The production GitHub workflow performs a direct deploy to the stable production Worker, then can
  smoke the stable production URL.
- Protected smoke tests use Cloudflare Access service-token headers via
  `CLOUDFLARE_ACCESS_CLIENT_ID` and `CLOUDFLARE_ACCESS_CLIENT_SECRET` GitHub secrets.

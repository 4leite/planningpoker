## Deployment Notes

- Cloudflare Workers deployment is configured through `@cloudflare/vite-plugin` in `vite.config.ts`.
- Production build command: `pnpm build`
- Local preview command: `pnpm preview`
- Generate Worker binding types with `pnpm cf-typegen` after changing `wrangler.jsonc`.
- Keep `@tanstack/devtools-vite` first in the Vite plugin array.
- Keep the Cloudflare plugin ahead of TanStack Start so workerd owns the SSR runtime.
- Keep `tanstackStart()` before `viteReact()` in the Vite plugin array.

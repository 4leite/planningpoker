## Deployment Notes

- Vercel deployment is configured through Nitro in `vite.config.ts`.
- Production build command: `pnpm build`
- Local production start command: `pnpm start`
- Nitro production output is written to `.output/`.
- Keep `@tanstack/devtools-vite` first in the Vite plugin array.
- Keep `tanstackStart()` before `viteReact()` in the Vite plugin array.

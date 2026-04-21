# Planning Poker

Planning Poker is a TanStack Start app for public, link-shared estimation rooms.

The current v1 product shape is:

- explicit room creation from the landing page
- join by human-readable room id
- anonymous display names with browser-persisted identity
- participant and spectator roles
- private voting with reveal and reset for the whole room
- Durable Object room authority with WebSocket updates
- Cloudflare Worker runtime for local preview and deployment
- one-day room expiry

## Stack

- TanStack Start with React 19
- Cloudflare Workers local runtime via the Cloudflare Vite plugin
- Cloudflare Durable Objects for room authority
- TanStack Router file-based routes
- Tailwind CSS v4
- Vitest for domain tests

## Environment

Cloudflare Worker configuration lives in `wrangler.jsonc`.

The current room runtime is self-contained in the Worker plus the `ROOMS` Durable Object binding.
Wrangler handles that binding from `wrangler.jsonc` for local development, preview, and deploy.

## Local Development

Install dependencies and start the app:

```bash
pnpm install
pnpm typegen
pnpm dev
```

The dev server runs on port `3000` inside the local Cloudflare Worker runtime.

## Validation

The main repo validation command is:

```bash
pnpm validate
```

That runs:

- `pnpm lint:check`
- `pnpm tsc`
- `pnpm test`
- `pnpm test:e2e:smoke`
- `pnpm format:check`

## Production Build

Build the app for production:

```bash
pnpm build
```

Preview the built app locally:

```bash
pnpm preview
```

Validate the Cloudflare deploy packaging path without publishing:

```bash
pnpm deploy:dry-run
```

Deploy the Worker to Cloudflare:

```bash
pnpm deploy
```

## Route Shape

The main user-facing routes are:

- `/` for create-or-join landing flow
- `/r/$room` for the room UI
- `/api/rooms/create` for room creation
- `/api/rooms/$room/socket` for room WebSocket connections

## Cloudflare Runtime

- `src/server.ts` is the custom Worker entrypoint for TanStack Start plus named Worker exports.
- `src/lib/room-durable-object.server.ts` is the room Durable Object export surface.
- `src/lib/room-authority.ts` contains the testable room lifecycle and mutation authority.
- `wrangler.jsonc` defines the Worker runtime, compatibility flags, and Durable Object bindings.

## Product Notes

Some current v1 behaviors are deliberate trade-offs:

- anyone with the room link can join
- anyone in the room can reveal or reset
- the roster is sticky membership for the room lifetime, not strict live presence
- rooms do not auto-extend past the one-day TTL

## Room Sync Model

The room sync path is authoritative at the Durable Object boundary:

- the client sends room actions over a room-scoped WebSocket
- the Durable Object validates, applies, and persists the next room snapshot
- the Durable Object sends the initial room snapshot on connect and broadcasts full snapshots after
  accepted mutations
- the client still uses optimistic transitions for immediate interaction feedback before snapshot
  reconciliation
- stale writes are not rejected; last accepted write wins by design

## Tests

The automated coverage currently includes domain logic, room lifecycle authority, and smoke-level
browser flows.

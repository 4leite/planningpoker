# Planning Poker

Planning Poker is a TanStack Start app for public, link-shared estimation rooms.

The current v1 product shape is:

- explicit room creation from the landing page
- join by human-readable room id
- anonymous display names with browser-persisted identity
- participant and spectator roles
- private voting with reveal and reset for the whole room
- Redis-backed room state with SSE updates in production
- in-memory room state with SSE updates for local development
- one-day room expiry

## Stack

- TanStack Start with React 19
- Cloudflare Workers local runtime via the Cloudflare Vite plugin
- TanStack Router file-based routes
- Tailwind CSS v4
- Redis via the `redis` client in production
- Vitest for domain tests

## Environment

Cloudflare Worker configuration lives in `wrangler.jsonc`.

Production should use Redis until the Durable Objects cutover lands:

```bash
REDIS_URL=rediss://...
```

`REDIS_URL` should point at a Redis instance that supports normal commands plus Pub/Sub. Upstash is
an acceptable target for v1 as long as you use a Redis protocol URL.

For local development, Redis is optional. The app can run against a process-local in-memory backend.

You can force a backend explicitly with:

```bash
ROOM_BACKEND=memory
```

or:

```bash
ROOM_BACKEND=redis
REDIS_URL=rediss://...
```

Backend selection rules are:

- `ROOM_BACKEND=memory` forces the in-memory backend
- `ROOM_BACKEND=redis` forces Redis and requires `REDIS_URL`
- if `REDIS_URL` is set, Redis is used
- if `REDIS_URL` is missing in non-production, the app falls back to memory
- production without Redis still fails fast

## Local Development

Install dependencies and start the app:

```bash
pnpm install
pnpm cf-typegen
pnpm dev
```

The dev server runs on port `3000` inside the local Cloudflare Worker runtime.

If you want local development to avoid Redis entirely, run:

```bash
ROOM_BACKEND=memory pnpm dev
```

That is the default test harness mode during the migration to Durable Objects. It keeps the current
room behavior green while the runtime boundary changes to workerd.

## Validation

The main repo validation command is:

```bash
pnpm validate
```

That runs:

- `pnpm lint:check`
- `pnpm tsc`
- `pnpm test`
- `pnpm build`
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

## Route Shape

The main user-facing routes are:

- `/` for create-or-join landing flow
- `/rooms/$room` for the room UI
- `/api/rooms/$room/events` for SSE room updates

## Cloudflare Runtime

- `src/server.ts` is the custom Worker entrypoint for TanStack Start plus named Worker exports.
- `src/lib/room-durable-object.server.ts` is the room Durable Object export surface for the
  migration.
- `wrangler.jsonc` defines the Worker runtime, compatibility flags, and Durable Object bindings.

## Product Notes

Some current v1 behaviors are deliberate trade-offs:

- anyone with the room link can join
- anyone in the room can reveal or reset
- the roster is sticky membership for the room lifetime, not strict live presence
- rooms do not auto-extend past the one-day TTL

## Room Sync Model

The room sync path is intentionally client-first and high-trust:

- the client owns optimistic room transitions for non-reveal actions
- server functions validate request shape, preserve uniqueness checks, and persist the next snapshot
- reveal remains the server-side exception because history generation stays append-only and durable
- room updates reconcile as full snapshots, with the highest room version winning in the client
  cache
- stale writes are not rejected; last accepted write wins by design

## Tests

The automated tests currently focus on the shared planning-poker domain rules in
`src/lib/planning-poker.test.ts`.

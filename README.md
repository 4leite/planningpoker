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
- TanStack Router file-based routes
- Tailwind CSS v4
- Redis via the `redis` client in production
- Vitest for domain tests

## Environment

Production should use Redis:

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
pnpm dev
```

The dev server runs on port `3000`.

If you want local development to avoid Redis entirely, run:

```bash
ROOM_BACKEND=memory pnpm dev
```

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

## Product Notes

Some current v1 behaviors are deliberate trade-offs:

- anyone with the room link can join
- anyone in the room can reveal or reset
- the roster is sticky membership for the room lifetime, not strict live presence
- rooms do not auto-extend past the one-day TTL

## Tests

The automated tests currently focus on the shared planning-poker domain rules in
`src/lib/planning-poker.test.ts`.

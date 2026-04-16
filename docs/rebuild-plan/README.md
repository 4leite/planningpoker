# Planning Poker Rebuild Plan

This planning set is ordered for progressive discovery. Read it top to bottom.

## Reading Order

1. [01-product-and-constraints.md](./01-product-and-constraints.md)
2. [02-target-architecture.md](./02-target-architecture.md)
3. [03-implementation-phases.md](./03-implementation-phases.md)
4. [04-open-questions-and-acceptance.md](./04-open-questions-and-acceptance.md)

## Intent

The current app is a fast initial Next.js build with client polling and a route-handler API.
This plan describes a cleaner rebuild path for TanStack Start on Vercel with:

- Redis as the source of truth
- SSE for realtime room updates
- TanStack Start server functions for mutations
- No client polling

## Outcome

At the end of this plan, the app should have:

- a small and understandable runtime model
- no in-memory server state required for correctness
- a Vercel-compatible deployment story
- graceful recovery after reconnects
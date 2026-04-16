# 01. Product And Constraints

## Product Goal

Build a small planning poker app where multiple people can:

- join a named room
- see who is present
- cast a vote privately
- reveal all votes together
- reset for the next round

The app should feel live without requiring the user to refresh the page.

## Fixed Constraints

These are the constraints this plan assumes:

- Deployment target is Vercel.
- The build target is TanStack Start.
- Polling is not desired.
- A dedicated external realtime provider is not desired.
- Redis is allowed.

## Implications Of Those Constraints

These constraints eliminate a few otherwise reasonable options.

### Not Recommended

- Client polling: simple, but explicitly ruled out.
- RSC cache invalidation as the main sync mechanism: wrong abstraction for
  collaborative room state.
- In-memory subscriber registries in the app runtime: not reliable on Vercel
  functions.
- First-party WebSockets on Vercel functions: not the platform's clean path.

### Viable Direction

That leaves one clear architecture:

- Redis snapshot state
- Redis-backed fan-out signal
- SSE from the app to the browser
- typed mutations through TanStack Start server functions

## Product Principles

These principles should guide implementation decisions.

### 1. Correctness Beats Cleverness

The room state must be correct after:

- refresh
- reconnect
- duplicate client actions
- overlapping actions from multiple users

### 2. Simple Transport Model

The app does not need a general-purpose realtime bus.

It needs only:

- one-way room updates from server to browser
- straightforward command calls from browser to server

That favors SSE over WebSockets.

### 3. Snapshot-First State Model

This app has tiny room state. Clients should not need to replay a complex event
log to recover.

The source of truth should be a room snapshot in Redis.

### 4. Progressive Hardening

The build should start with a simple internal product shape and only add
complexity when there is a demonstrated need.

Examples of things to defer:

- authentication
- authorization by team or org
- persistent room history
- advanced reconnect replay
- analytics and audit trails

## User Stories For v1

### Host Or Participant

- I can create or open a room from a URL.
- I can join the room with a display name.
- I can stay in the room across refreshes on the same browser.
- I can see other active participants.
- I can cast one vote per round.
- I cannot see other votes before reveal.
- I can reveal once all active players have voted.
- I can reset and begin another round.

### Operational Expectations

- The room should update for everyone almost immediately.
- Reconnects should self-heal without manual action.
- Abandoned rooms should clean themselves up over time.

## Architecture Decision Summary

The rest of this plan assumes the following decision:

- TanStack Start on Vercel
- Redis for room storage
- SSE for browser updates
- Server functions for commands
- no polling loop

Continue to [02-target-architecture.md](./02-target-architecture.md).

# 03. Implementation Phases

## Summary

This implementation should be done in small phases that preserve a working application at each
checkpoint.

The current repo already contains the TanStack Start scaffold, so the plan starts from the existing
workspace rather than from a fresh app bootstrap.

## Phase 0: Replace The Starter Shell

### Goal

Replace the starter marketing shell with planning-poker-specific routes and layout.

### Tasks

- replace the current index route with a create-or-join landing page
- add a room route at `src/routes/rooms/$room.tsx`
- remove starter copy and placeholder layout content that does not belong to the product
- define the product-level visual direction for a phone-friendly room UI

### Exit Criteria

- landing page exists
- room route exists
- static room shell renders with realistic placeholders

## Phase 1: Shared Domain Model

### Goal

Stabilize the planning poker domain model before wiring storage and transport.

### Tasks

- define `CardValue`, `RoomMember`, `RoomState`, and room event types
- define `participant` and `spectator` role rules
- centralize the fixed deck and numeric-average helper
- define room id validation and create-room input validation
- define room mutation helpers for create, join, leave, change role, cast vote, reveal, and reset
- set the fixed room TTL constant to one day

### Exit Criteria

- domain types are centralized
- mutation rules are testable without UI code
- the domain model reflects sticky membership rather than active presence

## Phase 2: Redis Snapshot Storage

### Goal

Make Redis the canonical room store.

### Tasks

- implement `getRoomSnapshot`
- implement `setRoomSnapshot`
- implement `createRoomSnapshot`
- set one-day TTL when a room is created
- add version incrementing on every successful mutation
- choose the Redis package and environment variable names for Upstash

### Exit Criteria

- room state survives across requests and instances
- room reads and writes are independent of process memory
- room expiry matches the one-day fixed lifetime rule

## Phase 3: Server Functions For Commands

### Goal

Move all room mutations behind typed server functions.

### Tasks

- implement `createRoom`
- implement `joinRoom`
- implement `leaveRoom`
- implement `changeRole`
- implement `castVote`
- implement `revealVotes`
- implement `resetRoom`
- implement `getRoomSnapshot` read access for the route
- return updated room snapshots from each command

### Exit Criteria

- the client can perform all room actions without raw route-handler mutation code
- command validation lives server-side
- unknown room ids return not found rather than creating a room implicitly

## Phase 4: Snapshot Read Path

### Goal

Load a room snapshot without polling.

### Tasks

- implement landing-page create and join flows
- load the room snapshot through the room route
- hydrate the client with the initial room snapshot
- preserve browser identity and last-used display name in browser storage
- reuse the same room identity across tabs in the same browser

### Exit Criteria

- loading a room shows correct current state
- refresh keeps the same local player identity when possible
- the join form can surface duplicate-name errors cleanly

## Phase 5: SSE Realtime Path

### Goal

Add push-based room updates.

### Tasks

- create the room events server route
- set SSE headers correctly
- subscribe to Redis room updates
- forward updates as `room.updated` events
- send keepalive comments periodically
- clean up subscriptions on disconnect
- update the client cache when any browser mutates the room

### Exit Criteria

- two browsers in the same room update without polling
- no manual refresh is needed to observe room changes
- joining, role changes, votes, reveal, and reset all propagate live

## Phase 6: Reconnect And Recovery

### Goal

Make the client robust to short network interruptions.

### Tasks

- reconnect `EventSource` automatically
- refetch the latest room snapshot on reconnect
- ignore stale incoming events by room version
- keep UI usable while reconnecting

### Exit Criteria

- reconnect restores correct room state
- missed Pub/Sub messages do not leave clients permanently stale

## Phase 7: Room UI And Interaction Polish

### Goal

Make the room usable and understandable on desktop and mobile.

### Tasks

- build a distinct room roster with role and vote-state indicators
- build a vote deck optimized for touch as well as mouse input
- add the copy-room-link affordance
- add explicit not-found, empty-room, and revealed-state messaging
- show the numeric average after reveal while ignoring `?`
- make the spectator and participant switch clear and reversible

### Exit Criteria

- core room actions are understandable without explanation
- mobile layout is comfortable to use

## Phase 8: Validation And Deployment Readiness

### Goal

Prove the agreed v1 behavior end-to-end.

### Tasks

- add focused tests for room domain rules
- add integration coverage for join, role switch, vote, reveal, and reset flows where practical
- validate environment variable handling for Redis on Vercel
- run `pnpm validate`
- document required env vars and local run instructions if the README no longer matches reality

### Exit Criteria

- the main flows pass locally
- the repo documents the runtime requirements clearly

## Suggested Delivery Sequence

If this is implemented over several sessions, the most efficient order is:

1. replace the starter shell and add the room route
2. implement the domain model and Redis storage
3. implement create, join, role change, vote, reveal, and reset commands
4. implement initial room load and identity persistence
5. implement SSE and reconnect recovery
6. polish the room UI and validate the build

## Things To Avoid During Implementation

- mixing domain rules into UI components
- making SSE the source of truth
- keeping a memory fallback in the production design
- adding Redis Streams before simple Pub/Sub has been validated
- introducing auth or room permissions before the basic sync model is stable
- reintroducing heartbeat and stale-presence logic that the product intentionally excluded from v1

Continue to [04-open-questions-and-acceptance.md](./04-open-questions-and-acceptance.md).

# 03. Implementation Phases

## Summary

This rebuild should be done in small phases that preserve a working application at each checkpoint.

## Phase 0: Bootstrap TanStack Start

### Goal

Create the new app shell and Vercel-compatible deployment setup.

### Tasks

- create a fresh TanStack Start app in a clean branch or sibling directory
- configure Nitro for Vercel deployment
- port shared product copy and core styling direction
- set up TypeScript, linting, and environment variable handling

### Exit Criteria

- app deploys successfully to Vercel
- room route exists
- static UI shell renders

## Phase 1: Shared Domain Model

### Goal

Extract and stabilize the planning poker domain types and rules before wiring transport.

### Tasks

- define `CardValue`, `Player`, `RoomState`, and room event types
- define room validation helpers
- define room mutation functions as pure server-side helpers
- decide room TTL and stale-player timeout constants

### Exit Criteria

- domain types are centralized
- mutation rules are testable without UI code

## Phase 2: Redis Snapshot Storage

### Goal

Make Redis the canonical room store.

### Tasks

- implement `getRoomSnapshot`
- implement `setRoomSnapshot`
- implement `pruneInactivePlayers`
- implement room TTL refresh on writes
- add version incrementing on every successful mutation

### Exit Criteria

- room state survives across requests and instances
- room reads and writes are independent of process memory

## Phase 3: Server Functions For Commands

### Goal

Move all room mutations behind typed server functions.

### Tasks

- implement `joinRoom`
- implement `leaveRoom`
- implement `sendHeartbeat`
- implement `castVote`
- implement `revealVotes`
- implement `resetRoom`
- return updated room snapshots from each command

### Exit Criteria

- the client can perform all room actions without raw route-handler mutation code
- command validation lives server-side

## Phase 4: Snapshot Read Path

### Goal

Load a room snapshot without polling.

### Tasks

- implement initial room fetch through loader or query bootstrap
- hydrate the client with the initial room snapshot
- preserve player identity in browser storage

### Exit Criteria

- loading a room shows correct current state
- refresh keeps the same local player identity when possible

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

### Exit Criteria

- two browsers in the same room update without polling
- no manual refresh is needed to observe room changes

## Phase 6: Reconnect And Recovery

### Goal

Make the client robust to short network interruptions.

### Tasks

- reconnect `EventSource` automatically
- refetch the latest room snapshot on reconnect
- ignore stale incoming events based on version if needed
- keep UI usable while reconnecting

### Exit Criteria

- reconnect restores correct room state
- missed Pub/Sub messages do not leave clients permanently stale

## Phase 7: Presence Hardening

### Goal

Keep participant lists accurate enough for normal use.

### Tasks

- implement heartbeat schedule
- prune inactive players on read and write paths
- optionally send leave on unload when cheap to do so
- ensure reveal logic ignores stale players

### Exit Criteria

- abandoned tabs disappear after timeout
- reveal behavior remains correct with disconnects

## Phase 8: UX Polish

### Goal

Make the rebuilt app feel deliberate and finished.

### Tasks

- improve join flow messaging
- show connection status subtly
- show reconnecting state when SSE drops
- improve mobile layout and vote controls
- refine empty-room and single-player states

### Exit Criteria

- core flows are understandable without explanation
- desktop and mobile are both usable

## Suggested Delivery Sequence

If this is implemented over several sessions, the most efficient order is:

1. bootstrap TanStack Start
2. implement domain model and Redis snapshot storage
3. implement commands and initial room load
4. implement SSE route and client connection
5. harden reconnect and presence
6. polish UI

## Things To Avoid During Implementation

- mixing domain rules into UI components
- making SSE the source of truth
- keeping a memory fallback in the production design
- adding Redis Streams before simple Pub/Sub has been validated
- introducing auth or room permissions before the basic sync model is stable

Continue to [04-open-questions-and-acceptance.md](./04-open-questions-and-acceptance.md).

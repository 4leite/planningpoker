# 02. Target Architecture

## Summary

The target system has four moving parts:

1. TanStack Start room UI
2. TanStack Start server functions for commands
3. TanStack Start server route for SSE subscription
4. Redis for room state and update fan-out

The architecture stays the same as the earlier draft, but the room model changes in two important
ways:

- membership is sticky for the room lifetime instead of being live-presence based
- roles are first-class because spectators are in scope for v1

## Runtime Model

The runtime model should be kept very simple.

### Commands

Client actions use server functions:

- create room
- join room
- leave room
- change role
- cast vote
- reveal votes
- reset round

Each command:

1. validates input
2. reads current room state from Redis
3. applies domain rules
4. writes the new room snapshot back to Redis
5. publishes a room-updated event
6. returns the updated snapshot to the caller

`leave room` exists only as an explicit user action. It is not relied on for cleanup.

### Reads

Clients read the room in two ways:

- an initial snapshot fetch on load
- live SSE updates after connected

### Recovery

If the SSE connection drops, the client:

1. reconnects
2. fetches a fresh snapshot once
3. resumes live updates

This is the mechanism that makes missed Pub/Sub messages tolerable.

## Why SSE

SSE is the right transport for this product shape.

Reasons:

- the server only needs to push updates to the browser
- browser support is straightforward through `EventSource`
- request model stays HTTP-native
- server-side implementation is smaller than WebSockets
- it maps well to Vercel streaming responses

This app does not need bidirectional arbitrary messaging. Commands already have a clean path through
server functions.

## Why Redis

Redis solves two separate problems.

### 1. Shared State

The room snapshot must be correct regardless of which Vercel function instance handles a request.

### 2. Shared Notification Channel

When a room changes, all connected clients need a signal that does not depend on in-memory process
state.

## Data Model

Room state should be stored as a small JSON snapshot.

Suggested shape:

```ts
type RoomMember = {
  id: string
  name: string
  role: "participant" | "spectator"
  vote: string | null
  joinedAt: number
}

type RoomState = {
  roomId: string
  createdAt: number
  expiresAt: number
  revealed: boolean
  members: RoomMember[]
  version: number
  updatedAt: number
}
```

### Required Properties

- `roomId` for identity
- `createdAt` and `expiresAt` for fixed one-day room lifetime
- `revealed` for round state
- `members` for sticky room membership
- `version` for monotonic updates
- `updatedAt` for debugging and cleanup

### Role Semantics

- participants may vote
- spectators may not vote
- switching from participant to spectator clears any existing vote
- switching from spectator to participant immediately adds that member to the current round

### Identity Semantics

- browser identity is stable across rooms
- within a room, identity is by member id rather than display name
- duplicate display names are rejected for different ids
- rejoining with the same member id restores the same room member record

## Redis Keys

Suggested key layout:

- `pp:room:{roomId}:state`
- `pp:room:{roomId}:events`

This implementation does not need separate presence keys because live presence is not part of v1.

## Event Shape

Publish full snapshots rather than diffs.

Suggested event payload:

```ts
type RoomUpdatedEvent = {
  type: "room.updated"
  roomId: string
  version: number
  room: RoomState
}
```

Why full snapshots are better here:

- room state is tiny
- client code stays simple
- reconnect recovery is simpler
- ordering problems are easier to reason about

## Presence Model

Presence is intentionally minimal in v1.

Recommended behavior:

- a room keeps a sticky member roster for its fixed lifetime
- members remain listed until they explicitly leave or the room expires
- no heartbeat loop exists in v1
- no read-path pruning exists in v1

This makes the product simpler to ship, but the roster should be described in the UI as room
membership rather than guaranteed active presence.

## Client State Model

Use TanStack Query for local cache and mutation handling, but not for polling.

Recommended behavior:

- query initial room snapshot once
- open `EventSource`
- on SSE message, write the new snapshot into the query cache
- on mutation success, also write the returned snapshot into the cache
- on reconnect, refetch one snapshot and continue
- persist local identity and last-used display name in browser storage

This gives the acting user fast feedback and keeps all passive viewers in sync.

## File Layout Recommendation

Suggested structure for the rebuilt app:

```text
src/
  lib/
    planning-poker.ts
    room.server.ts
    room.functions.ts
    room-events.server.ts
    room-id.ts
  routes/
    index.tsx
    rooms/
      $room.tsx
    api/
      rooms/
        $room/
          events.ts
  components/
    room-join-panel.tsx
    planning-poker-room.tsx
    room-member-list.tsx
    vote-deck.tsx
```

### Responsibilities

- `planning-poker.ts`: shared types, card values, validation
- `room.server.ts`: room domain logic and Redis access
- `room.functions.ts`: server function boundaries for commands and snapshot reads
- `room-events.server.ts`: event serialization and subscription helpers
- `room-id.ts`: generated room-id helper and validation
- room route: page shell and initial load
- events route: SSE response only
- room component: UI and connection lifecycle
- join panel: join form and duplicate-name errors
- member list: roster, role badges, and voted state
- vote deck: card actions and reveal-state rendering

## Room Lifecycle

The room lifecycle is explicit.

### Create

- landing page generates a room id
- server function creates the initial room snapshot
- Redis TTL is set to one day at creation time

### Join

- room route first loads the room snapshot
- if the room does not exist, show not found
- join attaches or restores the current browser identity within that room

### Expiry

- room TTL is fixed at one day
- writes do not extend the room lifetime
- expired rooms behave as missing rooms

## Concurrency Rules

The server owns all business rules.

Important invariants:

- a member can only vote if they are a participant in the room
- votes cannot change after reveal unless reset
- reveal is allowed at any time by any room member
- reset clears all votes and sets `revealed` to false
- switching to spectator clears that member's vote
- duplicate display names for different member ids are rejected
- joining after reveal must not mutate the revealed state

If conflicting commands arrive close together, the resulting room snapshot must still satisfy these
invariants.

## Recommended Technical Defaults

Use these defaults unless implementation friction proves otherwise:

- Upstash Redis for storage and Pub/Sub
- client fetches one snapshot before opening SSE
- SSE sends change notifications carrying full snapshots
- client ignores stale events if `version` is older than the cached room version

Continue to [03-implementation-phases.md](./03-implementation-phases.md).

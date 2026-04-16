# 02. Target Architecture

## Summary

The target system has four moving parts:

1. TanStack Start room UI
2. TanStack Start server functions for commands
3. TanStack Start server route for SSE subscription
4. Redis for room state and update fan-out

## Runtime Model

The runtime model should be kept very simple.

### Commands

Client actions use server functions:

- join room
- leave room
- send heartbeat
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

This app does not need bidirectional arbitrary messaging. Commands already have a clean path through server functions.

## Why Redis

Redis solves two separate problems.

### 1. Shared State

The room snapshot must be correct regardless of which Vercel function instance handles a request.

### 2. Shared Notification Channel

When a room changes, all connected clients need a signal that does not depend on in-memory process state.

## Data Model

Room state should be stored as a small JSON snapshot.

Suggested shape:

```ts
type Player = {
  id: string
  name: string
  vote: string | null
  lastSeenAt: number
}

type RoomState = {
  roomId: string
  revealed: boolean
  players: Player[]
  version: number
  updatedAt: number
}
```

### Required Properties

- `roomId` for identity
- `revealed` for round state
- `players` for current participation
- `version` for monotonic updates
- `updatedAt` for debugging and cleanup

## Redis Keys

Suggested key layout:

- `pp:room:{roomId}:state`
- `pp:room:{roomId}:events`

If separate presence keys are needed later:

- `pp:room:{roomId}:presence:{playerId}`

For the first implementation, keeping presence inside the room snapshot is enough.

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

Presence should be soft-state.

Recommended behavior:

- each player has `lastSeenAt`
- client sends heartbeat every 20 to 30 seconds
- reads and writes prune stale players
- players older than the timeout are removed

Suggested timeout for v1:

- 60 to 90 seconds

That is accurate enough without trying to detect disconnects perfectly.

## Client State Model

Use TanStack Query for local cache and mutation handling, but not for polling.

Recommended behavior:

- query initial room snapshot once
- open `EventSource`
- on SSE message, write the new snapshot into the query cache
- on mutation success, also write the returned snapshot into the cache
- on reconnect, refetch one snapshot and continue

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
  routes/
    index.tsx
    rooms/
      $room.tsx
    api/
      rooms/
        $room/
          events.ts
  components/
    planning-poker-room.tsx
```

### Responsibilities

- `planning-poker.ts`: shared types, card values, validation
- `room.server.ts`: pure room domain logic and Redis access
- `room.functions.ts`: server function boundaries for commands and snapshot reads
- `room-events.server.ts`: event serialization and subscription helpers
- room route: page shell and initial load
- events route: SSE response only
- room component: UI and connection lifecycle

## Concurrency Rules

The server owns all business rules.

Important invariants:

- a player can only vote if they are active in the room
- votes cannot change after reveal unless reset
- reveal only succeeds when all active players have voted
- reset clears all votes and sets `revealed` to false
- stale players are pruned before important decisions

If conflicting commands arrive close together, the resulting room snapshot must still satisfy these invariants.

Continue to [03-implementation-phases.md](./03-implementation-phases.md).
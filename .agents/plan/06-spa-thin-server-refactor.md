# 06. SPA And Thin-Server Refactor

## Summary

This document captures the design discussion about refactoring the app toward a fuller SPA model in
which the client owns most room-state computation and the server becomes mostly a persistence and
fan-out layer.

The environment is explicitly high-trust: players are cooperating rather than acting adversarially.
That trust assumption changes which guarantees are worth paying for on the server.

The outcome is not a pure browser-only app and not a generic document-write API. The chosen target
is:

- TanStack Start remains the framework and transport layer
- the UI behaves like a full SPA
- the client owns most domain transitions
- Redis remains the durable backing store
- SSE remains the realtime broadcast mechanism
- the server becomes much thinner, but not nonexistent
- reveal-history generation remains the main server-side semantic exception

## Why This Refactor Was Proposed

The current system already contains a meaningful amount of shared client-safe room logic in
[src/lib/planning-poker.ts](../../src/lib/planning-poker.ts).

The client already:

- stores identity locally
- keeps a local room cache
- performs optimistic state transitions before the server responds
- reconciles against full-room snapshots from the server

The server currently re-applies most of the same room-domain rules again before persisting them.

That means the current app already sits partway between a traditional server-authoritative model and
a thinner client-first model. The proposed refactor is therefore a rebalancing, not a change in
product shape.

## What The Current Code Already Tells Us

### Client Ownership Already Exists

[src/components/planning-poker/RoomScreen.tsx](../../src/components/planning-poker/RoomScreen.tsx)
already applies optimistic updates on the client using shared state helpers.

### Shared Domain Model Already Exists

[src/lib/planning-poker.ts](../../src/lib/planning-poker.ts) already contains the room types,
mutation helpers, derived result calculations, history shaping, and various invariants.

### Server Responsibilities Are Mostly Persistence And Broadcast Today

[src/lib/room.functions.ts](../../src/lib/room.functions.ts) currently validates input, loads the
room, applies mutation helpers, writes the room, and returns the next snapshot.

[src/lib/room.server.ts](../../src/lib/room.server.ts) persists whole-room snapshots and publishes
full-room update events.

[src/hooks/use-room-realtime.ts](../../src/hooks/use-room-realtime.ts) already treats SSE as a
full-room update stream, not as a low-level event bus.

This makes the SPA refactor feasible without inventing a second state model.

## Locked Decisions

These decisions were established during the design discussion and should be treated as the current
target.

### Product And Trust Model

- the app is used in a high-trust environment
- cooperative users are the normal case
- occasional lost updates are acceptable if the architecture becomes much simpler
- the server does not need to defend against adversarial clients to the same degree as a hostile
  public app

### Runtime Direction

- keep TanStack Start
- keep the app feeling like a full SPA
- keep TanStack Start server functions as the browser-to-server transport
- keep Redis durability
- keep SSE full-room broadcasts
- keep one-day room expiry enforced on the server

### Authority Split

- client owns most room-state computation
- server keeps schema validation
- server keeps unique member-id and display-name checks
- server keeps valid vote and role enum checks
- server owns monotonic room versions
- server owns timestamps and expiry-related fields
- server does not do stale-write rejection
- server does not attempt to prevent all lost updates

### Transport Shape

- do not use a generic JSON merge patch over the whole room
- do not move to a single opaque document-write endpoint
- keep action-shaped writes
- make those writes thinner than the current server-authoritative reducer model

### Reveal Exception

- reveal remains a special case
- round history generation should stay server-side

This is the one place where the final design intentionally keeps more semantic work on the server.

## Important Contradictions We Resolved

The discussion contained a few natural tensions. This section records how they were resolved and
why.

### 1. Generic Merge Patch Was Rejected

Initial instinct: let the client send partial patches and let the server store them.

Why this broke down:

- room state contains arrays such as `members` and `history`
- generic merge-patch semantics on arrays are replace-whole-array semantics
- that makes concurrent updates and append-only history much more dangerous
- it also hides domain meaning instead of simplifying it

Decision:

- do not use arbitrary JSON merge patch for room writes
- use action-shaped writes or subresource-shaped writes instead

### 2. Full Client-Owned History Was Rejected

Initial instinct: if the client owns room computation, maybe it should also own reveal history.

Why this broke down:

- history is append-only and much more sensitive to corruption than transient vote state
- a buggy client could write bad round summaries for every user
- history is one of the few places where a small amount of server semantic work buys a lot of safety

Decision:

- keep history generation server-side on reveal

### 3. Stale-Write Rejection Was Rejected

One option considered was version-based stale-write rejection, where the client sends an expected
version and the server rejects stale writes.

Why it was rejected:

- the environment is high-trust
- users are cooperating
- the goal is to minimize server compute and complexity
- the cost of occasional lost updates was accepted as a product tradeoff

Decision:

- do not add stale-write rejection
- let last accepted write win at the server layer
- still keep server-owned monotonic versions for propagation ordering and cache reconciliation

### 4. Full Server Replay Of The Reducer Was Rejected

One possible design was to keep action-shaped writes but simply replay the shared reducer on the
server.

Why it was rejected:

- that preserves more server work than desired
- it keeps the server as a second full semantic authority
- it does not fully commit to the SPA direction

Decision:

- use shallower action-specific persistence logic instead of full reducer replay
- keep the client as the primary domain-calculation owner

## Target Architecture

The target system has five moving parts:

1. SPA-like TanStack Start client
2. shared room model and client-owned reducer logic
3. thin TanStack Start server functions
4. SSE route for full-room fanout
5. Redis room persistence

### Client Responsibilities

The client should:

- fetch the initial room snapshot
- subscribe to full-room SSE updates
- own most state transitions locally
- optimistically apply local room updates immediately
- send thin action-shaped writes to the server
- reconcile to the latest returned room snapshot

### Server Responsibilities

The server should:

- validate write shape with Zod
- validate member-id uniqueness
- validate display-name uniqueness
- validate vote and role enums
- persist the resulting room changes to Redis
- assign `version`, `updatedAt`, and other server-owned timestamps
- enforce room expiry in Redis
- publish the new full-room snapshot over SSE
- generate reveal history server-side

### Server Responsibilities It Should Intentionally Stop Owning

The server should no longer be the main place that decides:

- how most vote transitions are computed
- how role switches should be derived beyond minimal persistence logic
- how optimistic transitions are modeled
- how the client arrives at its next non-reveal room state

## Proposed Write Model

The chosen write model is not “send the whole room” and not “send an arbitrary patch.”

It is:

- action-shaped writes
- client-owned state calculation for most actions
- thin action-specific persistence logic on the server

This preserves domain meaning in the API without forcing the server to remain the primary reducer.

### Recommended Actions

Recommended action surface:

- `createRoom`
- `joinRoom`
- `leaveRoom`
- `changeRole`
- `castVote`
- `revealRound`
- `resetRound`
- `rerollRound`
- `setRoomResult`

These are already close to the current function boundaries, which keeps migration cost lower.

## Recommended Semantics Per Action

### Create Room

Server remains authoritative for:

- room id generation
- created-at timestamp
- expiry timestamp
- version initialization
- room persistence

Reasoning:

- this is cheap server work
- it keeps room identity and TTL consistent

### Join Room

Server should still enforce:

- room existence
- display-name uniqueness
- member-id uniqueness within the room
- server-owned timestamps

Reasoning:

- join semantics are simple but identity-sensitive
- uniqueness is one of the few invariants clearly worth keeping server-side

### Cast Vote And Change Role

Client computes intent first.

Server should do only shallow work:

- validate payload shape and enum values
- update the relevant persisted member fields
- stamp version and timestamps
- publish the new full snapshot

Reasoning:

- these are high-frequency interactions
- keeping them thin reduces duplicate business logic on the server

### Reset And Reroll

These should be thin actions too, but they are semantically broader than single-member updates.

Recommended behavior:

- client treats the shared reducer as the primary computation source
- server applies a narrow persistence path for the changed room fields
- server remains responsible for version and time metadata

Reasoning:

- still much lighter than full reducer replay
- preserves domain meaning better than a generic room patch

### Reveal Round

Reveal is the explicit exception.

Server should still:

- derive the reveal history entry from the stored room state
- assign round numbers
- assign revealed timestamps
- persist the updated result and history
- bump version and broadcast the new full-room snapshot

Reasoning:

- history is append-only and more sensitive than transient room fields
- this is where retaining some server authority is worth the cost

### Set Result

Client may still drive the interaction, but the server can stay very thin:

- validate the card value enum
- update the persisted result field
- bump version and broadcast

Reasoning:

- this is already a narrow field write
- there is little gain in making this more abstract than it already is

## Why Not A Single Generic Room Endpoint

A single endpoint that accepts an arbitrary room patch sounds simple, but for this app it creates
more hidden complexity than it removes.

Problems:

- array replacement semantics are bad for `members` and `history`
- action meaning disappears from the API surface
- reveal and history need special behavior anyway
- debugging gets worse because every write looks the same
- the server still has to know when to stamp metadata and how to treat append-only state

Conclusion:

- a small set of thin, action-shaped server functions is a better fit than a single generic write
  endpoint

## Why Keep SSE Full-Room Broadcasts

The existing SSE model remains a good fit even after the SPA shift.

Reasons:

- the room state is small
- clients already reconcile against full snapshots well
- full-room broadcasts simplify reconnect behavior
- ordering is easier to reason about with server-owned room versions
- the server stays HTTP-native

This refactor changes who computes most writes, not how passive clients should consume updates.

## Expected Failure Modes And Accepted Trade-Offs

This design intentionally accepts several risks.

### Accepted

- concurrent writes can silently overwrite each other
- buggy clients can write semantically inconsistent non-history room state
- the server is not a strong anti-cheat boundary
- cooperative clients are assumed to be the normal case

### Not Accepted

- malformed room payloads
- invalid role or vote values
- duplicate display names inside one room
- duplicate member ids inside one room
- corrupt server-owned timestamps and versioning
- corrupt reveal history generation

## Concrete Migration Direction

This should still be treated as a rewrite of the room sync model, but not a transport rewrite.

## Phase Progress

Status as of 2026-04-21:

- Phase 1: mostly complete
- Phase 2: complete
- Phase 3: complete
- Phase 4: complete

### Phase 1: Preserve Transport, Move Authority

- keep current TanStack Start server function boundaries
- keep current SSE route
- keep Redis storage layout
- move more domain calculations out of server handlers and into client-first logic

Progress:

- complete: the app still uses the existing TanStack Start server function surface
- complete: the SSE route remains the full-room broadcast path
- complete: Redis and memory backends still use the same persisted room snapshot model
- complete: the client remains the primary optimistic state calculator for room interactions
- complete: non-reveal server handlers no longer call the shared reducer directly; they now use
  thinner action-specific persistence helpers

### Phase 2: Thin The Non-Reveal Writes

- reduce `castVote`, `changeRole`, `setResult`, and similar writes to thin persistence paths
- keep server-side validation focused on shape, enum values, and uniqueness invariants
- keep server-owned version and timestamps

Progress:

- complete: `castVote`, `changeRole`, `leaveRoom`, `resetRound`, `rerollRound`, and `setRoomResult`
  now persist through shallow server-side action helpers instead of replaying the shared reducer
- complete: `joinRoom` continues to keep server-side uniqueness checks while using a thinner
  persistence path
- complete: server-owned `version` and `updatedAt` stamping still happens only during persistence
- complete: per-action request shapes now live in `src/lib/room-sync.ts` instead of being scattered
  across the server-function module
- complete: thin persistence helpers are pinned by focused unit tests in
  `src/lib/room.server.test.ts`

### Phase 3: Isolate Reveal As The Special Case

- explicitly document reveal as the only action that still derives history server-side
- keep history logic isolated rather than letting it leak back into every command

Progress:

- complete: `revealVotes` remains the only write path that still uses reveal/history derivation
  semantics
- complete: reveal now sits behind a distinct server-only wrapper module in
  `src/lib/room-reveal.server.ts`
- complete: reveal-only history behavior is locked by focused unit coverage so it cannot silently
  bleed back into the shallow write helpers

### Phase 4: Simplify Client Reconciliation

- make the client the clear owner of optimistic transitions
- continue reconciling against returned room snapshots and SSE snapshots
- keep last-write-wins behavior explicit rather than accidental

Progress:

- complete: the client already owns optimistic room transitions in `RoomScreen`
- complete: reconciliation still happens against server-returned snapshots and SSE full-room updates
- complete: last-write-wins reconciliation is now explicit in `src/lib/room-sync.ts` and pinned by
  `src/lib/room-sync.test.ts`
- complete: the client-to-server payloads remain action-shaped rather than moving toward a generic
  room-patch API

## Recommended API Direction

The server function surface can remain close to today’s names, but their responsibilities should be
re-scoped.

### Keep

- `createRoomFn`
- `getRoomSnapshotFn`
- `joinRoom`
- `leaveRoom`
- `changeRole`
- `castVote`
- `revealVotes`
- `resetRound`
- `rerollRound`
- `setRoomResult`

### Change

- reduce most handlers from domain-authoritative reducers to thin persistence boundaries
- keep `revealVotes` as the history-generating exception
- ensure the client-side reducer becomes the clearly primary implementation

## Reasoning Summary

The central reasoning behind this design is:

1. The app already behaves partly like a SPA with optimistic local state.
2. The state model is already small enough for full-snapshot reconciliation.
3. High trust means we do not need to pay for strong server authority everywhere.
4. Generic document patching is deceptively simple and a bad fit for arrays and history.
5. Action-shaped writes preserve clarity while still allowing a much thinner server.
6. Reveal-history generation is the one place where keeping server semantics is worth it.

## Non-Goals

This refactor is not trying to:

- eliminate the server entirely
- remove Redis
- replace SSE with polling
- add strong auth or permissions
- provide strict conflict-free multi-user editing
- create a generic CRDT or local-first sync engine

## What To Document In Code If This Refactor Proceeds

If implementation begins, these points should be made explicit in repo docs and code comments where
appropriate:

- the trust model is high-trust and cooperative
- last-write-wins is intentional
- client-side reducers are the primary state-calculation path
- reveal-history generation remains server-side by design
- the server still owns versions, timestamps, and expiry

## Current Outcome

The refactor now has an explicit thin-server contract:

- request payload shapes are centralized in `src/lib/room-sync.ts`
- the client owns optimistic transitions and snapshot reconciliation
- non-reveal server writes stay shallow and stamp server-owned metadata
- reveal remains the only history-generating server-side write

# 01. Product And Constraints

## Product Goal

Build a small planning poker app where multiple people can:

- create a room from the landing page
- join an existing room by room id
- join a room with a unique display name
- vote privately with a fixed planning-poker deck
- reveal votes for everyone in the room
- reset for the next round
- switch between participant and spectator inside the room

The app should feel live without requiring a manual refresh.

## Fixed Constraints

These are the constraints this plan assumes:

- Deployment target is Vercel.
- The build target is TanStack Start.
- Polling is not desired.
- A dedicated external realtime provider is not desired.
- Redis is allowed and Upstash is acceptable for v1.

## Implications Of Those Constraints

These constraints eliminate a few otherwise reasonable options.

### Not Recommended

- Client polling: simple, but explicitly ruled out.
- RSC cache invalidation as the main sync mechanism: wrong abstraction for collaborative room state.
- In-memory subscriber registries in the app runtime: not reliable on Vercel functions.
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
- the same browser opening the same room in multiple tabs

### 2. Simple Transport Model

The app does not need a general-purpose realtime bus.

It needs only:

- one-way room updates from server to browser
- straightforward command calls from browser to server

That favors SSE over WebSockets.

### 3. Snapshot-First State Model

This app has tiny room state. Clients should not need to replay a complex event log to recover.

The source of truth should be a room snapshot in Redis.

### 4. Progressive Hardening

The build should start with a simple internal product shape and only add complexity when there is a
demonstrated need.

Examples of things to defer:

- authentication
- host permissions
- persistent room history
- advanced reconnect replay
- analytics and audit trails

### 5. Lightweight Room Semantics

This app is intentionally a lightweight vote board.

It does not need:

- built-in story fields
- sprint or ticket integration
- historical rounds in v1
- strict live presence detection

The roster in v1 is a sticky room-membership list for the room lifetime, not an authoritative active
presence list.

### 6. Explicit Trade-Offs

The agreed v1 behavior intentionally accepts these trade-offs:

- anyone with the room link can join
- anyone in the room, including spectators, can reveal and reset
- the roster may include people who are no longer connected
- voted and not-voted progress is only accurate for currently engaged users, not guaranteed live
  presence
- rooms expire after one day even if a room is still being used

## User Stories For v1

### Creator, Participant, Or Spectator

- I can create a new room from the landing page.
- I can enter a room id on the landing page and open an existing room.
- If the room id does not exist, I see not found instead of creating it implicitly.
- I can join the room with a display name that is unique within that room.
- My browser keeps my identity across refreshes.
- If I open the same room in two tabs from the same browser, both tabs control the same person.
- I can see the room roster and whether each person has voted.
- I can cast one visible vote state per round and change it until reveal.
- I cannot see other votes before reveal.
- I can reveal at any time.
- I can reset and begin another round.
- I can switch to spectator mode at any time.
- If I switch from participant to spectator, my vote is cleared immediately.
- If I switch from spectator to participant during a hidden round, I immediately count in that
  round.
- If I join after reveal, I can see the revealed result and wait for the next reset.
- I can copy the room link easily.

### Operational Expectations

- The room should update for everyone almost immediately.
- Reconnects should self-heal without manual action.
- Rooms should expire automatically after one day.

## Agreed Product Decisions

These decisions are fixed for the first implementation pass.

### Room Creation And Identity

- room ids are generated, human-readable ids
- create and join are separate landing-page flows
- room creation is explicit
- display names are unique per room
- display names are remembered across rooms for convenience
- in-room rename is out of scope for v1

### Roles And Permissions

- roles are `participant` and `spectator`
- switching roles in-room is supported
- no host role in v1
- any room member may reveal
- any room member may reset

### Voting Rules

- deck is `0, 1, 2, 3, 5, 8, 13, 21, 34, ?`
- votes remain hidden until reveal
- votes may change before reveal
- reveal is not gated on everyone voting
- reset is the only way back to a hidden round
- revealed summary includes average of numeric votes only and ignores `?`

### Presence And Lifetime

- roster is sticky membership for the room lifetime, not active presence
- no heartbeat in v1
- no unload leave request in v1
- no inactive-member pruning in v1
- room lifetime is fixed at one day via Redis TTL

## Architecture Decision Summary

The rest of this plan assumes the following decision:

- TanStack Start on Vercel
- Redis for room storage
- SSE for browser updates
- Server functions for commands
- no polling loop
- explicit room creation flow
- sticky membership roster rather than live presence

Continue to [02-target-architecture.md](./02-target-architecture.md).

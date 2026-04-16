# 04. Decisions And Acceptance

## Locked Decisions

These decisions were confirmed during the product interview and should be treated as the v1 target.

### Product Scope

- anonymous rooms only
- public link-share usage is acceptable for v1
- no host role in v1
- display names must be unique within a room
- no built-in story or task field in v1
- no round history in v1

### Room Behavior

- create and join are separate flows
- entering an unknown room id shows not found
- room ids are generated human-readable ids
- create first, then choose display name inside the room
- a browser uses one stable identity across rooms
- the same browser in two tabs of the same room controls one shared seat
- display name is remembered across rooms for convenience
- in-room rename is out of scope

### Roles And Voting

- roles are `participant` and `spectator`
- role switching is allowed in-room
- switching to spectator clears the current vote
- switching to participant during a hidden round makes the member part of the current round
- anyone in the room may reveal
- anyone in the room may reset
- deck is `0, 1, 2, 3, 5, 8, 13, 21, 34, ?`
- votes may change until reveal
- reveal is allowed at any time
- reset is the only way back to a hidden round
- join-after-reveal shows the current revealed state immediately
- post-reveal summary shows the average of numeric votes only and ignores `?`

### Presence And Lifetime

- the roster is sticky room membership, not strict live presence
- no heartbeat in v1
- no unload leave request in v1
- no inactive-member pruning in v1
- rooms expire after one day using Redis TTL

## Technical Defaults

These were not contested and can be treated as implementation defaults.

- TanStack Start on Vercel
- Redis plus SSE for realtime updates
- Upstash is acceptable for v1
- client fetches one snapshot before opening SSE
- Pub/Sub is sufficient for v1
- version-based stale-event protection is reasonable and should be included

## Known Trade-Offs

These trade-offs are accepted for v1 and should be visible in both code and UI copy.

- anyone with the room link can interfere with reveal and reset
- the roster can show absent people as if they are still part of the room
- voted and not-voted progress is informative, not authoritative active-presence data
- a still-active room can disappear once it reaches its one-day TTL

## Acceptance Criteria

The rebuild is ready when all of the following are true.

### Functional

- a user can create a room from the landing page
- a user can open an existing room URL and join with a unique name
- entering an unknown room id shows not found instead of creating the room
- two or more users in the same room see each other appear without polling
- votes remain hidden until reveal
- reveal works at any time for any room member
- reset clears the round for all connected clients
- switching from participant to spectator clears the vote
- switching from spectator to participant updates the room immediately
- the revealed room shows an average across numeric votes only

### Realtime

- updates arrive through SSE rather than a polling timer
- reconnect restores the latest correct room state
- stale clients do not remain permanently out of sync after a brief disconnect

### Operational

- Redis is the only required backend dependency
- no correctness depends on in-memory server state
- the app deploys and runs on Vercel successfully

### Code Quality

- domain rules are not embedded in UI components
- mutation boundaries are server-side and typed
- room transport concerns are isolated from rendering concerns
- the product decision to use sticky membership instead of live presence is explicit in the model

## Validation Checklist

- create a room from the landing page and confirm the redirect to the room route
- enter a fake room id and confirm not-found behavior
- open the same room in two browsers and join from both
- open the same room in two tabs from one browser and confirm they control the same seat
- cast a vote in one browser and confirm the other browser updates live
- switch one member between participant and spectator and confirm the room updates live
- reveal from one browser and confirm both update immediately
- confirm the revealed average ignores `?`
- refresh one browser and confirm identity and room state recover
- disconnect one browser temporarily and confirm it self-heals on reconnect
- leave a browser idle and confirm the room does not pretend to prune roster members automatically
- confirm the room expires after the configured one-day TTL

## Follow-Up Work After v1

These are natural next steps after the rebuild is stable.

- live presence with heartbeat and stale-member pruning
- host permissions
- room history or previous rounds
- authentication
- invite flows
- durable event replay if the product expands beyond lightweight internal use

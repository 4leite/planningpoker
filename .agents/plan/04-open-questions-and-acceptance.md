# 04. Open Questions And Acceptance

## Open Questions

These decisions are still worth confirming before implementation starts.

### Product Scope

- Are rooms anonymous, or will there be login later?
- Can two players join with the same display name?
- Does a room need an explicit host role?
- Should reveal be allowed only for a host, or for any participant?

### Presence

- What timeout should define an inactive player?
- Should a page unload attempt an explicit leave request?
- Is reconnecting with the same player id always the desired behavior?

### Realtime Details

- Should the SSE route send an immediate snapshot on connect, or should the client fetch first?
- Is version-based stale event protection needed in v1, or only if bugs appear?
- Is Pub/Sub sufficient, or is there a real requirement for replayable event history later?

### Deployment

- Which Redis region should be used relative to the Vercel function region?
- Will usage remain small enough that one SSE connection per active browser is comfortable?

## Recommended Answers For v1

Unless product requirements say otherwise, use these defaults:

- anonymous rooms
- no host role initially
- any active participant may reveal when all active players have voted
- reconnect with the same local player id
- stale timeout of 75 seconds
- client fetches snapshot once before opening SSE and again after reconnect
- Pub/Sub only, no replay log

## Acceptance Criteria

The rebuild is ready when all of the following are true.

### Functional

- a user can open any room URL and join with a name
- two or more users in the same room see each other appear without polling
- votes remain hidden until reveal
- reveal only works when all active players have voted
- reset clears the round for all connected clients

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

## Validation Checklist

- open the same room in two browsers and join from both
- cast a vote in one browser and confirm the other browser updates live
- reveal from one browser and confirm both update immediately
- refresh one browser and confirm identity and room state recover
- disconnect one browser temporarily and confirm it self-heals on reconnect
- leave a browser idle and confirm stale presence is pruned

## Follow-Up Work After v1

These are natural next steps after the rebuild is stable.

- host permissions
- room history or previous rounds
- authentication
- invite flows
- durable event replay if the product expands beyond lightweight internal use
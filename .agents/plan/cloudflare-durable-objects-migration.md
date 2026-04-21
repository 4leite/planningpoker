# Plan: Cloudflare Durable Objects Migration

> Source PRD: conversation plan for moving the app to Cloudflare, replacing Redis-backed room state
> and realtime APIs with a Durable Objects implementation, while executing the migration as a
> green-green refactor against the current test suite.

## Architectural decisions

Durable decisions that apply across all phases:

- **Execution model**: local development must run the real Cloudflare Worker and Durable Object
  implementation, not an in-process imitation.
- **Cost bias**: prefer static asset delivery and client-side work where possible, and use Worker or
  Durable Object execution only where coordination or server authority is actually required.
- **Migration strategy**: use a green-green refactor against the current test suite. Keep one
  observable behavior slice green at a time. Do not split room authority across Redis and Durable
  Objects.
- **Room authority**: each room is owned by a single room-scoped Durable Object once the cutover
  phase lands. Before cutover, Redis remains the single room authority.
- **Realtime transport**: room state uses a WebSocket connection to the room Durable Object using
  the hibernation-capable API.
- **Room protocol**: room actions and room state both move onto the WebSocket-based Durable Object
  protocol once the cutover lands.
- **Sync model**: the room protocol sends full room snapshots, including the initial snapshot on
  connect and after accepted mutations.
- **Snapshot boundary**: once the cutover lands, the room socket is authoritative for initial room
  state and live updates. There is no separate room snapshot authority.
- **Identity model**: anonymous browser-persisted member identity remains the model for this POC.
- **Access model**: room id knowledge is sufficient to join. No creator privileges are introduced.
- **Create flow**: room creation remains explicit and server-generated. Turnstile is deferred until
  the deployment-hardening phase.
- **Lifecycle**: room cleanup favors bounded storage growth. Empty rooms remain available until
  expiry. Expiry deletes Durable Object storage. Expired ids may be reused as fresh rooms.
- **TTL rule**: the currently chosen product rule is narrow: TTL extension happens only on reset and
  result changes, even if that allows an actively used room to expire mid-session.
- **Reconnect model**: deployments may disconnect active room sockets. Automatic client reconnect is
  the accepted behavior for this POC.
- **Deployment sequence**: first make the Worker implementation run locally, then cut room authority
  over, then add lifecycle cleanup, then harden Cloudflare deployment.

---

## Phase 1: Local Worker Runtime

**User stories**: as a developer, I can run the real Cloudflare Worker and Durable Object
implementation locally; as a developer, I can keep using the current green suite while the runtime
boundary changes.

### What to build

Establish a local-first Cloudflare runtime for the app so the real Worker and Durable Object
codepaths can execute in development and tests. Redis remains the authoritative room backend in this
phase, using the existing Docker support as migration scaffolding. The goal is to prove the local
runtime, asset serving, bindings, and test harness before changing room behavior.

### Acceptance criteria

- [x] The app runs locally in a real Worker-compatible runtime with Durable Object bindings
      available.
- [x] The current landing and room flows still work locally through the runtime migration and room
  authority cutover.
- [x] The existing test suite can be pointed at the local Worker runtime and stay green.
- [x] Local developer workflow documents how to run the Worker runtime alongside any Redis
      dependency still needed during migration.
- [x] The repo has a clear runtime boundary where room authority can later switch from Redis to
      Durable Objects without splitting ownership.

### Green-green validation

- Primary checks: targeted Playwright smoke coverage for landing and room entry paths.
- Supporting checks: `pnpm tsc` and the narrowest local runtime checks needed to prove the Worker
  wiring.

---

## Phase 2: Room Authority Cutover

**User stories**: as a user, I can create a room, join it, see other members, change role, vote,
reveal, reset, reroll, and update results with the same visible behavior as today; as a developer, I
can remove Redis from the room authority path in one coherent cutover.

### What to build

Replace the entire room authority model at once. The room-scoped Durable Object becomes the single
source of truth for create, membership, roles, hidden voting, reveal behavior, result overrides,
round resets, rerolls, history, initial snapshot delivery, and live updates. Redis stops owning room
state in this phase rather than being partially retained. The current suite remains the behavior
contract throughout.

### Acceptance criteria

- [x] Room creation targets the new room authority boundary and results in a room owned by a Durable
      Object.
- [x] Opening a room establishes the authoritative room socket connection and receives the initial
      full room snapshot.
- [x] Membership flows remain green: join, leave, duplicate-name recovery, reload persistence, and
      not-found handling.
- [x] Role and voting flows remain green: spectator restrictions, hidden votes, live updates,
      reveal, result override, accept, reroll, and history.
- [x] Redis is no longer authoritative for any room behavior once this phase is complete.
- [x] The cutover avoids split authority and preserves a single coherent room snapshot model.

### Green-green validation

- Primary checks: targeted Playwright runs covering landing, membership, roles, voting, and room
  error behavior.
- Supporting checks: `pnpm tsc` and any focused unit checks for pure sync or protocol logic.

---

## Phase 3: Lifecycle And Cleanup

**User stories**: as an operator, abandoned rooms do not accumulate indefinitely; as a user, expired
rooms behave consistently with the chosen product semantics.

### What to build

Add the room lifecycle rules once Durable Objects already own room state. Implement the chosen
expiry semantics, storage deletion on expiry, and room-id reuse behavior. This phase is about cost
control and deterministic cleanup, not about changing the core room interaction model.

### Acceptance criteria

- [ ] Expiry behavior follows the chosen rule for this POC.
- [ ] Expired rooms delete their Durable Object storage so abandoned rooms do not accumulate
      indefinitely.
- [ ] Reusing an expired room id creates a fresh room with no residual prior state.
- [ ] Any visible expired-room behavior is covered at the behavior level.
- [ ] Cleanup behavior is implemented without reintroducing split authority or external room
      storage.

### Green-green validation

- Primary checks: focused behavior coverage for expired-room outcomes.
- Supporting checks: targeted unit coverage for pure expiry or lifecycle logic and `pnpm tsc`.

---

## Phase 4: Cloudflare Deployment Hardening

**User stories**: as an operator, I can deploy the already-working local Worker implementation to
Cloudflare; as an operator, I can add production-only controls without destabilizing the local-first
architecture.

### What to build

Promote the locally working Worker and Durable Object implementation to Cloudflare deployment. Add
production configuration, bindings, migrations, static asset routing, and any deployment-specific
controls that were intentionally deferred, including Turnstile if it is still desired. This phase
should harden deployment and abuse controls without changing the already-proven room authority
model.

### Acceptance criteria

- [ ] The local Worker implementation can be deployed to Cloudflare with the required bindings and
      migrations.
- [ ] Static asset routing and Worker execution are configured correctly for the deployed app.
- [ ] Production environment configuration is documented and reproducible.
- [ ] Turnstile-gated create flow is added here if still required.
- [ ] Deployment-specific validation passes without changing the local development architecture.

### Green-green validation

- Primary checks: the narrowest deployment verification needed to prove Cloudflare-hosted behavior.
- Supporting checks: repo typecheck and whichever targeted end-to-end checks give confidence in the
  deployed path.

---

## Execution Notes

- Work one observable behavior slice at a time inside each phase.
- Prefer keeping the existing Playwright suite green over introducing large new test surfaces early.
- Use the Docker-backed Redis setup only as temporary migration scaffolding for Phase 1. Do not
  design any steady-state split between Redis room state and Durable Object room state.
- Treat Phase 2 as the only legitimate room-authority cutover. If the cutover seems too large, the
  answer is to improve the boundary and protocol design, not to split authority.
- Keep local runtime parity high. Cloudflare deployment should be an adaptation of the local Worker
  architecture, not a separate implementation path.

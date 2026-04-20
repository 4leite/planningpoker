# 05. Playwright Suite Plan

## Purpose

This document turns the agreed testing strategy into a concrete Playwright suite shape for this
repo.

The goal is to cover the product as a real app against the Podman-backed production-style runner,
while still keeping a small `@smoke` lane suitable for PR protection.

## Current Risk To Assume During Implementation

There is a credible suspicion that cross-client push updates may currently be broken in the app.

If an early multi-user Playwright test fails because another client does not update after a vote,
role change, reveal, or reset, do not assume the test is wrong or flaky by default. Treat that as a
possible product bug first and investigate the realtime path before weakening assertions.

## Locked Test Decisions

- run E2E against the real app only
- keep the Podman runner because it exercises the Redis-backed path
- default browser coverage is Chromium only
- split the suite by tags from the start: `@smoke`, `@realtime`, `@errors`, `@stress`, `@manual`
- treat brittle selectors as an accessibility problem and fix semantics in product code if needed
- fail tests by default on unexpected `console.error`, page errors, and unexpected failed requests
- defer clipboard coverage, mobile smoke, automated accessibility scanning, and cross-browser lanes
- keep a high-capacity test, but exclude `@stress` from the default PR lane

## Execution Lanes

### PR Smoke Lane

This is the default fast lane and should exclude `@stress`.

- create room from landing page
- join existing room from landing page
- verify live cross-page propagation without refresh
- two-member vote and reveal flow
- one post-reveal exit path into the next round
- reload preserves the saved identity and seat

Recommended command shape once wired:

```bash
playwright test --grep @smoke --grep-invert @stress
```

### Full Chromium Lane

This is the main comprehensive lane.

- all `@smoke` tests
- all `@realtime` tests
- all `@errors` tests
- non-critical happy paths such as result override and full accept plus reroll coverage

Recommended command shape once wired:

```bash
playwright test --grep-invert @manual
```

### Stress Lane

This lane is opt-in or dedicated CI only.

- high-capacity join plus realtime propagation
- high-capacity full reveal cycle

Recommended command shape once wired:

```bash
playwright test --grep @stress
```

### Manual Lane

This lane is reserved for utilities such as room seeding.

- interactive seed-room helper

Recommended command shape once wired:

```bash
playwright test --grep @manual --headed --workers=1
```

## Proposed Directory Layout

Keep tests under `test/e2e`, but stop accumulating all scenarios in a single spec.

```text
test/
  e2e/
    fixtures/
      room.ts
      runtime-hygiene.ts
    support/
      member-actions.ts
      room-selectors.ts
    landing.spec.ts
    room-membership.spec.ts
    room-voting.spec.ts
    room-roles.spec.ts
    room-errors.spec.ts
    room-stress.spec.ts
    seed-room.spec.ts
    global-setup.ts
    global-teardown.ts
```

## File Responsibilities

### `fixtures/room.ts`

Provide the minimum reusable primitives needed to compose black-box tests.

- `createRoom(page)`
- `joinRoom(page, name)`
- `openMember(browser, roomUrl, name)`
- `createRoomWithCreator(browser, creatorName)`
- `expectMemberVisible(page, name)`

Keep this fixture layer thin. Do not build a large page-object hierarchy unless the suite proves it
necessary.

### `fixtures/runtime-hygiene.ts`

Install test hooks that fail on:

- unexpected `pageerror`
- unexpected `console.error`
- unexpected failed requests outside explicit negative tests

Allow tests to opt out narrowly when a failure is intentional.

### `support/member-actions.ts`

Small helper functions for repeated cross-page interactions.

- cast vote
- toggle spectator mode
- reveal
- accept
- reroll
- override result

These should stay as functions over `Page`, not classes.

### `support/room-selectors.ts`

Centralize semantic locator helpers only where repeated selectors are verbose or fragile.

- join name input
- join button
- reveal button
- accept button
- reroll button
- result input
- member card or member text locators

If a selector is difficult to express semantically, prefer improving the product markup.

## Scenario Matrix

### `landing.spec.ts`

Focus on route-entry behavior from `/`.

1. `@smoke` create room redirects to a room URL and opens a join prompt.
2. `@smoke` join existing room from the landing page using a known room id.
3. `@errors` invalid room id on landing shows validation feedback.

### `room-membership.spec.ts`

Focus on room entry, identity persistence, and cross-page presence.

1. `@smoke @realtime` two members join the same room and see each other without refresh.
2. `@smoke` reload keeps the same member joined.
3. `@errors` duplicate display name is rejected, then the user can recover by choosing a new name.
4. `@smoke` creating a second room reuses the saved display name.
5. `@errors` unknown room route shows the room-not-found state.

### `room-voting.spec.ts`

Focus on hidden voting, reveal, result, history, and next-round transitions.

1. `@smoke @realtime` votes remain hidden until reveal, then both clients update live.
2. `@smoke @realtime` reveal shows actual member card values, the computed result, and a history
   row.
3. `@smoke` accept resets the room into a fresh hidden round.
4. `@realtime` reroll removes the latest revealed round and returns to a hidden round.
5. `@realtime` result override happy path updates the current result after reveal.

### `room-roles.spec.ts`

Focus on role switching and spectator restrictions.

1. `@errors` spectator cannot cast a vote.
2. `@realtime` switching participant to spectator clears the visible vote state.
3. `@realtime` switching spectator back to participant re-enables voting and updates other clients.

### `room-errors.spec.ts`

Focus on user-visible negative paths not already owned elsewhere.

1. `@errors` invalid result entry after reveal is rejected with feedback and does not change state.
2. `@errors` removed-member recovery path if the app exposes a stable way to trigger it.

The second scenario is intentionally conditional. If it cannot be reached through the public UI
without artificial seams, defer it rather than introducing test-only backdoors.

### `room-stress.spec.ts`

Focus on heavier room sizes and concurrency cost.

1. `@stress` eight or more members can join the same room and all become visible.
2. `@stress @realtime` a high-capacity room completes a full vote plus reveal cycle.

Keep these tests serial and isolated from the PR smoke lane.

### `seed-room.spec.ts`

Keep as a manual utility only.

1. `@manual` seed a room with a configurable number of members and pause for manual inspection.

## Assertions By Contract

Tests should mostly assert behavior, not styling implementation. The contract for this suite is:

- navigation to the expected route
- button enabled or disabled state where that is user-visible behavior
- hidden-round state shows progress rather than actual vote values
- reveal shows actual vote values on member cards
- reveal shows a computed result in the center control
- history appends a row with average, mode, result, and vote count
- second and later clients observe updates without a manual refresh
- role changes are visible across clients
- error paths show meaningful feedback text

Do not assert CSS class names for mode or outlier highlighting in the first pass.

## Product Markup Expectations

If implementation starts and semantic locators are awkward, treat these as acceptable product-code
improvements:

- strengthen button accessible names where needed
- ensure room controls have stable labels
- ensure the result input has a usable accessible name
- expose member cards through clearer text structure or landmark semantics

Avoid adding test ids unless semantic improvements are genuinely insufficient.

## Suggested Tag Placement

Prefer suite-level tags on `test.describe` blocks when a whole file mostly belongs to one category.
Apply test-level tags only when a file mixes categories.

- `landing.spec.ts`: mostly `@smoke` and `@errors`
- `room-membership.spec.ts`: mixed `@smoke`, `@realtime`, `@errors`
- `room-voting.spec.ts`: mixed `@smoke`, `@realtime`
- `room-roles.spec.ts`: mixed `@realtime`, `@errors`
- `room-errors.spec.ts`: `@errors`
- `room-stress.spec.ts`: `@stress`
- `seed-room.spec.ts`: `@manual`

## Recommended Implementation Order

Build the suite in the order that gives the fastest value and the least fixture churn.

1. runtime hygiene fixture
2. room creation and joining helpers
3. `landing.spec.ts`
4. `room-membership.spec.ts`
5. `room-voting.spec.ts`
6. `room-roles.spec.ts`
7. `room-errors.spec.ts`
8. `room-stress.spec.ts`
9. tag-aware script refinements in `package.json` and Playwright config

## Exit Criteria For The Implementation

The implementation is in good shape when all of the following are true.

- `@smoke` can run cleanly against the Podman runner without `@stress`
- the full Chromium lane covers the agreed product branches
- the stress file is runnable independently and is not coupled to smoke execution
- the suite fails fast on unexpected client-side runtime issues
- tests use semantic locators and do not depend on fragile DOM structure
- the existing manual seeding utility is preserved as a tagged manual flow

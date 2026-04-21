# Testing strategy

## Choose the right layer

- Use unit tests for pure logic with real branching and no framework or persistence dependencies.
- Use Playwright for user-visible behavior that crosses React components, hooks, server functions,
  routing, realtime fanout, or Durable Object-backed state.
- Let `tsc` cover trivial wiring, re-exports, and type-only integration.

## Unit test scope

Test pure logic only — functions with branching, transformation, or algorithmic logic that have **no
framework dependencies** (no React, no database).

The test should protect against regressions in _our_ logic, not verify library behaviour.

### What to test

- Functions with real branching or conditional logic
- Data transformation pipelines
- String building / template generation
- Algorithms (concurrency control, chunking, version comparison)

### What NOT to test

- Zod schema declarations (tests the library, not our code)
- React components, hooks, providers (covered by e2e)
- Adapter wiring, database operations (covered by e2e)
- Simple re-exports, type-only files, trivial one-liners (covered by tsc)

## Command guide

- `pnpm test`: run the Vitest unit suite.
- `pnpm tsc`: run TypeScript checks.
- `pnpm test:playwright <specs...> [flags]`: preferred entry point for targeted Playwright runs.
- `pnpm test:e2e:smoke`: run the smoke-tagged Playwright suite.
- `pnpm test:e2e`: run the broader non-manual Playwright suite.
- `pnpm validate`: run the repo gate: lint check, typecheck, unit tests, smoke e2e, and format
  check.

## Playwright runtime

- `playwright.config.ts` boots a fresh preview server with `pnpm preview:e2e`.
- If targeted Playwright runs fail because of a stale preview process or a port conflict, stop the
  process using port `3000` and retry.
- Prefer targeted specs or grep filters during development instead of defaulting to the entire e2e
  suite.

## Conventions

- Co-located siblings: `src/foo.test.ts` next to `src/foo.ts`
- One `describe` per module, `it` per behaviour
- No mocking framework dependencies — keep tests simple and direct
- Create fixtures rather than dependant tests
- Do not export functions solely to enable testing — unexported functions are implementation
  details; test only via the public API
- Prefer Playwright tags to express suite intent. Current tags in use include `@smoke`, `@realtime`,
  `@errors`, `@stress`, and `@manual`.

## Unit tag conventions

- Prefer suite-level `describe(..., { tags: [...] }, ...)` tags over tagging every individual test

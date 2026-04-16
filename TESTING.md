# Testing strategy

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

## Conventions

- Co-located siblings: `src/foo.test.ts` next to `src/foo.ts`
- One `describe` per module, `it` per behaviour
- No mocking framework dependencies — keep tests simple and direct
- Create fixtures rather than dependant tests
- Do not export functions solely to enable testing — unexported functions are implementation
  details; test only via the public API

## Unit tag conventions

- Prefer suite-level `describe(..., { tags: [...] }, ...)` tags over tagging every individual test

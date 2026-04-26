---
name: component-based-architecture-refactor
description:
  Comprehensively review a React codebase from root to leaf, identify dependencies that can move
  toward leaf components, and iterate multiple passes until push-down opportunities are exhausted.
  Use when user asks to structure software into independent, reusable, and self-contained components
  with localized concerns and clear separation of responsibilities.
---

# Component Based Architecture Refactor (Root To Leaf)

Refactor React trees by repeatedly walking from root to leaves and pushing data, derivations, and
handlers down to the narrowest valid owner.

Goal: structure software into independent, reusable, and self-contained units where each component
owns a localized concern (business function, UI behavior, or data operation).

This approach enforces separation of concerns by keeping each component responsible for its own
logic, data, and behavior, improving maintainability and simplifying testing.

## When To Use

Use this skill when:

- Props are passed through intermediary components that do not use them.
- Parent components compute values only consumed by a leaf.
- Screen-level components are bloated with local UI state and derived flags.
- The user asks to improve component boundaries, ownership, and separation of concerns.

Do not use this as a reason to add context. Prefer local ownership and local queries/hooks first.

## Core Rules

1. Move state to the narrowest valid owner.
2. Move cheap derivations to the component that consumes them.
3. Remove pass-through props before introducing new abstractions.
4. Prefer existing local hooks/selectors over new global context.
5. Keep component APIs minimal, reusable, and intention-revealing.
6. Preserve behavior exactly unless the user requests behavior changes.

## Dependency Push-Down Heuristics

At each component, classify every prop into one bucket:

- Keep: truly part of the childs future public API.
- Push Down: only forwarded or only needed by deeper descendants.
- Localize: UI-local interaction state (focus state, draft text, ephemeral toggles).
- Derive At Leaf: computable from leaf-available data using cheap logic.
- Shared Concern: truly cross-branch concern that may justify provider/context.

If uncertain, ask.

## Workflow

### 1. Map Tree Root To Leaf

- Identify root route/layout components.
- Build a concise tree outline down to leaves.
- Record where each major dependency originates (query, mutation, identity, router, context).

Output a first-pass inventory:

1. Tree outline
2. Prop-flow map (source -> intermediary -> consumer)
3. Candidate push-down hotspots

### 2. First Refactor Pass (Low Risk)

Apply only low-risk moves first:

- Replace repeated "find current entity" logic with a narrow hook where appropriate.
- Remove props that are only forwarded by intermediaries.
- Move parent-only wiring into consuming leaf hooks/components.
- Delete duplicate implementations when one leaf-owned implementation can be reused.

After edits:

- Re-scan usages for removed props.
- Re-run lint/types/tests/build as available.

### 3. Second Refactor Pass (Medium Risk)

Re-walk the updated tree and find newly visible opportunities:

- Components that still accept room/data/member props but can read from existing hooks.
- Branch controls that still depend on parent-computed booleans.
- Hook signatures that still require parent-injected helpers they can access themselves.

Apply changes conservatively and preserve API stability where external callers exist.

### 4. Third Pass (Convergence)

Perform one more root-to-leaf audit to ensure remaining props are justified.

For each remaining significant prop chain, explicitly state one of:

- Kept intentionally (with reason)
- Cannot push further without behavior/API risk (with reason)
- Deferred as higher-risk follow-up

Stop when additional push-down attempts create indirection or obscure ownership.

## Validation Requirements

After each meaningful edit batch:

1. Confirm no stale imports/usages remain.
2. Run targeted static checks first (lint/types).
3. Run unit tests for affected areas.
4. Run build (and e2e if requested or if risk is high).

Use repository-preferred validation commands when available.

## Reporting Format

Provide results in this order:

1. Findings by severity (file + specific prop chains)
2. Changes made (what moved downward and why)
3. Remaining intentional prop chains (with rationale)
4. Validation results
5. Optional next refactor candidates

If no actionable push-downs remain, say so explicitly and list residual risks/testing gaps.

## Anti-Patterns

- Replacing prop drilling with broad new context by default.
- Moving expensive shared computation into many leaves.
- Breaking public APIs without explicit user approval.
- Refactoring for style while changing behavior accidentally.
- Leaving duplicate logic after introducing a leaf-owned source of truth.

## Done Criteria

This skill is complete when:

- Components mostly orchestrate or render a localized concern, not both indiscriminately.
- Significant pass-through prop chains are removed or justified.
- Leaf components own their local interaction state and cheap derivations.
- Validation passes for modified areas.

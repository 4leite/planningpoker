---
name: prop-drilling-refactor
description:
  Reduce unnecessary prop drilling in React codebases. Use when state/handlers are passed through
  layers without local use, when state can be trivially derived in a child, or when branching
  concerns should be separated into coordinator/leaf component boundaries
---

Refactor toward narrower component interfaces and local ownership of state.

Default principle: components should minimize concerns and ideally do one thing well.

## When To Apply

Use this skill when you are:

- Seeing multi-hop prop chains where intermediary components do not use the values.
- Passing derived state down when children can derive it directly.
- Passing child-local form/input UI state from parent components.
- Trying to simplify large screen components into orchestration-only composition.
- Seeing one component accumulate multiple unrelated branching decision trees.

## Core Rules

1. Keep state at the narrowest valid owner.
2. Derive values where consumed when derivation is cheap and local.
3. Prefer splitting by component responsibility before introducing shared hooks.
4. Introduce context only for cross-branch or deep shared concerns that cannot be eliminated by
   moving derivation or ownership downward.
5. Avoid context for one-hop or linear prop passing.
6. Do not move a derivable value into context just to remove a prop chain.

## Non-Negotiable Default

When a parent is only computing or forwarding a value so a leaf can render with it, first try to
move that derivation into the leaf.

The skill is not complete if it merely replaces prop drilling with context while leaving ownership
and derivation at the top. That is a lateral move unless the value is truly shared across multiple
branches.

Ask this first:

1. What are the smallest raw inputs the leaf actually needs?
2. Can the leaf derive the current prop from those inputs with a cheap local computation?
3. If yes, pass those raw inputs or existing leaf inputs and delete the derived prop.

Only consider context after the leaf-derivation path has been explicitly ruled out.

## Coordinator And Leaf Template

Use these role names consistently:

- Coordinator Component:
  - Owns concern-level branching and orchestration.
  - Computes gating/permissions and selects which leaf variant to render.
  - Delegates rendering details and local UI interactions to leaf components.
- Leaf Component:
  - Renders one concern or one variant.
  - Receives already-scoped inputs.
  - Keeps branching minimal and local state focused on interaction details.

## Concern Split Rubric

Use a hybrid style:

- Directive defaults for common cases.
- A compact rubric for judgment calls.

### Directive Defaults

- Co-locate state and handlers with the narrowest valid owner.
- Extract coordinating children when branching logic spans multiple concern domains.
- Do not "solve" mixed concerns by wrapping them in one large shared hook.

### Rubric For Branching Extraction

Treat a branch set as an independent branching cluster when all are true:

1. It depends on a distinct input set or lifecycle trigger.
2. It drives a specific UI region or action family.
3. It can be tested or changed without modifying unrelated branch sets.

When a component contains multiple independent branching clusters, prefer moving each cluster behind
a coordinating child component.

Do not split when extraction increases cognitive overhead more than it reduces it (for example,
tightly coupled logic with one shared invariant).

Expected outcomes:

- Smaller component interfaces
- Fewer unrelated branches per file
- Easier targeted tests and safer incremental changes

## Decision Framework

### Keep As Prop

- Parent is true owner and value is consumed by a direct child.
- Value is part of child public API and expected by callers.

### Move Into Child

- State is only used in that child.
- Parent only forwards handlers without business logic.
- Data is trivially derivable from child inputs.
- Parent is currently deriving view-model flags, labels, disabled states, filtered lists, or display
  variants that the child can compute from already-available raw inputs.
- Prefer passing smaller source inputs over passing a parent-computed object full of leaf-only
  convenience fields.

### Extract To Hook

- Use only for local interaction state of a single concern region.
- Hook output should be consumed by one component boundary (or tightly related leaf pair), not as a
  new shared dependency graph.
- If the hook starts returning multi-domain flags/handlers, split components instead.

### Extract Coordinating Child

- A component has multiple independent branching clusters.
- Branch sets are driven by different reasons (permissions, mode, transport state, etc.).
- The extracted child can coordinate one concern domain while leaving leaf rendering to smaller
  components.

### Use Context

- Value is used by multiple distant descendants.
- You want to eliminate repeated pass-through across unrelated branches.
- Concern is truly shared (for example action dispatch API that does not have it's own hooks,
  auth/session, theme, feature-scoped command bus).
- You have already ruled out moving ownership or derivation to a nearer child boundary.

Context is a last resort for this skill, not the default escape hatch. If the path is essentially
one branch from coordinator to leaf, keep pushing the concern down instead of broadcasting it.

### Keep Together

- Branches are tightly coupled by one invariant and splitting would duplicate logic.
- Extraction creates indirection without reducing interface or branching complexity.

## Refactor Workflow

1. Map prop flow paths from root to leaf.
2. Mark pass-through-only props (unused in intermediary components).
3. For each pass-through prop, identify the minimum raw inputs the consuming leaf needs.
4. Move leaf-local state/handlers into the leaf.
5. Move trivially derived values to child computation.
6. Delete parent-side derived props before considering hooks or context.
7. Identify independent branching clusters using the Concern Split Rubric.
8. Extract Coordinator Component and Leaf Component boundaries where appropriate.
9. For remaining deep shared concerns, add a minimal provider boundary or suggest lifting into state
   machine.
10. Remove dead props and collapse component signatures.
11. Re-run build/tests and verify unchanged behavior.

If you cannot move a prop derivation into the leaf, state the blocking reason explicitly. Valid
reasons are rare: expensive shared computation, cross-branch synchronization, or a public API that
must stay stable.

## React Patterns To Prefer

- Split "screen" components into:
  - data/orchestration layer
  - focused presentational/feature children
- Co-locate event handlers with the component that renders the control.
- Keep custom hooks feature-focused (`useJoinGate`, `useResultInput`, etc.).
- Keep provider contexts small and single-purpose.

## Validation Checklist

- [ ] Reduced prop count on key components.
- [ ] No pass-through-only props remain in refactored path.
- [ ] Parent-computed derived props were moved into the consuming leaf wherever possible.
- [ ] Local UI state lives with the owning component/hook.
- [ ] Independent branching clusters are either separated or intentionally documented.
- [ ] Context usage is minimal and justified by shared depth.
- [ ] Any new context/provider has a written reason why leaf derivation or leaf ownership was not
      sufficient.
- [ ] `pnpm build` passes and behavior is preserved.

## Common Anti-Patterns

- Moving everything to context "just in case".
- Replacing a drilled derived prop with context instead of moving the derivation into the consumer.
- Centralizing child-only UI state in top-level screens.
- Passing precomputed/derived flags that children could compute from existing inputs.
- Replacing a large component with one large custom hook while keeping the same prop-drilling
  structure.
- Creating a "shared" hook that bundles unrelated concern branches and returns a grab-bag API.

## Good Refactor Smell

After a good refactor, intermediary components usually know less, not more. They should stop
assembling leaf-specific view state and instead pass either domain data or a narrower action API to
the boundary that actually needs it.

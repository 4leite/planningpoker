---
name: websocket-room-architecture
description:
  Reusable TanStack Query + WebSocket room architecture for refactors. Use when introducing or
  refactoring realtime room state, creating provider + context write APIs (`useRoomAction`), moving
  bootstrap/loading state into query-cache meta, or standardizing room/feedback/meta query keys.
---

Establish a repeatable realtime room pattern:

- Provider owns WebSocket lifecycle.
- Query cache is the read model.
- `useRoomAction()` is the write API.
- Room bootstrap/loading is explicit query-cache meta, not query lifecycle loading.

## When To Apply

Use this skill when you are:

- Refactoring room-style realtime features built on sockets.
- Converting mutation hooks to context-backed action dispatch.
- Separating transport lifecycle state from domain room state.
- Standardizing room query keys and cache writes.

## Target Architecture

### Write Side

- A provider (for example `RoomRealtimeProvider`) initializes realtime transport.
- Provider exposes exactly one write surface: `useRoomAction()`.
- Components and mutation hooks call `useRoomAction()`.

### Read Side

- Room data lives in query cache under `roomQueryKey(roomId)`.
- Feedback data lives under `roomFeedbackQueryKey(roomId)`.
- Room meta (bootstrap/loading/first snapshot) lives under `roomMetaQueryKey(roomId)`.
- Components read through dedicated hooks:
  - `useRoomData({ roomId, initialRoom })`
  - `useRoomFeedback({ roomId })`
  - `useRoomMeta({ roomId })`

## Query Key Rules (Required)

- Always include `roomId` in keys.
- Never use plain `['room']` for room state.
- Keep room, feedback, and meta separate.

Recommended key helpers:

```ts
roomQueryKey(roomId) => ['room', roomId]
roomFeedbackQueryKey(roomId) => ['room', roomId, 'feedback']
roomMetaQueryKey(roomId) => ['room', roomId, 'meta']
```

## Loading/Bootstrap Semantics

Do not use TanStack Query lifecycle flags as websocket bootstrap state when `enabled: false`.

Instead:

- Store explicit room meta in cache (for example `{ isBootstrapping, hasReceivedSnapshot }`).
- Flip bootstrap to false only after first valid snapshot message.
- Keep connection state separate (`idle | connecting | live | reconnecting`).

## Mutation Hook Pattern

Mutation hooks should:

1. Resolve roomId/memberId internally.
2. Read action dispatch from `useRoomAction()`.
3. Keep optimistic update + rollback behavior unchanged.
4. Continue writing errors to feedback query key.

Prefer one path only:

- No explicit `sendAction` override in mutation options.

## Migration Workflow

1. Add/verify key helpers for room, feedback, and meta.
2. Add `useRoomData` + `useRoomMeta` read hooks.
3. Build provider that owns websocket init and exposes `useRoomAction`.
4. Move provider boundary to room route/screen root.
5. Convert mutation hooks to `useRoomAction`.
6. Replace local loading booleans with `useRoomMeta` bootstrap state.
7. Validate and remove transitional code.

## Validation Checklist

- [ ] Mutation hooks compile with context-only action dispatch.
- [ ] Room bootstrap/loading comes from `useRoomMeta`, not local state.
- [ ] Query keys include `roomId` and remain separated by concern.
- [ ] `pnpm build` passes.
- [ ] Core flows pass manually or with tests: join, vote, reveal/reset, dealer pass/claim,
      leave/rejoin.
- [ ] Two room tabs do not bleed state across IDs.

## Common Anti-Patterns

- Using `queryKey: ['room']` (cross-room cache collisions).
- Encoding transport loading into room domain object.
- Using query lifecycle `isLoading` as websocket bootstrap truth with `enabled: false`.
- Keeping both context dispatch and prop-based dispatch APIs indefinitely.

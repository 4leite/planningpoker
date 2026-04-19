# Redis Data Model

## Current Redis Objects

Rooms use two Redis objects:

- State key: `pp:room:{roomId}:state`
- Pub/Sub channel: `pp:room:{roomId}:events`

No additional room Redis keys are used.

## State Key

Each room is stored as a single JSON blob at:

- `pp:room:{roomId}:state`

TTL behavior:

- The key is written with `EXAT` using the room's `expiresAt` timestamp.
- Updates preserve the same expiration window by rewriting the same key with the same
  `expiresAt`-derived TTL.

Stored JSON shape:

```json
{
  "roomId": "string",
  "createdAt": 0,
  "expiresAt": 0,
  "history": [
    {
      "round": 1,
      "average": "5.3",
      "mode": "3",
      "result": "5",
      "participantCount": 3,
      "voteCount": 2,
      "revealedAt": 0
    }
  ],
  "result": "5",
  "revealed": true,
  "members": [
    {
      "id": "uuid",
      "name": "Kai",
      "role": "participant",
      "vote": "5",
      "joinedAt": 0
    }
  ],
  "version": 4,
  "updatedAt": 0
}
```

Stored fields:

- `history` is embedded in the room state; it is not stored separately.
- `result` is the current editable revealed result for the active round.
- `history[].result` is the persisted snapshot for that revealed round.
- `history[].participantCount` excludes spectators.
- `history[].voteCount` counts participant votes only.

## Event Channel

Room updates are published to:

- `pp:room:{roomId}:events`

Each message is a JSON payload with this shape:

```json
{
  "type": "room.updated",
  "roomId": "string",
  "version": 4,
  "room": { "...full room state...": true }
}
```

Message behavior:

- Events contain the full room snapshot, not a patch.
- Consumers should treat Redis Pub/Sub as transient delivery and use the state key as the source of
  truth.

## Concurrency Model

Redis writes use optimistic concurrency around the single room key:

- `WATCH pp:room:{roomId}:state`
- Read current JSON
- Compute next room state in application code
- `MULTI` + `SET ... EXAT ...` + `EXEC`

If a watch conflict occurs, the server retries.

## Current Scope

The current room backend stores all room data inside the single room state document and publishes
full-room update events on the room channel.

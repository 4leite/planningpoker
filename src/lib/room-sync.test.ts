import { describe, expect, it } from "vitest"

import { createRoomState } from "#/lib/planning-poker"
import { reconcileRoomSnapshot } from "#/lib/room-sync"

describe("room sync contract", () => {
  it("accepts the newest room snapshot by version", () => {
    const currentRoom = {
      ...createRoomState({ roomId: "amber-anchor-12", now: 1000 }),
      version: 2,
      updatedAt: 1200,
    }
    const nextRoom = {
      ...currentRoom,
      version: 3,
      updatedAt: 1300,
    }

    expect(
      reconcileRoomSnapshot({
        currentRoom,
        nextRoom,
      }),
    ).toEqual(nextRoom)
  })

  it("keeps the current room when an older snapshot arrives", () => {
    const currentRoom = {
      ...createRoomState({ roomId: "amber-anchor-12", now: 1000 }),
      version: 3,
      updatedAt: 1300,
    }
    const nextRoom = {
      ...currentRoom,
      version: 2,
      updatedAt: 1200,
    }

    expect(
      reconcileRoomSnapshot({
        currentRoom,
        nextRoom,
      }),
    ).toEqual(currentRoom)
  })

  it("clears the cache when the incoming snapshot is null", () => {
    const currentRoom = createRoomState({ roomId: "amber-anchor-12", now: 1000 })

    expect(
      reconcileRoomSnapshot({
        currentRoom,
        nextRoom: null,
      }),
    ).toBeNull()
  })
})

import { describe, expect, it } from "vitest"

import { createRoomState, type RoomState, roomLifetimeMs } from "#/lib/planning-poker"
import { createRoomAuthority, type RoomAuthorityStorage } from "#/lib/room-authority"

const roomId = "amber-anchor-12"
const kaiId = "11111111-1111-4111-8111-111111111111"

const createStorage = (initialRoom?: RoomState | null) => {
  let storedRoom = initialRoom ?? null
  let alarm: number | null = null

  const storage: RoomAuthorityStorage = {
    getRoom: async () => storedRoom,
    putRoom: async (room) => {
      storedRoom = room
    },
    deleteRoom: async () => {
      storedRoom = null
    },
    setAlarm: async (expiresAt) => {
      alarm = expiresAt
    },
    deleteAlarm: async () => {
      alarm = null
    },
  }

  return {
    storage,
    getStoredRoom: () => storedRoom,
    getAlarm: () => alarm,
  }
}

describe("room authority lifecycle", () => {
  it("deletes expired room storage and treats the room as missing", async () => {
    const storage = createStorage({
      ...createRoomState({ roomId, now: 1_000 }),
      expiresAt: 1_500,
    })
    const authority = createRoomAuthority({
      storage: storage.storage,
      now: () => 2_000,
    })

    await expect(authority.getActiveRoom()).resolves.toBeNull()
    expect(storage.getStoredRoom()).toBeNull()
    expect(storage.getAlarm()).toBeNull()
  })

  it("recreates an expired room id as a fresh room with no prior state", async () => {
    const storage = createStorage({
      ...createRoomState({ roomId, now: 1_000 }),
      expiresAt: 1_500,
      members: [
        {
          id: kaiId,
          name: "Kai",
          role: "participant",
          vote: "5",
          joinedAt: 1_100,
        },
      ],
      history: [
        {
          round: 1,
          average: "5.0",
          mode: "5",
          result: "5",
          participantCount: 1,
          voteCount: 1,
          revealedAt: 1_200,
        },
      ],
      result: "5",
      revealed: true,
      version: 4,
      updatedAt: 1_200,
    })
    const authority = createRoomAuthority({
      storage: storage.storage,
      now: () => 2_000,
    })

    const room = await authority.createRoom(roomId)

    expect(room).toMatchObject({
      roomId,
      members: [],
      history: [],
      result: null,
      revealed: false,
      version: 0,
      createdAt: 2_000,
      updatedAt: 2_000,
      expiresAt: 2_000 + roomLifetimeMs,
    })
    expect(storage.getStoredRoom()).toEqual(room)
    expect(storage.getAlarm()).toBe(2_000 + roomLifetimeMs)
  })

  it("extends room expiry only for reset and result updates", async () => {
    let now = 1_000
    const storage = createStorage(null)
    const authority = createRoomAuthority({
      storage: storage.storage,
      now: () => now,
    })

    const room = await authority.createRoom(roomId)
    expect(room).not.toBeNull()

    now = 1_100
    const joinedRoom = await authority.applyAction({
      type: "room.join",
      mutationId: "join-1",
      memberId: kaiId,
      name: "Kai",
    })

    expect(joinedRoom.expiresAt).toBe(1_000 + roomLifetimeMs)

    now = 1_200
    const votedRoom = await authority.applyAction({
      type: "room.castVote",
      mutationId: "vote-1",
      memberId: kaiId,
      vote: "5",
    })
    const resetRoom = await authority.applyAction({
      type: "room.reset",
      mutationId: "reset-1",
    })

    expect(votedRoom.expiresAt).toBe(1_000 + roomLifetimeMs)
    expect(resetRoom.expiresAt).toBe(1_200 + roomLifetimeMs)

    now = 1_300
    const reVotedRoom = await authority.applyAction({
      type: "room.castVote",
      mutationId: "vote-2",
      memberId: kaiId,
      vote: "8",
    })
    const revealedRoom = await authority.applyAction({
      type: "room.reveal",
      mutationId: "reveal-1",
    })

    now = 1_400
    const resultRoom = await authority.applyAction({
      type: "room.setResult",
      mutationId: "result-1",
      result: "8",
    })

    expect(reVotedRoom.expiresAt).toBe(1_200 + roomLifetimeMs)
    expect(revealedRoom.expiresAt).toBe(1_200 + roomLifetimeMs)
    expect(resultRoom.expiresAt).toBe(1_400 + roomLifetimeMs)
  })
})

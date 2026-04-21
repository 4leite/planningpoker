import { describe, expect, it } from "vitest"

import { castVoteState, createRoomState, joinRoomState } from "#/lib/planning-poker"
import { revealRoomServerState } from "#/lib/room-reveal.server"
import {
  castVoteServerState,
  changeRoleServerState,
  joinRoomServerState,
  rerollRoomServerState,
  resetRoomServerState,
  setRoomResultServerState,
} from "#/lib/room.server"

const roomId = "amber-anchor-12"
const kaiId = "11111111-1111-4111-8111-111111111111"
const noaId = "22222222-2222-4222-8222-222222222222"

const createBaseRoom = () =>
  joinRoomState({
    room: createRoomState({ roomId, now: 1_000 }),
    memberId: kaiId,
    name: "Kai",
    now: 1_100,
  })

const createRevealedRoom = () => {
  const roomWithMembers = joinRoomState({
    room: createBaseRoom(),
    memberId: noaId,
    name: "Noa",
    now: 1_200,
  })

  return revealRoomServerState({
    room: castVoteState({
      room: castVoteState({
        room: roomWithMembers,
        memberId: kaiId,
        vote: "3",
        now: 1_300,
      }),
      memberId: noaId,
      vote: "5",
      now: 1_400,
    }),
    now: 1_500,
  })
}

describe("thin room server writes", () => {
  it("joins through a shallow server write and bumps server metadata", () => {
    const room = createBaseRoom()

    const nextRoom = joinRoomServerState({
      room,
      memberId: noaId,
      name: "Noa",
      now: 2_000,
    })

    expect(nextRoom.members.map((member) => member.name)).toEqual(["Kai", "Noa"])
    expect(nextRoom.history).toBe(room.history)
    expect(nextRoom.result).toBe(room.result)
    expect(nextRoom.revealed).toBe(room.revealed)
    expect(nextRoom.version).toBe(room.version + 1)
    expect(nextRoom.updatedAt).toBe(2_000)
  })

  it("keeps non-reveal vote writes out of history", () => {
    const room = createBaseRoom()

    const nextRoom = castVoteServerState({
      room,
      memberId: kaiId,
      vote: "8",
      now: 2_000,
    })

    expect(nextRoom.members.find((member) => member.id === kaiId)?.vote).toBe("8")
    expect(nextRoom.history).toBe(room.history)
    expect(nextRoom.result).toBeNull()
    expect(nextRoom.revealed).toBe(false)
    expect(nextRoom.version).toBe(room.version + 1)
  })

  it("clears a vote when a participant becomes a spectator", () => {
    const room = castVoteServerState({
      room: createBaseRoom(),
      memberId: kaiId,
      vote: "5",
      now: 1_300,
    })

    const nextRoom = changeRoleServerState({
      room,
      memberId: kaiId,
      role: "spectator",
      now: 2_000,
    })

    expect(nextRoom.members.find((member) => member.id === kaiId)).toMatchObject({
      role: "spectator",
      vote: null,
    })
    expect(nextRoom.history).toBe(room.history)
    expect(nextRoom.version).toBe(room.version + 1)
  })

  it("treats reveal as the only write that adds history", () => {
    const room = createRevealedRoom()

    expect(room.revealed).toBe(true)
    expect(room.result).toBe("3")
    expect(room.history).toHaveLength(1)
    expect(room.history[0]).toMatchObject({
      round: 1,
      result: "3",
      voteCount: 2,
    })
  })

  it("rerolls by clearing the active round and dropping only the latest history entry", () => {
    const earlierRound = createRevealedRoom()
    const currentRound = revealRoomServerState({
      room: castVoteState({
        room: castVoteState({
          room: resetRoomServerState({
            room: earlierRound,
            now: 1_600,
          }),
          memberId: kaiId,
          vote: "5",
          now: 1_700,
        }),
        memberId: noaId,
        vote: "8",
        now: 1_800,
      }),
      now: 1_900,
    })

    const nextRoom = rerollRoomServerState({
      room: currentRound,
      now: 2_000,
    })

    expect(currentRound.history).toHaveLength(2)
    expect(nextRoom.revealed).toBe(false)
    expect(nextRoom.result).toBeNull()
    expect(nextRoom.members.every((member) => member.vote === null)).toBe(true)
    expect(nextRoom.history).toEqual([earlierRound.history[0]])
  })

  it("keeps set-result writes scoped to the current revealed round", () => {
    const room = createRevealedRoom()

    const nextRoom = setRoomResultServerState({
      room,
      result: "5",
      now: 2_000,
    })

    expect(nextRoom.result).toBe("5")
    expect(nextRoom.history[0]).toMatchObject({
      result: "5",
    })
    expect(nextRoom.history.slice(1)).toEqual(room.history.slice(1))
    expect(nextRoom.version).toBe(room.version + 1)
  })
})

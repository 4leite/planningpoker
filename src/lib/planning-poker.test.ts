import { describe, expect, it } from "vitest"

import {
  calculateNumericAverage,
  castVoteState,
  changeRoleState,
  createRoomState,
  formatAverageVote,
  joinRoomState,
  resetRoomState,
  revealRoomState,
} from "#/lib/planning-poker"

describe("planning poker domain rules", () => {
  it("rejects duplicate display names from different member ids", () => {
    const room = joinRoomState({
      room: createRoomState({ roomId: "amber-anchor-12", now: 1000 }),
      memberId: "11111111-1111-4111-8111-111111111111",
      name: "Jordan",
      now: 1200,
    })

    expect(() =>
      joinRoomState({
        room,
        memberId: "22222222-2222-4222-8222-222222222222",
        name: "Jordan",
        now: 1400,
      }),
    ).toThrowError("display_name_taken")
  })

  it("clears a vote when a participant switches to spectator", () => {
    const joinedRoom = joinRoomState({
      room: createRoomState({ roomId: "amber-anchor-12", now: 1000 }),
      memberId: "11111111-1111-4111-8111-111111111111",
      name: "Ari",
      now: 1200,
    })

    const votedRoom = castVoteState({
      room: joinedRoom,
      memberId: "11111111-1111-4111-8111-111111111111",
      vote: "8",
      now: 1400,
    })

    const spectatorRoom = changeRoleState({
      room: votedRoom,
      memberId: "11111111-1111-4111-8111-111111111111",
      role: "spectator",
      now: 1600,
    })

    expect(spectatorRoom.members[0]?.vote).toBeNull()
    expect(spectatorRoom.members[0]?.role).toBe("spectator")
  })

  it("allows reveal at any time and reset clears the board", () => {
    const joinedRoom = joinRoomState({
      room: createRoomState({ roomId: "amber-anchor-12", now: 1000 }),
      memberId: "11111111-1111-4111-8111-111111111111",
      name: "Mae",
      now: 1200,
    })

    const revealedRoom = revealRoomState({
      room: joinedRoom,
      now: 1400,
    })

    const resetRoom = resetRoomState({
      room: revealedRoom,
      now: 1600,
    })

    expect(revealedRoom.revealed).toBe(true)
    expect(resetRoom.revealed).toBe(false)
    expect(resetRoom.members.every((member) => member.vote === null)).toBe(true)
  })

  it("averages only numeric votes", () => {
    const startRoom = createRoomState({ roomId: "amber-anchor-12", now: 1000 })
    const one = joinRoomState({
      room: startRoom,
      memberId: "11111111-1111-4111-8111-111111111111",
      name: "Kai",
      now: 1200,
    })
    const two = joinRoomState({
      room: one,
      memberId: "22222222-2222-4222-8222-222222222222",
      name: "Noa",
      now: 1300,
    })
    const three = joinRoomState({
      room: two,
      memberId: "33333333-3333-4333-8333-333333333333",
      name: "Sam",
      now: 1400,
    })
    const withVotes = castVoteState({
      room: castVoteState({
        room: castVoteState({
          room: three,
          memberId: "11111111-1111-4111-8111-111111111111",
          vote: "3",
          now: 1500,
        }),
        memberId: "22222222-2222-4222-8222-222222222222",
        vote: "5",
        now: 1600,
      }),
      memberId: "33333333-3333-4333-8333-333333333333",
      vote: "?",
      now: 1700,
    })

    expect(formatAverageVote(calculateNumericAverage(withVotes.members))).toBe("4")
  })
})

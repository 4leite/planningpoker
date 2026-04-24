import { describe, expect, it } from "vitest"

import {
  calculateAverageResultCard,
  calculateNumericAverage,
  calculateVoteMode,
  castVoteState,
  changeRoleState,
  claimDealerState,
  countCastVotes,
  createRoomState,
  formatAverageVote,
  getActiveDealer,
  getVoteExtremesOutsideMode,
  joinRoomState,
  leaveRoomState,
  passDealerState,
  rerollRoomState,
  resetRoomState,
  revealRoomState,
  setRoomResultState,
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
      memberId: "11111111-1111-4111-8111-111111111111",
      now: 1400,
    })

    const resetRoom = resetRoomState({
      room: revealedRoom,
      memberId: "11111111-1111-4111-8111-111111111111",
      now: 1600,
    })

    expect(revealedRoom.revealed).toBe(true)
    expect(revealedRoom.history).toEqual([])
    expect(resetRoom.revealed).toBe(false)
    expect(resetRoom.members.every((member) => member.vote === null)).toBe(true)
  })

  it("stores a subtle round summary in room history when votes are revealed", () => {
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
      vote: "8",
      now: 1700,
    })

    const revealedRoom = revealRoomState({
      room: withVotes,
      memberId: "11111111-1111-4111-8111-111111111111",
      now: 1800,
    })

    expect(revealedRoom.history).toEqual([
      {
        average: "5.3",
        mode: "3",
        participantCount: 3,
        result: "5",
        revealedAt: 1800,
        round: 1,
        voteCount: 3,
      },
    ])
  })

  it("reroll removes only the current reveal from history", () => {
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

    const firstReveal = revealRoomState({
      room: castVoteState({
        room: castVoteState({
          room: two,
          memberId: "11111111-1111-4111-8111-111111111111",
          vote: "3",
          now: 1400,
        }),
        memberId: "22222222-2222-4222-8222-222222222222",
        vote: "5",
        now: 1500,
      }),
      memberId: "11111111-1111-4111-8111-111111111111",
      now: 1600,
    })

    const acceptedReset = resetRoomState({
      room: firstReveal,
      memberId: "11111111-1111-4111-8111-111111111111",
      now: 1700,
    })

    const secondReveal = revealRoomState({
      room: castVoteState({
        room: castVoteState({
          room: acceptedReset,
          memberId: "11111111-1111-4111-8111-111111111111",
          vote: "5",
          now: 1800,
        }),
        memberId: "22222222-2222-4222-8222-222222222222",
        vote: "8",
        now: 1900,
      }),
      memberId: "11111111-1111-4111-8111-111111111111",
      now: 2000,
    })

    const rerolledRoom = rerollRoomState({
      room: secondReveal,
      memberId: "11111111-1111-4111-8111-111111111111",
      now: 2100,
    })

    expect(secondReveal.history).toHaveLength(2)
    expect(rerolledRoom.revealed).toBe(false)
    expect(rerolledRoom.result).toBeNull()
    expect(rerolledRoom.members.every((member) => member.vote === null)).toBe(true)
    expect(rerolledRoom.history).toEqual([firstReveal.history[0]])
  })

  it("keeps every revealed round in history without truncating older entries", () => {
    const roomId = "amber-anchor-12"
    const memberOneId = "11111111-1111-4111-8111-111111111111"
    const memberTwoId = "22222222-2222-4222-8222-222222222222"

    let room = createRoomState({ roomId, now: 1000 })
    room = joinRoomState({
      room,
      memberId: memberOneId,
      name: "Kai",
      now: 1100,
    })
    room = joinRoomState({
      room,
      memberId: memberTwoId,
      name: "Noa",
      now: 1200,
    })

    for (let round = 1; round <= 7; round += 1) {
      room = castVoteState({
        room,
        memberId: memberOneId,
        vote: "3",
        now: 1300 + round,
      })
      room = castVoteState({
        room,
        memberId: memberTwoId,
        vote: "5",
        now: 1400 + round,
      })
      room = revealRoomState({
        room,
        memberId: memberOneId,
        now: 1500 + round,
      })
      room = resetRoomState({
        room,
        memberId: memberOneId,
        now: 1600 + round,
      })
    }

    expect(room.history).toHaveLength(7)
    expect(room.history.map((entry) => entry.round)).toEqual([7, 6, 5, 4, 3, 2, 1])
  })

  it("allows the revealed result to be edited and keeps history in sync", () => {
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
    const revealedRoom = revealRoomState({
      room: castVoteState({
        room: castVoteState({
          room: two,
          memberId: "11111111-1111-4111-8111-111111111111",
          vote: "3",
          now: 1400,
        }),
        memberId: "22222222-2222-4222-8222-222222222222",
        vote: "5",
        now: 1500,
      }),
      memberId: "11111111-1111-4111-8111-111111111111",
      now: 1600,
    })

    const updatedRoom = setRoomResultState({
      room: revealedRoom,
      memberId: "11111111-1111-4111-8111-111111111111",
      result: "8",
      now: 1700,
    })

    expect(updatedRoom.result).toBe("8")
    expect(updatedRoom.history[0]?.result).toBe("8")
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

  it("reports the card closest to the numeric average as the result", () => {
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
      vote: "8",
      now: 1700,
    })

    expect(calculateAverageResultCard(withVotes.members)).toBe("5")
  })

  it("reports the mode revealed vote and cast vote count", () => {
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
          vote: "5",
          now: 1500,
        }),
        memberId: "22222222-2222-4222-8222-222222222222",
        vote: "5",
        now: 1600,
      }),
      memberId: "33333333-3333-4333-8333-333333333333",
      vote: "8",
      now: 1700,
    })

    expect(calculateVoteMode(withVotes.members)).toBe("5")
    expect(countCastVotes(withVotes.members)).toBe(3)
  })

  it("does not count spectator votes toward total votes", () => {
    const room = createRoomState({ roomId: "amber-anchor-12", now: 1000 })

    expect(
      countCastVotes([
        {
          id: "11111111-1111-4111-8111-111111111111",
          joinedAt: 1200,
          name: "Kai",
          role: "participant",
          vote: "5",
        },
        {
          id: "22222222-2222-4222-8222-222222222222",
          joinedAt: 1300,
          name: "Noa",
          role: "spectator",
          vote: "8",
        },
        ...room.members,
      ]),
    ).toBe(1)
  })

  it("flags only the revealed low and high outliers away from the mode", () => {
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
      vote: "8",
      now: 1700,
    })

    expect(getVoteExtremesOutsideMode(withVotes.members)).toEqual({
      highestVote: "8",
      lowestVote: null,
    })
  })

  it("lets a member claim dealer and pass it back to the room", () => {
    const joinedRoom = joinRoomState({
      room: createRoomState({ roomId: "amber-anchor-12", now: 1000 }),
      memberId: "11111111-1111-4111-8111-111111111111",
      name: "Mae",
      now: 1200,
    })

    const claimedRoom = claimDealerState({
      room: joinedRoom,
      memberId: "11111111-1111-4111-8111-111111111111",
      now: 1300,
    })
    const reopenedRoom = passDealerState({
      room: claimedRoom,
      memberId: "11111111-1111-4111-8111-111111111111",
      now: 1400,
    })

    expect(getActiveDealer(claimedRoom)?.name).toBe("Mae")
    expect(reopenedRoom.dealerMemberId).toBeNull()
    expect(getActiveDealer(reopenedRoom)).toBeNull()
  })

  it("treats a departed dealer as unclaimed until they return", () => {
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
    const claimedRoom = claimDealerState({
      room: two,
      memberId: "11111111-1111-4111-8111-111111111111",
      now: 1400,
    })
    const departedDealerRoom = leaveRoomState({
      room: claimedRoom,
      memberId: "11111111-1111-4111-8111-111111111111",
      now: 1500,
    })

    const revealedRoom = revealRoomState({
      room: departedDealerRoom,
      memberId: "22222222-2222-4222-8222-222222222222",
      now: 1600,
    })

    expect(departedDealerRoom.dealerMemberId).toBe("11111111-1111-4111-8111-111111111111")
    expect(getActiveDealer(departedDealerRoom)).toBeNull()
    expect(revealedRoom.revealed).toBe(true)
  })

  it("blocks non-dealers from dealer-controlled actions while a dealer is active", () => {
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
    const claimedRoom = claimDealerState({
      room: two,
      memberId: "11111111-1111-4111-8111-111111111111",
      now: 1400,
    })

    expect(() =>
      revealRoomState({
        room: claimedRoom,
        memberId: "22222222-2222-4222-8222-222222222222",
        now: 1500,
      }),
    ).toThrowError("dealer_action_forbidden")
  })

  it("rejects a new claim while an active dealer already exists", () => {
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
    const claimedRoom = claimDealerState({
      room: two,
      memberId: "11111111-1111-4111-8111-111111111111",
      now: 1400,
    })

    expect(() =>
      claimDealerState({
        room: claimedRoom,
        memberId: "22222222-2222-4222-8222-222222222222",
        now: 1500,
      }),
    ).toThrowError("dealer_already_claimed")
  })
})

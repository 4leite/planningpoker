import { z } from "zod"

export const cardValues = ["0", "1", "2", "3", "5", "8", "13", "21", "34", "?"] as const
export const roomMemberRoleValues = ["participant", "spectator"] as const
export const roomLifetimeMs = 24 * 60 * 60 * 1000

export const roomIdSchema = z
  .string()
  .trim()
  .min(8)
  .max(48)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+){2,4}$/)

export const displayNameSchema = z.string().trim().min(2).max(24)
export const cardValueSchema = z.enum(cardValues)
export const roomMemberRoleSchema = z.enum(roomMemberRoleValues)

export const roomMemberSchema = z.object({
  id: z.string().uuid(),
  name: displayNameSchema,
  role: roomMemberRoleSchema,
  vote: cardValueSchema.nullable(),
  joinedAt: z.number().int().nonnegative(),
})

export const roomHistoryEntrySchema = z.object({
  round: z.number().int().positive(),
  average: z.string().nullable(),
  mode: cardValueSchema.nullable(),
  result: cardValueSchema.nullable(),
  participantCount: z.number().int().nonnegative(),
  voteCount: z.number().int().nonnegative(),
  revealedAt: z.number().int().nonnegative(),
})

export const roomStateSchema = z.object({
  roomId: roomIdSchema,
  createdAt: z.number().int().nonnegative(),
  expiresAt: z.number().int().nonnegative(),
  history: z.array(roomHistoryEntrySchema).default([]),
  result: cardValueSchema.nullable(),
  revealed: z.boolean(),
  members: z.array(roomMemberSchema),
  version: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
})

export const roomUpdatedEventSchema = z.object({
  type: z.literal("room.updated"),
  roomId: roomIdSchema,
  version: z.number().int().nonnegative(),
  room: roomStateSchema,
})

export type CardValue = z.infer<typeof cardValueSchema>
export type RoomHistoryEntry = z.infer<typeof roomHistoryEntrySchema>
export type RoomMemberRole = z.infer<typeof roomMemberRoleSchema>
export type RoomMember = z.infer<typeof roomMemberSchema>
export type RoomState = z.infer<typeof roomStateSchema>
export type RoomUpdatedEvent = z.infer<typeof roomUpdatedEventSchema>

const numericCardValues = new Map<CardValue, number>([
  ["0", 0],
  ["1", 1],
  ["2", 2],
  ["3", 3],
  ["5", 5],
  ["8", 8],
  ["13", 13],
  ["21", 21],
  ["34", 34],
])

const numericCardEntries = cardValues.flatMap((cardValue) => {
  const numericValue = numericCardValues.get(cardValue)
  return numericValue === undefined ? [] : [{ cardValue, numericValue }]
})

const updateRoom = (
  room: RoomState,
  {
    history = room.history,
    members = room.members,
    result = room.result,
    revealed = room.revealed,
    now,
  }: {
    history?: RoomHistoryEntry[]
    members?: RoomMember[]
    result?: CardValue | null
    revealed?: boolean
    now: number
  },
) => {
  if (
    history === room.history &&
    members === room.members &&
    result === room.result &&
    revealed === room.revealed
  ) {
    return room
  }

  return {
    ...room,
    history,
    members,
    result,
    revealed,
    version: room.version + 1,
    updatedAt: now,
  }
}

const getNameKey = (value: string) => value.trim().toLocaleLowerCase()

const getNumericVoteEntries = (members: RoomMember[]) =>
  members.flatMap((member) => {
    if (member.vote === null) {
      return []
    }

    const numericVote = numericCardValues.get(member.vote)
    return numericVote === undefined ? [] : [{ cardValue: member.vote, numericVote }]
  })

export const createRoomState = ({ roomId, now }: { roomId: string; now: number }) =>
  roomStateSchema.parse({
    roomId,
    createdAt: now,
    expiresAt: now + roomLifetimeMs,
    history: [],
    result: null,
    revealed: false,
    members: [],
    version: 0,
    updatedAt: now,
  })

export const getParticipants = (room: RoomState) =>
  room.members.filter((member) => member.role === "participant")

export const getSpectators = (room: RoomState) =>
  room.members.filter((member) => member.role === "spectator")

export const getVoteProgress = (room: RoomState) => {
  const participants = getParticipants(room)
  const readyCount = participants.filter((member) => member.vote !== null).length

  return {
    participantCount: participants.length,
    readyCount,
  }
}

export const calculateNumericAverage = (members: RoomMember[]) => {
  const numericVotes = getNumericVoteEntries(members).map((entry) => entry.numericVote)

  if (numericVotes.length === 0) {
    return null
  }

  return numericVotes.reduce((total, value) => total + value, 0) / numericVotes.length
}

export const calculateAverageResultCard = (members: RoomMember[]) => {
  const average = calculateNumericAverage(members)

  if (average === null) {
    return null
  }

  let closestCard: CardValue | null = null
  let closestDistance = Number.POSITIVE_INFINITY

  for (const { cardValue, numericValue } of numericCardEntries) {
    const distance = Math.abs(numericValue - average)

    if (distance < closestDistance) {
      closestCard = cardValue
      closestDistance = distance
    }
  }

  return closestCard
}

export const countCastVotes = (members: RoomMember[]) =>
  members.reduce(
    (count, member) => count + (member.role === "participant" && member.vote !== null ? 1 : 0),
    0,
  )

export const calculateVoteMode = (members: RoomMember[]) => {
  const voteCounts = members.reduce((counts, member) => {
    if (member.vote !== null) {
      counts.set(member.vote, (counts.get(member.vote) ?? 0) + 1)
    }

    return counts
  }, new Map<CardValue, number>())

  let highestCount = 0
  let mode: CardValue | null = null

  for (const vote of cardValues) {
    const count = voteCounts.get(vote) ?? 0

    if (count > highestCount) {
      highestCount = count
      mode = vote
    }
  }

  return mode
}

export const getVoteExtremesOutsideMode = (members: RoomMember[]) => {
  const numericVotes = getNumericVoteEntries(members).sort(
    (left, right) => left.numericVote - right.numericVote,
  )
  const mode = calculateVoteMode(members)

  if (numericVotes.length === 0 || mode === null) {
    return {
      highestVote: null,
      lowestVote: null,
    }
  }

  const lowestVote = numericVotes[0]?.cardValue === mode ? null : numericVotes[0]?.cardValue
  const highestVote =
    numericVotes.at(-1)?.cardValue === mode ? null : numericVotes.at(-1)?.cardValue

  return {
    highestVote: highestVote ?? null,
    lowestVote: lowestVote ?? null,
  }
}

const createRoomHistoryEntry = (room: RoomState, now: number) => {
  const participantCount = getParticipants(room).length
  const voteCount = countCastVotes(room.members)

  if (voteCount === 0) {
    return null
  }

  return roomHistoryEntrySchema.parse({
    round: (room.history[0]?.round ?? 0) + 1,
    average: formatAverageVote(calculateNumericAverage(room.members)),
    mode: calculateVoteMode(room.members),
    result: calculateAverageResultCard(room.members),
    participantCount,
    voteCount,
    revealedAt: now,
  })
}

export const formatAverageVote = (value: number | null) => {
  if (value === null) {
    return null
  }

  return Number.isInteger(value) ? `${value}` : value.toFixed(1)
}

export const joinRoomState = ({
  room,
  memberId,
  name,
  now,
}: {
  room: RoomState
  memberId: string
  name: string
  now: number
}) => {
  const parsedName = displayNameSchema.parse(name)
  const duplicateName = room.members.find(
    (member) => member.id !== memberId && getNameKey(member.name) === getNameKey(parsedName),
  )

  if (duplicateName) {
    throw new Error("display_name_taken")
  }

  const existingMember = room.members.find((member) => member.id === memberId)
  if (existingMember) {
    return room
  }

  return updateRoom(room, {
    members: room.members.concat({
      id: memberId,
      name: parsedName,
      role: "participant",
      vote: null,
      joinedAt: now,
    }),
    now,
  })
}

export const leaveRoomState = ({
  room,
  memberId,
  now,
}: {
  room: RoomState
  memberId: string
  now: number
}) => {
  const nextMembers = room.members.filter((member) => member.id !== memberId)

  if (nextMembers.length === room.members.length) {
    return room
  }

  return updateRoom(room, {
    members: nextMembers,
    now,
  })
}

export const changeRoleState = ({
  room,
  memberId,
  role,
  now,
}: {
  room: RoomState
  memberId: string
  role: RoomMemberRole
  now: number
}) => {
  const member = room.members.find((entry) => entry.id === memberId)

  if (!member) {
    throw new Error("room_member_missing")
  }

  if (member.role === role) {
    return room
  }

  return updateRoom(room, {
    members: room.members.map((entry) => {
      if (entry.id !== memberId) {
        return entry
      }

      return {
        ...entry,
        role,
        vote: role === "spectator" ? null : entry.vote,
      }
    }),
    now,
  })
}

export const castVoteState = ({
  room,
  memberId,
  vote,
  now,
}: {
  room: RoomState
  memberId: string
  vote: CardValue
  now: number
}) => {
  const member = room.members.find((entry) => entry.id === memberId)

  if (!member) {
    throw new Error("room_member_missing")
  }

  if (member.role !== "participant") {
    throw new Error("spectators_cannot_vote")
  }

  if (room.revealed) {
    throw new Error("round_already_revealed")
  }

  if (member.vote === vote) {
    return room
  }

  return updateRoom(room, {
    members: room.members.map((entry) =>
      entry.id === memberId
        ? {
            ...entry,
            vote,
          }
        : entry,
    ),
    now,
  })
}

export const revealRoomState = ({ room, now }: { room: RoomState; now: number }) => {
  if (room.revealed) {
    return room
  }

  const historyEntry = createRoomHistoryEntry(room, now)
  const result = calculateAverageResultCard(room.members)

  return updateRoom(room, {
    history: historyEntry ? [historyEntry, ...room.history] : room.history,
    result,
    revealed: true,
    now,
  })
}

export const setRoomResultState = ({
  room,
  result,
  now,
}: {
  room: RoomState
  result: CardValue
  now: number
}) => {
  if (!room.revealed) {
    throw new Error("round_not_revealed")
  }

  const nextHistory = room.history[0]
    ? [
        {
          ...room.history[0],
          result,
        },
        ...room.history.slice(1),
      ]
    : room.history

  return updateRoom(room, {
    history: nextHistory,
    result,
    now,
  })
}

export const resetRoomState = ({ room, now }: { room: RoomState; now: number }) => {
  const nextMembers = room.members.map((member) => ({
    ...member,
    vote: null,
  }))

  const didChange = room.revealed || room.members.some((member) => member.vote !== null)
  if (!didChange) {
    return room
  }

  return updateRoom(room, {
    members: nextMembers,
    result: null,
    revealed: false,
    now,
  })
}

export const rerollRoomState = ({ room, now }: { room: RoomState; now: number }) => {
  const resetRoom = resetRoomState({ room, now })

  if (resetRoom === room || !room.revealed || room.history.length === 0) {
    return resetRoom
  }

  return updateRoom(resetRoom, {
    history: room.history.slice(1),
    now,
  })
}

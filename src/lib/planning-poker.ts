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

export const roomStateSchema = z.object({
  roomId: roomIdSchema,
  createdAt: z.number().int().nonnegative(),
  expiresAt: z.number().int().nonnegative(),
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

const updateRoom = (
  room: RoomState,
  {
    members = room.members,
    revealed = room.revealed,
    now,
  }: {
    members?: RoomMember[]
    revealed?: boolean
    now: number
  },
) => {
  if (members === room.members && revealed === room.revealed) {
    return room
  }

  return {
    ...room,
    members,
    revealed,
    version: room.version + 1,
    updatedAt: now,
  }
}

const getNameKey = (value: string) => value.trim().toLocaleLowerCase()

export const createRoomState = ({ roomId, now }: { roomId: string; now: number }) =>
  roomStateSchema.parse({
    roomId,
    createdAt: now,
    expiresAt: now + roomLifetimeMs,
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
  const numericVotes = members
    .map((member) => member.vote)
    .flatMap((vote) => {
      if (vote === null) {
        return []
      }

      const numericVote = numericCardValues.get(vote)
      return numericVote === undefined ? [] : [numericVote]
    })

  if (numericVotes.length === 0) {
    return null
  }

  return numericVotes.reduce((total, value) => total + value, 0) / numericVotes.length
}

export const countCastVotes = (members: RoomMember[]) =>
  members.reduce((count, member) => count + (member.vote === null ? 0 : 1), 0)

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

  return updateRoom(room, {
    revealed: true,
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
    revealed: false,
    now,
  })
}

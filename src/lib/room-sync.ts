import { z } from "zod"

import {
  cardValueSchema,
  displayNameSchema,
  roomIdSchema,
  roomMemberRoleSchema,
  roomStateSchema,
  type RoomState,
} from "#/lib/planning-poker"

export const createRoomRequestSchema = z.object({})

export const createRoomResponseSchema = z.object({
  roomId: roomIdSchema,
  error: z.string().min(1).optional(),
})

export const roomSnapshotRequestSchema = z.object({
  roomId: roomIdSchema,
})

export const joinRoomRequestSchema = z.object({
  roomId: roomIdSchema,
  memberId: z.string().uuid(),
  name: displayNameSchema,
})

export const leaveRoomRequestSchema = z.object({
  roomId: roomIdSchema,
  memberId: z.string().uuid(),
})

export const changeRoleRequestSchema = z.object({
  roomId: roomIdSchema,
  memberId: z.string().uuid(),
  role: roomMemberRoleSchema,
})

export const castVoteRequestSchema = z.object({
  roomId: roomIdSchema,
  memberId: z.string().uuid(),
  vote: cardValueSchema,
})

export const revealRoomRequestSchema = z.object({
  roomId: roomIdSchema,
})

export const resetRoomRequestSchema = z.object({
  roomId: roomIdSchema,
})

export const rerollRoomRequestSchema = z.object({
  roomId: roomIdSchema,
})

export const setRoomResultRequestSchema = z.object({
  roomId: roomIdSchema,
  result: cardValueSchema,
})

const roomSocketMutationIdSchema = z.string().min(1).max(64)

export const roomSocketActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("room.join"),
    mutationId: roomSocketMutationIdSchema,
    memberId: z.string().uuid(),
    name: displayNameSchema,
  }),
  z.object({
    type: z.literal("room.leave"),
    mutationId: roomSocketMutationIdSchema,
    memberId: z.string().uuid(),
  }),
  z.object({
    type: z.literal("room.changeRole"),
    mutationId: roomSocketMutationIdSchema,
    memberId: z.string().uuid(),
    role: roomMemberRoleSchema,
  }),
  z.object({
    type: z.literal("room.castVote"),
    mutationId: roomSocketMutationIdSchema,
    memberId: z.string().uuid(),
    vote: cardValueSchema,
  }),
  z.object({
    type: z.literal("room.reveal"),
    mutationId: roomSocketMutationIdSchema,
  }),
  z.object({
    type: z.literal("room.reset"),
    mutationId: roomSocketMutationIdSchema,
  }),
  z.object({
    type: z.literal("room.reroll"),
    mutationId: roomSocketMutationIdSchema,
  }),
  z.object({
    type: z.literal("room.setResult"),
    mutationId: roomSocketMutationIdSchema,
    result: cardValueSchema,
  }),
])

export const roomSocketSnapshotMessageSchema = z.object({
  type: z.literal("room.snapshot"),
  roomId: roomIdSchema,
  room: roomStateSchema.nullable(),
  mutationId: roomSocketMutationIdSchema.optional(),
})

export const roomSocketErrorMessageSchema = z.object({
  type: z.literal("room.error"),
  mutationId: roomSocketMutationIdSchema,
  error: z.string().min(1),
})

export const roomSocketMessageSchema = z.discriminatedUnion("type", [
  roomSocketSnapshotMessageSchema,
  roomSocketErrorMessageSchema,
])

export type CreateRoomRequest = z.infer<typeof createRoomRequestSchema>
export type CreateRoomResponse = z.infer<typeof createRoomResponseSchema>
export type RoomSnapshotRequest = z.infer<typeof roomSnapshotRequestSchema>
export type JoinRoomRequest = z.infer<typeof joinRoomRequestSchema>
export type LeaveRoomRequest = z.infer<typeof leaveRoomRequestSchema>
export type ChangeRoleRequest = z.infer<typeof changeRoleRequestSchema>
export type CastVoteRequest = z.infer<typeof castVoteRequestSchema>
export type RevealRoomRequest = z.infer<typeof revealRoomRequestSchema>
export type ResetRoomRequest = z.infer<typeof resetRoomRequestSchema>
export type RerollRoomRequest = z.infer<typeof rerollRoomRequestSchema>
export type SetRoomResultRequest = z.infer<typeof setRoomResultRequestSchema>
export type RoomSocketAction = z.infer<typeof roomSocketActionSchema>
export type RoomSocketSnapshotMessage = z.infer<typeof roomSocketSnapshotMessageSchema>
export type RoomSocketErrorMessage = z.infer<typeof roomSocketErrorMessageSchema>
export type RoomSocketMessage = z.infer<typeof roomSocketMessageSchema>

export const reconcileRoomSnapshot = ({
  currentRoom,
  nextRoom,
}: {
  currentRoom: RoomState | null | undefined
  nextRoom: RoomState | null
}) => {
  if (!nextRoom) {
    return null
  }

  if (!currentRoom || nextRoom.version >= currentRoom.version) {
    return nextRoom
  }

  return currentRoom
}

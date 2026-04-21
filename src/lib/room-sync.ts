import { z } from "zod"

import {
  cardValueSchema,
  displayNameSchema,
  roomIdSchema,
  roomMemberRoleSchema,
  type RoomState,
} from "#/lib/planning-poker"

export const createRoomRequestSchema = z.object({})

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

export type CreateRoomRequest = z.infer<typeof createRoomRequestSchema>
export type RoomSnapshotRequest = z.infer<typeof roomSnapshotRequestSchema>
export type JoinRoomRequest = z.infer<typeof joinRoomRequestSchema>
export type LeaveRoomRequest = z.infer<typeof leaveRoomRequestSchema>
export type ChangeRoleRequest = z.infer<typeof changeRoleRequestSchema>
export type CastVoteRequest = z.infer<typeof castVoteRequestSchema>
export type RevealRoomRequest = z.infer<typeof revealRoomRequestSchema>
export type ResetRoomRequest = z.infer<typeof resetRoomRequestSchema>
export type RerollRoomRequest = z.infer<typeof rerollRoomRequestSchema>
export type SetRoomResultRequest = z.infer<typeof setRoomResultRequestSchema>

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

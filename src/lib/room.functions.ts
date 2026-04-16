import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import { z } from "zod"

import {
  cardValueSchema,
  castVoteState,
  changeRoleState,
  joinRoomState,
  leaveRoomState,
  resetRoomState,
  revealRoomState,
  roomIdSchema,
  roomMemberRoleSchema,
} from "#/lib/planning-poker"
import { generateRoomId } from "#/lib/room-id"
import { assertRoomCreateAllowed } from "#/lib/room-rate-limit.server"
import { createRoom, getRoomSnapshot, mutateRoom, type RoomBackendConfig } from "#/lib/room.server"

const roomIdInputSchema = z.object({
  roomId: roomIdSchema,
})

const joinRoomInputSchema = z.object({
  roomId: roomIdSchema,
  memberId: z.string().uuid(),
  name: z.string(),
})

const leaveRoomInputSchema = z.object({
  roomId: roomIdSchema,
  memberId: z.string().uuid(),
})

const changeRoleInputSchema = z.object({
  roomId: roomIdSchema,
  memberId: z.string().uuid(),
  role: roomMemberRoleSchema,
})

const castVoteInputSchema = z.object({
  roomId: roomIdSchema,
  memberId: z.string().uuid(),
  vote: cardValueSchema,
})

const getRoomBackend = (): RoomBackendConfig => {
  if (process.env.ROOM_BACKEND === "memory") {
    return { kind: "memory" }
  }

  const redisUrl = process.env.REDIS_URL
  if (process.env.ROOM_BACKEND === "redis") {
    if (!redisUrl) {
      throw new Error("REDIS_URL is not configured")
    }

    return {
      kind: "redis",
      url: redisUrl,
    }
  }

  if (redisUrl) {
    return {
      kind: "redis",
      url: redisUrl,
    }
  }

  if (process.env.NODE_ENV !== "production") {
    return { kind: "memory" }
  }

  throw new Error("REDIS_URL is not configured")
}

export const createRoomFn = createServerFn({ method: "POST" }).handler(async () => {
  assertRoomCreateAllowed(getRequest(), Date.now())

  const backend = getRoomBackend()

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const roomId = generateRoomId()
    const room = await createRoom(backend, roomId, Date.now())

    if (room) {
      return { roomId: room.roomId }
    }
  }

  throw new Error("room_id_generation_failed")
})

export const getRoomSnapshotFn = createServerFn({ method: "GET" })
  .inputValidator(roomIdInputSchema)
  .handler(async ({ data }) => {
    const backend = getRoomBackend()
    return getRoomSnapshot(backend, data.roomId)
  })

export const joinRoom = createServerFn({ method: "POST" })
  .inputValidator(joinRoomInputSchema)
  .handler(async ({ data }) => {
    const backend = getRoomBackend()
    const room = await mutateRoom(backend, data.roomId, (currentRoom) =>
      joinRoomState({
        room: currentRoom,
        memberId: data.memberId,
        name: data.name,
        now: Date.now(),
      }),
    )

    if (!room) {
      throw new Error("room_not_found")
    }

    return room
  })

export const leaveRoom = createServerFn({ method: "POST" })
  .inputValidator(leaveRoomInputSchema)
  .handler(async ({ data }) => {
    const backend = getRoomBackend()
    const room = await mutateRoom(backend, data.roomId, (currentRoom) =>
      leaveRoomState({
        room: currentRoom,
        memberId: data.memberId,
        now: Date.now(),
      }),
    )

    if (!room) {
      throw new Error("room_not_found")
    }

    return room
  })

export const changeRole = createServerFn({ method: "POST" })
  .inputValidator(changeRoleInputSchema)
  .handler(async ({ data }) => {
    const backend = getRoomBackend()
    const room = await mutateRoom(backend, data.roomId, (currentRoom) =>
      changeRoleState({
        room: currentRoom,
        memberId: data.memberId,
        role: data.role,
        now: Date.now(),
      }),
    )

    if (!room) {
      throw new Error("room_not_found")
    }

    return room
  })

export const castVote = createServerFn({ method: "POST" })
  .inputValidator(castVoteInputSchema)
  .handler(async ({ data }) => {
    const backend = getRoomBackend()
    const room = await mutateRoom(backend, data.roomId, (currentRoom) =>
      castVoteState({
        room: currentRoom,
        memberId: data.memberId,
        vote: data.vote,
        now: Date.now(),
      }),
    )

    if (!room) {
      throw new Error("room_not_found")
    }

    return room
  })

export const revealVotes = createServerFn({ method: "POST" })
  .inputValidator(roomIdInputSchema)
  .handler(async ({ data }) => {
    const backend = getRoomBackend()
    const room = await mutateRoom(backend, data.roomId, (currentRoom) =>
      revealRoomState({
        room: currentRoom,
        now: Date.now(),
      }),
    )

    if (!room) {
      throw new Error("room_not_found")
    }

    return room
  })

export const resetRound = createServerFn({ method: "POST" })
  .inputValidator(roomIdInputSchema)
  .handler(async ({ data }) => {
    const backend = getRoomBackend()
    const room = await mutateRoom(backend, data.roomId, (currentRoom) =>
      resetRoomState({
        room: currentRoom,
        now: Date.now(),
      }),
    )

    if (!room) {
      throw new Error("room_not_found")
    }

    return room
  })

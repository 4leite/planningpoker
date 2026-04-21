import { createServerFn } from "@tanstack/react-start"
import { getRequest, setResponseHeader } from "@tanstack/react-start/server"

import { generateRoomId } from "#/lib/room-id"
import { assertRoomCreateAllowed } from "#/lib/room-rate-limit.server"
import { revealRoomServerState } from "#/lib/room-reveal.server"
import {
  castVoteRequestSchema,
  changeRoleRequestSchema,
  createRoomRequestSchema,
  joinRoomRequestSchema,
  leaveRoomRequestSchema,
  rerollRoomRequestSchema,
  resetRoomRequestSchema,
  roomSnapshotRequestSchema,
  setRoomResultRequestSchema,
} from "#/lib/room-sync"
import {
  castVoteServerState,
  changeRoleServerState,
  createRoom,
  getRoomSnapshot,
  joinRoomServerState,
  leaveRoomServerState,
  mutateRoom,
  rerollRoomServerState,
  resetRoomServerState,
  setRoomResultServerState,
  type RoomBackendConfig,
} from "#/lib/room.server"

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

export const createRoomFn = createServerFn({ method: "POST" })
  .inputValidator(createRoomRequestSchema)
  .handler(async () => {
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
  .inputValidator(roomSnapshotRequestSchema)
  .handler(async ({ data }) => {
    setResponseHeader("Cache-Control", "no-store")
    const backend = getRoomBackend()
    return getRoomSnapshot(backend, data.roomId)
  })

export const joinRoom = createServerFn({ method: "POST" })
  .inputValidator(joinRoomRequestSchema)
  .handler(async ({ data }) => {
    const backend = getRoomBackend()
    const room = await mutateRoom(backend, data.roomId, (currentRoom) =>
      joinRoomServerState({
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
  .inputValidator(leaveRoomRequestSchema)
  .handler(async ({ data }) => {
    const backend = getRoomBackend()
    const room = await mutateRoom(backend, data.roomId, (currentRoom) =>
      leaveRoomServerState({
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
  .inputValidator(changeRoleRequestSchema)
  .handler(async ({ data }) => {
    const backend = getRoomBackend()
    const room = await mutateRoom(backend, data.roomId, (currentRoom) =>
      changeRoleServerState({
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
  .inputValidator(castVoteRequestSchema)
  .handler(async ({ data }) => {
    const backend = getRoomBackend()
    const room = await mutateRoom(backend, data.roomId, (currentRoom) =>
      castVoteServerState({
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
  .inputValidator(roomSnapshotRequestSchema)
  .handler(async ({ data }) => {
    const backend = getRoomBackend()
    const room = await mutateRoom(backend, data.roomId, (currentRoom) =>
      revealRoomServerState({
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
  .inputValidator(resetRoomRequestSchema)
  .handler(async ({ data }) => {
    const backend = getRoomBackend()
    const room = await mutateRoom(backend, data.roomId, (currentRoom) =>
      resetRoomServerState({
        room: currentRoom,
        now: Date.now(),
      }),
    )

    if (!room) {
      throw new Error("room_not_found")
    }

    return room
  })

export const rerollRound = createServerFn({ method: "POST" })
  .inputValidator(rerollRoomRequestSchema)
  .handler(async ({ data }) => {
    const backend = getRoomBackend()
    const room = await mutateRoom(backend, data.roomId, (currentRoom) =>
      rerollRoomServerState({
        room: currentRoom,
        now: Date.now(),
      }),
    )

    if (!room) {
      throw new Error("room_not_found")
    }

    return room
  })

export const setRoomResult = createServerFn({ method: "POST" })
  .inputValidator(setRoomResultRequestSchema)
  .handler(async ({ data }) => {
    const backend = getRoomBackend()
    const room = await mutateRoom(backend, data.roomId, (currentRoom) =>
      setRoomResultServerState({
        room: currentRoom,
        result: data.result,
        now: Date.now(),
      }),
    )

    if (!room) {
      throw new Error("room_not_found")
    }

    return room
  })

import { DurableObject } from "cloudflare:workers"

import {
  createRoomState,
  joinRoomState,
  leaveRoomState,
  revealRoomState,
  rerollRoomState,
  resetRoomState,
  setRoomResultState,
  changeRoleState,
  castVoteState,
  roomLifetimeMs,
  roomStateSchema,
  type RoomState,
} from "#/lib/planning-poker"
import {
  roomSocketActionSchema,
  roomSocketErrorMessageSchema,
  roomSocketSnapshotMessageSchema,
  type RoomSocketAction,
} from "#/lib/room-sync"

const ROOM_STORAGE_KEY = "room"

export class RoomDurableObject extends DurableObject {
  roomId = this.ctx.id.name ?? null

  async fetch(request: Request) {
    const url = new URL(request.url)
    const requestRoomId = url.searchParams.get("roomId")
    if (requestRoomId) {
      this.roomId = requestRoomId
    }

    if (url.pathname === "/create" && request.method === "POST") {
      return this.handleCreate(requestRoomId)
    }

    if (url.pathname === "/socket" && request.method === "GET") {
      return this.handleSocket(requestRoomId)
    }

    return new Response("Not found", { status: 404 })
  }

  async alarm() {
    const room = await this.getActiveRoom(Date.now())
    if (!room || room.expiresAt <= Date.now()) {
      await this.deleteRoom()
    }
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    if (typeof message !== "string") {
      return
    }

    let action: RoomSocketAction
    try {
      action = roomSocketActionSchema.parse(JSON.parse(message))
    } catch {
      return
    }

    try {
      const room = await this.applyAction(action)
      this.sendSnapshot(ws, room, action.mutationId)

      if (room) {
        this.broadcastSnapshot(room)
      }
    } catch (error) {
      this.sendError(ws, action.mutationId, error)
    }
  }

  async handleCreate(requestRoomId: string | null) {
    const existingRoom = await this.getActiveRoom(Date.now())
    if (existingRoom) {
      return new Response(null, { status: 409 })
    }

    const roomId = requestRoomId ?? this.roomId
    if (!roomId) {
      return new Response(null, { status: 500 })
    }

    this.roomId = roomId

    const now = Date.now()
    const room = createRoomState({ roomId, now })
    await this.putRoom(room)

    return Response.json({ roomId: room.roomId }, { status: 201 })
  }

  async handleSocket(requestRoomId: string | null) {
    if (requestRoomId) {
      this.roomId = requestRoomId
    }

    const webSocketPair = new WebSocketPair()
    const client = webSocketPair[0]
    const server = webSocketPair[1]

    this.ctx.acceptWebSocket(server)

    const room = await this.getActiveRoom(Date.now())
    this.sendSnapshot(server, room)

    return new Response(null, {
      status: 101,
      webSocket: client,
      headers: {
        "Cache-Control": "no-store",
      },
    })
  }

  async applyAction(action: RoomSocketAction) {
    const now = Date.now()
    const room = await this.getActiveRoom(now)
    if (!room) {
      throw new Error("room_not_found")
    }

    const nextRoom = this.mutateRoom(room, action, now)
    const roomWithLifecycle = this.withLifecycleUpdate(room, nextRoom, action, now)

    await this.putRoom(roomWithLifecycle)
    return roomWithLifecycle
  }

  mutateRoom(room: RoomState, action: RoomSocketAction, now: number) {
    switch (action.type) {
      case "room.join":
        return joinRoomState({
          room,
          memberId: action.memberId,
          name: action.name,
          now,
        })
      case "room.leave":
        return leaveRoomState({
          room,
          memberId: action.memberId,
          now,
        })
      case "room.changeRole":
        return changeRoleState({
          room,
          memberId: action.memberId,
          role: action.role,
          now,
        })
      case "room.castVote":
        return castVoteState({
          room,
          memberId: action.memberId,
          vote: action.vote,
          now,
        })
      case "room.reveal":
        return revealRoomState({ room, now })
      case "room.reset":
        return resetRoomState({ room, now })
      case "room.reroll":
        return rerollRoomState({ room, now })
      case "room.setResult":
        return setRoomResultState({
          room,
          result: action.result,
          now,
        })
    }
  }

  withLifecycleUpdate(room: RoomState, nextRoom: RoomState, action: RoomSocketAction, now: number) {
    if (nextRoom.version === room.version) {
      return nextRoom
    }

    if (action.type !== "room.reset" && action.type !== "room.setResult") {
      return nextRoom
    }

    return {
      ...nextRoom,
      expiresAt: now + roomLifetimeMs,
    }
  }

  async getActiveRoom(now: number) {
    const storedRoom = await this.ctx.storage.get(ROOM_STORAGE_KEY)
    const room = roomStateSchema.nullable().parse(storedRoom ?? null)
    if (!room) {
      return null
    }

    if (room.expiresAt > now) {
      return room
    }

    await this.deleteRoom()
    return null
  }

  async putRoom(room: RoomState) {
    await this.ctx.storage.put(ROOM_STORAGE_KEY, room)
    await this.ctx.storage.setAlarm(room.expiresAt)
  }

  async deleteRoom() {
    await this.ctx.storage.delete(ROOM_STORAGE_KEY)
    await this.ctx.storage.deleteAlarm()
  }

  sendSnapshot(ws: WebSocket, room: RoomState | null, mutationId?: string) {
    const roomId = room?.roomId ?? this.roomId
    if (!roomId) {
      return
    }

    ws.send(
      JSON.stringify(
        roomSocketSnapshotMessageSchema.parse({
          type: "room.snapshot",
          roomId,
          room,
          mutationId,
        }),
      ),
    )
  }

  sendError(ws: WebSocket, mutationId: string, error: unknown) {
    const message = error instanceof Error ? error.message : "room_action_failed"
    ws.send(
      JSON.stringify(
        roomSocketErrorMessageSchema.parse({
          type: "room.error",
          mutationId,
          error: message,
        }),
      ),
    )
  }

  broadcastSnapshot(room: RoomState) {
    for (const ws of this.ctx.getWebSockets()) {
      this.sendSnapshot(ws, room)
    }
  }
}

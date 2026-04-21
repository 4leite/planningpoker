import { DurableObject } from "cloudflare:workers"

import { type RoomState } from "#/lib/planning-poker"
import { createRoomAuthority } from "#/lib/room-authority"
import {
  roomSocketActionSchema,
  roomSocketErrorMessageSchema,
  roomSocketSnapshotMessageSchema,
  type RoomSocketAction,
} from "#/lib/room-sync"

const ROOM_STORAGE_KEY = "room"

export class RoomDurableObject extends DurableObject {
  roomId = this.ctx.id.name ?? null

  authority = createRoomAuthority({
    storage: {
      getRoom: () => this.ctx.storage.get(ROOM_STORAGE_KEY),
      putRoom: (room) => this.ctx.storage.put(ROOM_STORAGE_KEY, room),
      deleteRoom: async () => {
        await this.ctx.storage.delete(ROOM_STORAGE_KEY)
      },
      setAlarm: (expiresAt) => this.ctx.storage.setAlarm(expiresAt),
      deleteAlarm: () => this.ctx.storage.deleteAlarm(),
    },
  })

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
    await this.authority.getActiveRoom()
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
    const roomId = requestRoomId ?? this.roomId
    if (!roomId) {
      return new Response(null, { status: 500 })
    }

    this.roomId = roomId

    const room = await this.authority.createRoom(roomId)
    if (!room) {
      return new Response(null, { status: 409 })
    }

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

    const room = await this.authority.getActiveRoom()
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
    return this.authority.applyAction(action)
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

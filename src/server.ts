import handler from "@tanstack/react-start/server-entry"

import { roomIdSchema } from "#/lib/planning-poker"
import { generateRoomId } from "#/lib/room-id"
import { assertRoomCreateAllowed } from "#/lib/room-rate-limit.server"

export { RoomDurableObject } from "#/lib/room-durable-object.server"

const isNavigationRequest = (request: Request) =>
  request.headers.get("sec-fetch-mode") === "navigate"

const createRoomFailureResponse = (request: Request, error: string, status: number) => {
  if (isNavigationRequest(request)) {
    const redirectUrl = new URL(request.url)
    redirectUrl.pathname = "/"
    redirectUrl.searchParams.set("createError", error)
    return Response.redirect(redirectUrl.toString(), 303)
  }

  return Response.json({ error }, { status })
}

const createRoom = async (request: Request, env: Env) => {
  try {
    assertRoomCreateAllowed(request, Date.now())

    for (let attempt = 0; attempt < 12; attempt += 1) {
      const roomId = generateRoomId()
      const response = await env.ROOMS.getByName(roomId).fetch(
        `https://room.internal/create?roomId=${encodeURIComponent(roomId)}`,
        {
          method: "POST",
        },
      )

      if (response.status === 409) {
        continue
      }

      if (!response.ok) {
        return createRoomFailureResponse(request, "room_create_failed", 500)
      }

      const room = await response.json<{ roomId?: string }>()
      if (!room.roomId) {
        return createRoomFailureResponse(request, "room_create_failed", 500)
      }

      if (isNavigationRequest(request)) {
        return Response.redirect(new URL(`/r/${room.roomId}`, request.url).toString(), 303)
      }

      return Response.json(room)
    }

    return createRoomFailureResponse(request, "room_id_generation_failed", 500)
  } catch (error) {
    console.error("create room failed", error)
    return createRoomFailureResponse(request, "room_create_failed", 500)
  }
}

export default {
  fetch(request: Request, env: Env) {
    const url = new URL(request.url)

    if (url.pathname === "/api/rooms/create" && request.method === "POST") {
      return createRoom(request, env)
    }

    const roomSocketMatch = url.pathname.match(/^\/api\/rooms\/([^/]+)\/socket$/)

    if (roomSocketMatch) {
      const roomId = roomIdSchema.parse(roomSocketMatch[1])
      const upgradeHeader = request.headers.get("upgrade")

      if (upgradeHeader?.toLowerCase() !== "websocket") {
        return new Response("Expected Upgrade: websocket", { status: 426 })
      }

      return env.ROOMS.getByName(roomId).fetch(
        `https://room.internal/socket?roomId=${encodeURIComponent(roomId)}`,
        {
          headers: request.headers,
        },
      )
    }

    return handler.fetch(request)
  },
}

import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import { env } from "cloudflare:workers"

import { generateRoomId } from "#/lib/room-id"
import { assertRoomCreateAllowed } from "#/lib/room-rate-limit.server"
import { createRoomResponseSchema } from "#/lib/room-sync"

const createRoomInDurableObject = async (roomId: string) => {
  const response = await env.ROOMS.getByName(roomId).fetch("https://room.internal/create", {
    method: "POST",
  })

  if (response.status === 409) {
    return null
  }

  if (!response.ok) {
    throw new Error("room_create_failed")
  }

  return createRoomResponseSchema.parse(await response.json())
}

export const createRoomFn = createServerFn({ method: "POST" }).handler(async () => {
  assertRoomCreateAllowed(getRequest(), Date.now())

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const roomId = generateRoomId()
    const room = await createRoomInDurableObject(roomId)

    if (room) {
      return room
    }
  }

  throw new Error("room_id_generation_failed")
})

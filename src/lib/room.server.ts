import { createClient } from "redis"

import {
  createRoomState,
  roomUpdatedEventSchema,
  roomStateSchema,
  type RoomState,
} from "#/lib/planning-poker"

const roomStateKey = (roomId: string) => `pp:room:${roomId}:state`
const roomEventsChannel = (roomId: string) => `pp:room:${roomId}:events`

export type RoomBackendConfig =
  | {
      kind: "memory"
    }
  | {
      kind: "redis"
      url: string
    }

let sharedClientPromise: Promise<ReturnType<typeof createClient>> | null = null
let sharedClientUrl: string | null = null

const memoryRooms = new Map<string, RoomState>()
const memorySubscribers = new Map<string, Set<(message: string) => void>>()

const connectRedisClient = async (url: string) => {
  const client = createClient({ url })
  client.on("error", (error) => {
    console.error("Redis client error", error)
  })
  await client.connect()
  return client
}

const getSharedRedisClient = async (url: string) => {
  if (!sharedClientPromise || sharedClientUrl !== url) {
    sharedClientUrl = url
    sharedClientPromise = connectRedisClient(url).catch((error) => {
      sharedClientPromise = null
      throw error
    })
  }

  return sharedClientPromise
}

const parseRoom = (value: string | null) => {
  if (value === null) {
    return null
  }

  return roomStateSchema.parse(JSON.parse(value))
}

const serializeRoomUpdatedEvent = (room: RoomState) =>
  JSON.stringify(
    roomUpdatedEventSchema.parse({
      type: "room.updated",
      roomId: room.roomId,
      version: room.version,
      room,
    }),
  )

const getMemoryRoom = (roomId: string, now: number) => {
  const room = memoryRooms.get(roomId) ?? null

  if (!room) {
    return null
  }

  if (room.expiresAt <= now) {
    memoryRooms.delete(roomId)
    memorySubscribers.delete(roomId)
    return null
  }

  return room
}

const publishRoomUpdatedInMemory = (room: RoomState) => {
  const listeners = memorySubscribers.get(room.roomId)
  if (!listeners) {
    return
  }

  const payload = serializeRoomUpdatedEvent(room)
  for (const listener of listeners) {
    listener(payload)
  }
}

const publishRoomUpdatedInRedis = async (url: string, room: RoomState) => {
  const client = await getSharedRedisClient(url)
  await client.publish(roomEventsChannel(room.roomId), serializeRoomUpdatedEvent(room))
}

export const getRoomSnapshot = async (backend: RoomBackendConfig, roomId: string) => {
  if (backend.kind === "memory") {
    return getMemoryRoom(roomId, Date.now())
  }

  const client = await getSharedRedisClient(backend.url)
  return parseRoom(await client.get(roomStateKey(roomId)))
}

export const createRoom = async (backend: RoomBackendConfig, roomId: string, now: number) => {
  if (backend.kind === "memory") {
    const existingRoom = getMemoryRoom(roomId, now)
    if (existingRoom) {
      return null
    }

    const room = createRoomState({ roomId, now })
    memoryRooms.set(roomId, room)
    publishRoomUpdatedInMemory(room)
    return room
  }

  const client = await getSharedRedisClient(backend.url)
  const room = createRoomState({ roomId, now })
  const reply = await client.sendCommand([
    "SET",
    roomStateKey(roomId),
    JSON.stringify(room),
    "NX",
    "EXAT",
    `${Math.floor(room.expiresAt / 1000)}`,
  ])

  if (typeof reply !== "string" || reply !== "OK") {
    return null
  }

  await publishRoomUpdatedInRedis(backend.url, room)
  return room
}

export const mutateRoom = async (
  backend: RoomBackendConfig,
  roomId: string,
  mutate: (room: RoomState) => RoomState,
) => {
  if (backend.kind === "memory") {
    const currentRoom = getMemoryRoom(roomId, Date.now())
    if (!currentRoom) {
      return null
    }

    const nextRoom = mutate(currentRoom)
    if (nextRoom.version === currentRoom.version) {
      return currentRoom
    }

    memoryRooms.set(roomId, nextRoom)
    publishRoomUpdatedInMemory(nextRoom)
    return nextRoom
  }

  const client = await connectRedisClient(backend.url)

  try {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      await client.watch(roomStateKey(roomId))
      const currentRoom = parseRoom(await client.get(roomStateKey(roomId)))

      if (!currentRoom) {
        await client.sendCommand(["UNWATCH"])
        return null
      }

      const nextRoom = mutate(currentRoom)
      if (nextRoom.version === currentRoom.version) {
        await client.sendCommand(["UNWATCH"])
        return currentRoom
      }

      try {
        await client
          .multi()
          .sendCommand([
            "SET",
            roomStateKey(roomId),
            JSON.stringify(nextRoom),
            "EXAT",
            `${Math.floor(nextRoom.expiresAt / 1000)}`,
          ])
          .exec()

        await publishRoomUpdatedInRedis(backend.url, nextRoom)
        return nextRoom
      } catch (error) {
        if (error instanceof Error && error.name === "WatchError") {
          continue
        }

        throw error
      }
    }

    throw new Error("room_update_conflict")
  } finally {
    await client.close()
  }
}

export const subscribeToRoomEvents = async (
  backend: RoomBackendConfig,
  roomId: string,
  onMessage: (message: string) => void,
) => {
  if (backend.kind === "memory") {
    const listeners = memorySubscribers.get(roomId) ?? new Set<(message: string) => void>()
    listeners.add(onMessage)
    memorySubscribers.set(roomId, listeners)

    return async () => {
      const currentListeners = memorySubscribers.get(roomId)
      if (!currentListeners) {
        return
      }

      currentListeners.delete(onMessage)
      if (currentListeners.size === 0) {
        memorySubscribers.delete(roomId)
      }
    }
  }

  const subscriber = await connectRedisClient(backend.url)
  await subscriber.subscribe(roomEventsChannel(roomId), (message) => {
    onMessage(message)
  })

  return async () => {
    try {
      await subscriber.unsubscribe(roomEventsChannel(roomId))
    } finally {
      await subscriber.close()
    }
  }
}

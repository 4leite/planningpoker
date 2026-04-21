import { createClient } from "redis"

import {
  createRoomState,
  roomUpdatedEventSchema,
  roomStateSchema,
  type CardValue,
  type RoomMember,
  type RoomMemberRole,
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

declare global {
  var __planningPokerMemoryStore:
    | {
        rooms: Map<string, RoomState>
        subscribers: Map<string, Set<(message: string) => void>>
      }
    | undefined
}

const memoryStore = (globalThis.__planningPokerMemoryStore ??= {
  rooms: new Map<string, RoomState>(),
  subscribers: new Map<string, Set<(message: string) => void>>(),
})

const { rooms: memoryRooms, subscribers: memorySubscribers } = memoryStore

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

const getNameKey = (value: string) => value.trim().toLocaleLowerCase()

const updateStoredRoom = (
  room: RoomState,
  {
    history = room.history,
    members = room.members,
    result = room.result,
    revealed = room.revealed,
    now,
  }: {
    history?: RoomState["history"]
    members?: RoomMember[]
    result?: CardValue | null
    revealed?: boolean
    now: number
  },
) => {
  if (
    history === room.history &&
    members === room.members &&
    result === room.result &&
    revealed === room.revealed
  ) {
    return room
  }

  return {
    ...room,
    history,
    members,
    result,
    revealed,
    version: room.version + 1,
    updatedAt: now,
  }
}

export const joinRoomServerState = ({
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
  const duplicateName = room.members.find(
    (member) => member.id !== memberId && getNameKey(member.name) === getNameKey(name),
  )

  if (duplicateName) {
    throw new Error("display_name_taken")
  }

  const existingMember = room.members.find((member) => member.id === memberId)
  if (existingMember) {
    return room
  }

  return updateStoredRoom(room, {
    members: room.members.concat({
      id: memberId,
      name,
      role: "participant",
      vote: null,
      joinedAt: now,
    }),
    now,
  })
}

export const leaveRoomServerState = ({
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

  return updateStoredRoom(room, {
    members: nextMembers,
    now,
  })
}

export const changeRoleServerState = ({
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

  return updateStoredRoom(room, {
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

export const castVoteServerState = ({
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

  return updateStoredRoom(room, {
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

export const resetRoomServerState = ({ room, now }: { room: RoomState; now: number }) => {
  const didChange = room.revealed || room.members.some((member) => member.vote !== null)
  if (!didChange) {
    return room
  }

  return updateStoredRoom(room, {
    members: room.members.map((member) => ({
      ...member,
      vote: null,
    })),
    result: null,
    revealed: false,
    now,
  })
}

export const rerollRoomServerState = ({ room, now }: { room: RoomState; now: number }) => {
  const resetRoom = resetRoomServerState({ room, now })

  if (resetRoom === room || !room.revealed || room.history.length === 0) {
    return resetRoom
  }

  return updateStoredRoom(resetRoom, {
    history: room.history.slice(1),
    now,
  })
}

export const setRoomResultServerState = ({
  room,
  result,
  now,
}: {
  room: RoomState
  result: CardValue
  now: number
}) => {
  if (!room.revealed) {
    throw new Error("round_not_revealed")
  }

  const nextHistory = room.history[0]
    ? [
        {
          ...room.history[0],
          result,
        },
        ...room.history.slice(1),
      ]
    : room.history

  return updateStoredRoom(room, {
    history: nextHistory,
    result,
    now,
  })
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

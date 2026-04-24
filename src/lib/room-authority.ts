import {
  castVoteState,
  changeRoleState,
  claimDealerState,
  createRoomState,
  joinRoomState,
  leaveRoomState,
  passDealerState,
  resetRoomState,
  rerollRoomState,
  revealRoomState,
  roomLifetimeMs,
  roomStateSchema,
  setRoomResultState,
  type RoomState,
} from "#/lib/planning-poker"
import { type RoomSocketAction } from "#/lib/room-sync"

export interface RoomAuthorityStorage {
  getRoom(): Promise<RoomState | null | undefined>
  putRoom(room: RoomState): Promise<void>
  deleteRoom(): Promise<void>
  setAlarm(expiresAt: number): Promise<void>
  deleteAlarm(): Promise<void>
}

export const createRoomAuthority = ({
  storage,
  now = () => Date.now(),
}: {
  storage: RoomAuthorityStorage
  now?: () => number
}) => {
  const deleteStoredRoom = async () => {
    await storage.deleteRoom()
    await storage.deleteAlarm()
  }

  const persistRoom = async (room: RoomState) => {
    await storage.putRoom(room)
    await storage.setAlarm(room.expiresAt)
  }

  const withLifecycleUpdate = ({
    currentRoom,
    nextRoom,
    action,
    currentTime,
  }: {
    currentRoom: RoomState
    nextRoom: RoomState
    action: RoomSocketAction
    currentTime: number
  }) => {
    if (nextRoom.version === currentRoom.version) {
      return nextRoom
    }

    if (action.type !== "room.reset" && action.type !== "room.setResult") {
      return nextRoom
    }

    return {
      ...nextRoom,
      expiresAt: currentTime + roomLifetimeMs,
    }
  }

  const mutateRoom = ({
    room,
    action,
    currentTime,
  }: {
    room: RoomState
    action: RoomSocketAction
    currentTime: number
  }) => {
    switch (action.type) {
      case "room.join":
        return joinRoomState({
          room,
          memberId: action.memberId,
          name: action.name,
          now: currentTime,
        })
      case "room.leave":
        return leaveRoomState({
          room,
          memberId: action.memberId,
          now: currentTime,
        })
      case "room.changeRole":
        return changeRoleState({
          room,
          memberId: action.memberId,
          role: action.role,
          now: currentTime,
        })
      case "room.castVote":
        return castVoteState({
          room,
          memberId: action.memberId,
          vote: action.vote,
          now: currentTime,
        })
      case "room.claimDealer":
        return claimDealerState({
          room,
          memberId: action.memberId,
          now: currentTime,
        })
      case "room.passDealer":
        return passDealerState({
          room,
          memberId: action.memberId,
          now: currentTime,
        })
      case "room.reveal":
        return revealRoomState({ room, memberId: action.memberId, now: currentTime })
      case "room.reset":
        return resetRoomState({ room, memberId: action.memberId, now: currentTime })
      case "room.reroll":
        return rerollRoomState({ room, memberId: action.memberId, now: currentTime })
      case "room.setResult":
        return setRoomResultState({
          room,
          memberId: action.memberId,
          result: action.result,
          now: currentTime,
        })
    }
  }

  const getActiveRoom = async () => {
    const room = roomStateSchema.nullable().parse((await storage.getRoom()) ?? null)
    if (!room) {
      return null
    }

    if (room.expiresAt > now()) {
      return room
    }

    await deleteStoredRoom()
    return null
  }

  return {
    getActiveRoom,
    createRoom: async (roomId: string) => {
      const existingRoom = await getActiveRoom()
      if (existingRoom) {
        return null
      }

      const room = createRoomState({ roomId, now: now() })
      await persistRoom(room)
      return room
    },
    applyAction: async (action: RoomSocketAction) => {
      const currentTime = now()
      const currentRoom = await getActiveRoom()
      if (!currentRoom) {
        throw new Error("room_not_found")
      }

      const nextRoom = mutateRoom({
        room: currentRoom,
        action,
        currentTime,
      })
      const room = withLifecycleUpdate({
        currentRoom,
        nextRoom,
        action,
        currentTime,
      })

      await persistRoom(room)
      return room
    },
  }
}

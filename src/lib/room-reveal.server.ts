import { revealRoomState, type RoomState } from "#/lib/planning-poker"

export const revealRoomServerState = ({ room, now }: { room: RoomState; now: number }) =>
  revealRoomState({ room, now })

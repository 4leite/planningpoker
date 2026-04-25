import { Link } from "@tanstack/react-router"
import { buttonVariants } from "@tohuhono/ui/button"

import { RoomRealtimeProvider } from "#/hooks/use-room-action"
import { useRoomData, useRoomFeedback, useRoomMeta } from "#/hooks/use-room-realtime"
import { type RoomState } from "#/lib/planning-poker"

import { RoomCenterPanel } from "./RoomCenterPanel"
import { RoomHistory } from "./RoomHistory"
import { RoomJoinGate } from "./RoomJoinGate"
import { RoomMenuBar } from "./RoomMenuBar"

const RoomScreenBody = ({
  initialRoom,
  roomId,
}: {
  initialRoom: RoomState | null
  roomId: string
}) => {
  const { room } = useRoomData({ initialRoom, roomId })
  const { isBootstrapping } = useRoomMeta({ roomId })
  const { feedbackMessage } = useRoomFeedback({ roomId })

  if (isBootstrapping) {
    return <div className="text-muted-foreground text-sm">loading room...</div>
  }

  if (!room) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-muted-foreground text-sm">room not found</p>
        <Link to="/" className={buttonVariants()}>
          back
        </Link>
      </div>
    )
  }

  return (
    <>
      <RoomMenuBar room={room} />

      <RoomCenterPanel room={room} />

      <RoomJoinGate room={room} roomId={roomId} />

      <RoomHistory history={room.history} />

      {feedbackMessage ? <p className="text-destructive text-sm">{feedbackMessage}</p> : null}
    </>
  )
}

export const RoomScreen = ({
  initialRoom,
  roomId,
}: {
  initialRoom: RoomState | null
  roomId: string
}) => {
  return (
    <RoomRealtimeProvider roomId={roomId}>
      <RoomScreenBody roomId={roomId} initialRoom={initialRoom} />
    </RoomRealtimeProvider>
  )
}

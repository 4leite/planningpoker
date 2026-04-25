import { Link, useParams } from "@tanstack/react-router"
import { buttonVariants } from "@tohuhono/ui/button"

import { RoomRealtimeProvider } from "#/hooks/use-room-action"
import { useRoomData, useRoomFeedback, useRoomMeta } from "#/hooks/use-room-realtime"

import { RoomCenterPanel } from "./RoomCenterPanel"
import { RoomHistory } from "./RoomHistory"
import { RoomJoinGate } from "./RoomJoinGate"
import { RoomMenuBar } from "./RoomMenuBar"

const RoomScreenBody = () => {
  const { room } = useRoomData()
  const { isBootstrapping } = useRoomMeta()
  const { feedbackMessage } = useRoomFeedback()

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
      <RoomMenuBar />

      <RoomCenterPanel />

      <RoomJoinGate />

      <RoomHistory />

      {feedbackMessage ? <p className="text-destructive text-sm">{feedbackMessage}</p> : null}
    </>
  )
}

export const RoomScreen = () => {
  const { room: roomId } = useParams({ from: "/r/$room" })

  return (
    <RoomRealtimeProvider roomId={roomId}>
      <RoomScreenBody />
    </RoomRealtimeProvider>
  )
}

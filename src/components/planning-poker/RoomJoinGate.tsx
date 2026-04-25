import { useEffect, useState } from "react"

import { usePlanningPokerIdentity } from "#/hooks/use-planning-poker-identity"
import { useJoinRoomMutation } from "#/hooks/use-room-mutations"
import { useRoomFeedback } from "#/hooks/use-room-realtime"
import { type RoomState } from "#/lib/planning-poker"

import { formatRoomError } from "./room-error"
import { RoomJoinPanel } from "./RoomJoinPanel"

export const RoomJoinGate = ({ room, roomId }: { room: RoomState; roomId: string }) => {
  const { identity, rememberDisplayName } = usePlanningPokerIdentity()
  const { feedbackMessage, setFeedbackMessage, clearFeedbackMessage } = useRoomFeedback({ roomId })
  const [joinName, setJoinName] = useState(identity?.displayName ?? "")
  const { mutate: mutateJoinRoom, isPending: isJoinPending } = useJoinRoomMutation({
    formatRoomError,
  })

  useEffect(() => {
    if (!joinName && identity?.displayName) {
      setJoinName(identity.displayName)
    }
  }, [identity?.displayName, joinName])

  const currentMember = room.members.find((member) => member.id === identity?.memberId) ?? null

  const handleJoinRoom = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    clearFeedbackMessage()

    if (!identity) {
      setFeedbackMessage("Preparing your browser identity. Try again in a moment.")
      return
    }

    const nextName = joinName.trim()
    rememberDisplayName(nextName)
    mutateJoinRoom(nextName)
  }

  return (
    <RoomJoinPanel
      open={!currentMember}
      joinName={joinName}
      isPending={isJoinPending}
      errorMessage={feedbackMessage}
      onJoinNameChange={setJoinName}
      onSubmit={handleJoinRoom}
    />
  )
}

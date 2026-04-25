import { useEffect, useState } from "react"

import { usePlanningPokerIdentity } from "#/hooks/use-planning-poker-identity"
import { useJoinRoomMutation } from "#/hooks/use-room-mutations"
import { useRoomData, useRoomFeedback } from "#/hooks/use-room-realtime"

import { formatRoomError } from "./room-error"
import { RoomJoinPanel } from "./RoomJoinPanel"

export const RoomJoinGate = () => {
  const { identity, rememberDisplayName } = usePlanningPokerIdentity()
  const { room } = useRoomData()
  const { feedbackMessage, setFeedbackMessage, clearFeedbackMessage } = useRoomFeedback()
  const [joinName, setJoinName] = useState(identity?.displayName ?? "")
  const { mutate: mutateJoinRoom, isPending: isJoinPending } = useJoinRoomMutation({
    formatRoomError,
  })

  useEffect(() => {
    if (!joinName && identity?.displayName) {
      setJoinName(identity.displayName)
    }
  }, [identity?.displayName, joinName])

  if (!room) {
    return null
  }

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

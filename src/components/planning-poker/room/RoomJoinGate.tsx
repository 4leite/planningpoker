import { useState } from "react"

import { useCurrentMember } from "#/hooks/use-current-member"
import { useDisplayName, useSetDisplayName } from "#/hooks/use-planning-poker-identity"
import { useJoinRoomMutation } from "#/hooks/use-room-mutations"
import { useRoomData, useRoomFeedback } from "#/hooks/use-room-realtime"

import { formatRoomError } from "./room-error"
import { RoomJoinPanel } from "./RoomJoinPanel"

export const RoomJoinGate = () => {
  const setDisplayName = useSetDisplayName()
  const displayName = useDisplayName()
  const currentMember = useCurrentMember()
  const { room } = useRoomData()
  const { feedbackMessage, clearFeedbackMessage } = useRoomFeedback()
  const [joinName, setJoinName] = useState(displayName)
  const { mutate: mutateJoinRoom, isPending: isJoinPending } = useJoinRoomMutation({
    formatRoomError,
  })

  if (!room) {
    return null
  }

  const handleJoinRoom = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    clearFeedbackMessage()

    const nextName = joinName.trim()
    setDisplayName(nextName)
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

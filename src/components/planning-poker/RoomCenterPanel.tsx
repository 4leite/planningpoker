import { useIsMutating } from "@tanstack/react-query"
import { Card, CardContent } from "@tohuhono/ui/card"
import { useEffect, useState } from "react"

import { usePlanningPokerIdentity } from "#/hooks/use-planning-poker-identity"
import {
  useCastVoteMutation,
  roomMutationKey,
  useSetRoomResultMutation,
} from "#/hooks/use-room-mutations"
import { useRoomData, useRoomFeedback } from "#/hooks/use-room-realtime"
import {
  cardValues,
  getActiveDealer,
  getVoteProgress,
  type CardValue,
  type RoomState,
} from "#/lib/planning-poker"

import { formatRoomError } from "./room-error"
import { RoomCenter } from "./RoomCenter"
import { RoomMemberList } from "./RoomMemberList"
import { VoteDeck } from "./VoteDeck"

const isCardValue = (value: string): value is CardValue =>
  cardValues.some((cardValue) => cardValue === value)

const useResultInput = ({
  room,
  mutateSetRoomResult,
  setFeedbackMessage,
}: {
  room: RoomState | null
  mutateSetRoomResult: (value: CardValue) => void
  setFeedbackMessage: (msg: string) => void
}) => {
  const [resultInput, setResultInput] = useState("")
  const [isResultInputFocused, setIsResultInputFocused] = useState(false)

  useEffect(() => {
    setResultInput(room?.result ?? "")
  }, [room?.result])

  const commitResultInput = () => {
    if (!room?.revealed) return

    const nextResult = resultInput.trim()

    if (!nextResult) {
      setResultInput(room.result ?? "")
      return
    }

    if (!isCardValue(nextResult)) {
      setFeedbackMessage("Choose a card from the deck values.")
      setResultInput(room.result ?? "")
      return
    }

    if (nextResult === room.result) return

    mutateSetRoomResult(nextResult)
  }

  const handleResultChange = (nextResult: CardValue) => {
    if (!room?.revealed || !isResultInputFocused || nextResult === room.result) {
      return
    }

    setResultInput(nextResult)
    mutateSetRoomResult(nextResult)
  }

  return {
    resultInput,
    setResultInput,
    isResultInputFocused,
    setIsResultInputFocused,
    commitResultInput,
    handleResultChange,
  }
}

export const RoomCenterPanel = () => {
  const { room } = useRoomData()
  const { identity } = usePlanningPokerIdentity()
  const identityMemberId = identity?.memberId ?? null
  const { setFeedbackMessage } = useRoomFeedback()
  const mutationOptions = { formatRoomError }

  const { mutate: mutateCastVote, isPending: isVotePending } = useCastVoteMutation(mutationOptions)
  const { mutate: mutateSetRoomResult, isPending: isResultPending } =
    useSetRoomResultMutation(mutationOptions)
  const {
    resultInput,
    setResultInput,
    isResultInputFocused,
    setIsResultInputFocused,
    commitResultInput,
    handleResultChange,
  } = useResultInput({ room, mutateSetRoomResult, setFeedbackMessage })

  const roomId = room?.roomId ?? ""
  const currentMember = room?.members.find((member) => member.id === identityMemberId) ?? null

  const voteProgress = room ? getVoteProgress(room) : { readyCount: 0, participantCount: 0 }
  const activeDealer = room ? getActiveDealer(room) : null
  const isCurrentDealer = activeDealer?.id === currentMember?.id
  const canUseDealerControls = Boolean(currentMember) && (!activeDealer || isCurrentDealer)
  const canEditResult = Boolean(room?.revealed) && canUseDealerControls
  const resetMutations = useIsMutating({ mutationKey: roomMutationKey(roomId, "reset") })
  const rerollMutations = useIsMutating({ mutationKey: roomMutationKey(roomId, "reroll") })
  const isRoundResetPending = resetMutations > 0 || rerollMutations > 0

  if (!room) {
    return null
  }

  return (
    <>
      <VoteDeck
        selectedVote={room.revealed ? (room.result ?? null) : (currentMember?.vote ?? null)}
        disabled={
          room.revealed
            ? !canEditResult || !isResultInputFocused || isResultPending || isRoundResetPending
            : currentMember?.role !== "participant"
        }
        isPending={room.revealed ? isResultPending || isRoundResetPending : isVotePending}
        preventButtonFocus={room.revealed && canEditResult && isResultInputFocused}
        onVote={room.revealed ? handleResultChange : (vote) => mutateCastVote(vote)}
      />

      <Card className="w-full max-w-5xl">
        <CardContent className="p-4 sm:p-6">
          <div className="bg-muted/20 relative mx-auto aspect-square w-full max-w-4xl rounded-[999px] border sm:aspect-video">
            <RoomMemberList room={room} currentMemberId={currentMember?.id ?? null} />

            <div
              className={`bg-background absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3 rounded-[999px] border py-4 text-center shadow-sm sm:py-5 ${
                room.revealed ? "w-44 px-4 sm:w-52 sm:px-5" : "w-44 px-5 sm:w-56 sm:px-6"
              }`}
            >
              {room.revealed ? (
                canEditResult ? (
                  <RoomCenter.EditableResult
                    value={resultInput}
                    onChange={setResultInput}
                    onCommit={commitResultInput}
                    onFocusChange={setIsResultInputFocused}
                    disabled={isResultPending || isRoundResetPending}
                  />
                ) : (
                  <RoomCenter.RevealedResult result={room.result} />
                )
              ) : (
                <RoomCenter.VoteProgress
                  centerLabel={`${voteProgress.readyCount} / ${voteProgress.participantCount}`}
                />
              )}
              <datalist id="planning-poker-result-values">
                {cardValues.map((cardValue) => (
                  <option key={cardValue} value={cardValue} />
                ))}
              </datalist>
              <RoomCenter.RoundControls room={room} currentMemberId={currentMember?.id ?? null} />
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

import { Card, CardContent } from "@tohuhono/ui/card"
import { type Dispatch, type PropsWithChildren, type SetStateAction } from "react"

import { useCurrentMember } from "#/hooks/use-current-member"
import { useRoom } from "#/hooks/use-room-realtime"
import { cardValues, getActiveDealer, getVoteProgress } from "#/lib/planning-poker"

import { RoomCenter } from "./RoomCenter"
import { RoomMemberList } from "./RoomMemberList"

export const TableTop = ({
  resultInput,
  setResultInput,
  setIsResultInputFocused,
  commitResultInput,
}: {
  resultInput: string
  setResultInput: Dispatch<SetStateAction<string>>
  isResultInputFocused: boolean
  setIsResultInputFocused: Dispatch<SetStateAction<boolean>>
  commitResultInput: () => void
}) => {
  const room = useRoom()

  const currentMember = useCurrentMember()

  const voteProgress = room ? getVoteProgress(room) : { readyCount: 0, participantCount: 0 }
  const activeDealer = room ? getActiveDealer(room) : null
  const isCurrentDealer = activeDealer?.id === currentMember?.id
  const canUseDealerControls = Boolean(currentMember) && (!activeDealer || isCurrentDealer)
  const canEditResult = Boolean(room?.revealed) && canUseDealerControls

  return (
    <>
      <RoomMemberList />

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
              disabled={false}
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
        <RoomCenter.RoundControls />
      </div>
    </>
  )
}

export const Table = ({ children }: PropsWithChildren) => {
  return (
    <Card className="w-full max-w-5xl">
      <CardContent className="p-4 sm:p-6">
        <div className="bg-muted/20 relative mx-auto aspect-square w-full max-w-4xl rounded-[999px] border sm:aspect-video">
          {children}
        </div>
      </CardContent>
    </Card>
  )
}

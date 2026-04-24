import { cn } from "@tohuhono/utils"

import {
  calculateVoteMode,
  getActiveDealer,
  getVoteExtremesOutsideMode,
  type RoomState,
} from "#/lib/planning-poker"

const sortMembers = (members: RoomState["members"], currentMemberId: string | null) =>
  [...members].sort((left, right) => {
    if (left.id === currentMemberId) {
      return -1
    }

    if (right.id === currentMemberId) {
      return 1
    }

    return left.joinedAt - right.joinedAt
  })

export const RoomMemberList = ({
  room,
  currentMemberId,
}: {
  room: RoomState
  currentMemberId: string | null
}) => {
  const members = sortMembers(room.members, currentMemberId)
  const activeDealer = getActiveDealer(room)
  const modeVote = room.revealed ? calculateVoteMode(room.members) : null
  const { highestVote, lowestVote } = room.revealed
    ? getVoteExtremesOutsideMode(room.members)
    : { highestVote: null, lowestVote: null }
  const radiusX = 46
  const radiusY = 40

  return (
    <div className="pointer-events-none absolute inset-0">
      {members.map((member, index) => {
        const angle = ((Math.PI * 2) / Math.max(members.length, 1)) * index - Math.PI / 2
        const left = 50 + Math.cos(angle) * radiusX
        const top = 50 + Math.sin(angle) * radiusY
        const isCurrent = member.id === currentMemberId
        const isDealer = activeDealer?.id === member.id
        const hasVote = member.vote !== null
        const isUnresolvedParticipant =
          room.revealed &&
          member.role === "participant" &&
          (member.vote === null || member.vote === "?")
        const isModeVote = member.vote !== null && member.vote === modeVote
        const isLowestOutlier = member.vote !== null && member.vote === lowestVote
        const isHighestOutlier = member.vote !== null && member.vote === highestVote

        return (
          <article
            key={member.id}
            aria-label={`Seat for ${member.name}`}
            className={cn(
              "bg-card pointer-events-auto absolute w-22 -translate-x-1/2 -translate-y-1/2 rounded-lg border p-2 text-center shadow-sm transition-colors sm:w-28",
              isCurrent && "border-primary",
              !room.revealed && hasVote && member.role === "participant" && "bg-muted",
              isUnresolvedParticipant && "bg-amber-500/10 ring-1 ring-amber-400/60 ring-inset",
              isModeVote && "bg-emerald-500/10 ring-1 ring-emerald-400/60 ring-inset",
              isLowestOutlier && "bg-sky-500/10 ring-1 ring-sky-400/60 ring-inset",
              isHighestOutlier && "bg-sky-500/10 ring-1 ring-sky-400/60 ring-inset",
              member.role === "spectator" && "opacity-70",
            )}
            style={{
              left: `clamp(3.5rem, ${left}%, calc(100% - 3.5rem))`,
              top: `clamp(2.75rem, ${top}%, calc(100% - 2.75rem))`,
            }}
          >
            {isDealer ? (
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full border bg-amber-100 px-2 py-0.5 text-[10px] font-semibold tracking-[0.18em] text-amber-900 uppercase shadow-sm">
                Dealer
              </div>
            ) : null}
            <div className="truncate text-sm font-medium">{member.name}</div>
            <div
              className={cn(
                "text-muted-foreground mt-2 min-h-6 text-sm",
                isUnresolvedParticipant && "text-amber-700 dark:text-amber-300",
                isModeVote && "text-emerald-700 dark:text-emerald-300",
                isLowestOutlier && "text-sky-700 dark:text-sky-300",
                isHighestOutlier && "text-sky-700 dark:text-sky-300",
              )}
            >
              {room.revealed
                ? (member.vote ?? "-")
                : member.role === "spectator"
                  ? "spectating"
                  : hasVote
                    ? "voted"
                    : ""}
            </div>
          </article>
        )
      })}
    </div>
  )
}

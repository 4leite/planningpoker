import { cn } from "@tohuhono/utils"

import { type RoomState } from "#/lib/planning-poker"

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
  const radiusX = 46
  const radiusY = 40

  return (
    <div className="pointer-events-none absolute inset-0">
      {members.map((member, index) => {
        const angle = ((Math.PI * 2) / Math.max(members.length, 1)) * index - Math.PI / 2
        const left = 50 + Math.cos(angle) * radiusX
        const top = 50 + Math.sin(angle) * radiusY
        const isCurrent = member.id === currentMemberId
        const hasVote = member.vote !== null

        return (
          <article
            key={member.id}
            className={cn(
              "bg-card pointer-events-auto absolute w-22 -translate-x-1/2 -translate-y-1/2 rounded-lg border p-2 text-center shadow-sm transition-colors sm:w-28",
              isCurrent && "border-primary",
              !room.revealed && hasVote && member.role === "participant" && "bg-muted",
              member.role === "spectator" && "opacity-70",
            )}
            style={{
              left: `clamp(3.5rem, ${left}%, calc(100% - 3.5rem))`,
              top: `clamp(2.75rem, ${top}%, calc(100% - 2.75rem))`,
            }}
          >
            <div className="truncate text-sm font-medium">{member.name}</div>
            <div className="text-muted-foreground mt-2 min-h-6 text-sm">
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

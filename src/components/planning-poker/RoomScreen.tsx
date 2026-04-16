import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate } from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"
import { Button, buttonVariants } from "@tohuhono/ui/button"
import { Card, CardContent } from "@tohuhono/ui/card"
import { useEffect, useState } from "react"

import { useMenuState } from "#/components/layout/MenuContext"
import { usePlanningPokerIdentity } from "#/hooks/use-planning-poker-identity"
import { useRoomRealtime } from "#/hooks/use-room-realtime"
import {
  calculateNumericAverage,
  formatAverageVote,
  getVoteProgress,
  type CardValue,
  type RoomState,
} from "#/lib/planning-poker"
import { roomQueryKey } from "#/lib/room-query"
import {
  castVote,
  changeRole,
  joinRoom,
  leaveRoom,
  resetRound,
  revealVotes,
} from "#/lib/room.functions"

import { RoomJoinPanel } from "./RoomJoinPanel"
import { RoomMemberList } from "./RoomMemberList"
import { VoteDeck } from "./VoteDeck"

const formatRoomError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return "Something slipped while updating the room. Try again."
  }

  switch (error.message) {
    case "display_name_taken":
      return "That display name is already taken in this room."
    case "room_not_found":
      return "This room no longer exists."
    case "room_member_missing":
      return "Your seat is not active in this room anymore. Join again to keep playing."
    case "spectators_cannot_vote":
      return "Switch back to participant before casting a vote."
    case "round_already_revealed":
      return "The cards are already face up. Reset to start a new round."
    default:
      return error.message || "Something slipped while updating the room. Try again."
  }
}

export const RoomScreen = ({
  initialRoom,
  roomId,
}: {
  initialRoom: RoomState | null
  roomId: string
}) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { setRoomMenu } = useMenuState()
  const { identity, rememberDisplayName } = usePlanningPokerIdentity()
  const { room, setRoom } = useRoomRealtime({
    initialRoom,
    roomId,
    enabled: initialRoom !== null,
  })
  const joinRoomFn = useServerFn(joinRoom)
  const leaveRoomFn = useServerFn(leaveRoom)
  const changeRoleFn = useServerFn(changeRole)
  const castVoteFn = useServerFn(castVote)
  const revealVotesFn = useServerFn(revealVotes)
  const resetRoundFn = useServerFn(resetRound)
  const [joinName, setJoinName] = useState(identity?.displayName ?? "")
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)
  const [copyMessage, setCopyMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!joinName && identity?.displayName) {
      setJoinName(identity.displayName)
    }
  }, [identity?.displayName, joinName])

  useEffect(() => {
    if (!copyMessage) {
      return
    }

    const timer = window.setTimeout(() => {
      setCopyMessage(null)
    }, 1800)

    return () => {
      window.clearTimeout(timer)
    }
  }, [copyMessage])

  const currentMember = room?.members.find((member) => member.id === identity?.memberId) ?? null
  const voteProgress = room ? getVoteProgress(room) : null
  const average = room ? formatAverageVote(calculateNumericAverage(room.members)) : null

  const applyRoomMutation = (nextRoom: RoomState) => {
    setFeedbackMessage(null)
    setRoom(nextRoom)
  }

  const roomMutationOptions = {
    onSuccess: (nextRoom: RoomState) => {
      applyRoomMutation(nextRoom)
    },
    onError: (error: unknown) => {
      setFeedbackMessage(formatRoomError(error))
    },
  }

  const joinRoomMutation = useMutation({
    mutationFn: (name: string) => {
      if (!identity) {
        throw new Error("Preparing your browser identity. Try again in a moment.")
      }

      return joinRoomFn({
        data: {
          roomId,
          memberId: identity.memberId,
          name,
        },
      })
    },
    ...roomMutationOptions,
  })
  const leaveRoomMutation = useMutation({
    mutationFn: () => {
      if (!identity) {
        throw new Error("room_member_missing")
      }

      return leaveRoomFn({
        data: {
          roomId,
          memberId: identity.memberId,
        },
      })
    },
    ...roomMutationOptions,
  })
  const changeRoleMutation = useMutation({
    mutationFn: (role: "participant" | "spectator") => {
      if (!identity) {
        throw new Error("room_member_missing")
      }

      return changeRoleFn({
        data: {
          roomId,
          memberId: identity.memberId,
          role,
        },
      })
    },
    ...roomMutationOptions,
  })
  const castVoteMutation = useMutation({
    mutationFn: (vote: CardValue) => {
      if (!identity) {
        throw new Error("room_member_missing")
      }

      return castVoteFn({
        data: {
          roomId,
          memberId: identity.memberId,
          vote,
        },
      })
    },
    ...roomMutationOptions,
  })
  const revealVotesMutation = useMutation({
    mutationFn: () => revealVotesFn({ data: { roomId } }),
    ...roomMutationOptions,
  })
  const resetRoundMutation = useMutation({
    mutationFn: () => resetRoundFn({ data: { roomId } }),
    ...roomMutationOptions,
  })

  const isPending =
    joinRoomMutation.isPending ||
    leaveRoomMutation.isPending ||
    changeRoleMutation.isPending ||
    castVoteMutation.isPending ||
    revealVotesMutation.isPending ||
    resetRoundMutation.isPending

  const handleJoinRoom = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFeedbackMessage(null)

    if (!identity) {
      setFeedbackMessage("Preparing your browser identity. Try again in a moment.")
      return
    }

    const nextName = joinName.trim()
    rememberDisplayName(nextName)
    joinRoomMutation.mutate(nextName)
  }

  const handleRoleSwitch = (role: "participant" | "spectator") => {
    setFeedbackMessage(null)
    changeRoleMutation.mutate(role)
  }

  const handleVote = (vote: CardValue) => {
    setFeedbackMessage(null)
    castVoteMutation.mutate(vote)
  }

  const handleReveal = () => {
    setFeedbackMessage(null)
    revealVotesMutation.mutate()
  }

  const handleReset = () => {
    setFeedbackMessage(null)
    resetRoundMutation.mutate()
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopyMessage("Link copied")
    } catch {
      setCopyMessage("Clipboard unavailable")
    }
  }

  const handleExit = () => {
    if (!identity || !room) {
      void navigate({ to: "/" })
      return
    }

    setFeedbackMessage(null)
    leaveRoomMutation.mutate(undefined, {
      onSuccess: () => {
        queryClient.removeQueries({ queryKey: roomQueryKey(roomId) })
        setRoomMenu(null)
        void navigate({ to: "/" })
      },
    })
  }

  useEffect(() => {
    if (!room) {
      setRoomMenu(null)
      return
    }

    setRoomMenu({
      roomLinkLabel: copyMessage ?? room.roomId,
      onCopyLink: () => {
        void handleCopyLink()
      },
      spectatorChecked: currentMember?.role === "spectator",
      spectatorDisabled: !currentMember || isPending,
      onSpectatorChange: (checked) => handleRoleSwitch(checked ? "spectator" : "participant"),
      exitDisabled: isPending,
      onExit: handleExit,
    })

    return () => {
      setRoomMenu(null)
    }
  }, [copyMessage, currentMember, isPending, room, setRoomMenu])

  if (!room) {
    return (
      <main className="mx-auto flex min-h-[calc(100svh-4.5rem)] w-full max-w-3xl items-center justify-center px-4 py-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-muted-foreground text-sm">room not found</p>
          <Link to="/" className={buttonVariants()}>
            back
          </Link>
        </div>
      </main>
    )
  }

  const canReset = room.revealed || room.members.some((member) => member.vote !== null)
  const revealLabel = room.revealed ? "reset" : "reveal"
  const centerLabel = room.revealed
    ? (average ?? "-")
    : `${voteProgress?.readyCount ?? 0} / ${voteProgress?.participantCount ?? 0}`

  return (
    <main className="mx-auto flex min-h-[calc(100svh-4.5rem)] w-full max-w-6xl flex-col items-center justify-center gap-6 px-4 py-6">
      <Card className="w-full max-w-5xl">
        <CardContent className="p-4 sm:p-6">
          <div className="bg-muted/20 relative mx-auto aspect-16/10 w-full max-w-4xl rounded-[999px] border sm:aspect-video">
            <RoomMemberList room={room} currentMemberId={identity?.memberId ?? null} />

            <div className="bg-background absolute top-1/2 left-1/2 flex w-40 -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3 rounded-[999px] border px-5 py-4 text-center shadow-sm sm:w-48 sm:px-6 sm:py-5">
              <div className="text-muted-foreground text-sm">{centerLabel}</div>
              <Button
                type="button"
                onClick={room.revealed ? handleReset : handleReveal}
                disabled={
                  isPending ||
                  (!room.revealed && room.members.length === 0) ||
                  (room.revealed && !canReset)
                }
                className="w-full"
              >
                {revealLabel}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <VoteDeck
        selectedVote={currentMember?.vote ?? null}
        disabled={currentMember?.role !== "participant" || room.revealed}
        isPending={isPending}
        onVote={handleVote}
      />

      {feedbackMessage ? <p className="text-destructive text-sm">{feedbackMessage}</p> : null}

      <RoomJoinPanel
        open={!currentMember}
        joinName={joinName}
        isPending={isPending}
        errorMessage={feedbackMessage}
        onJoinNameChange={setJoinName}
        onSubmit={handleJoinRoom}
      />
    </main>
  )
}

import { ExitIcon, Share1Icon } from "@radix-ui/react-icons"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate } from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"
import { Button, buttonVariants } from "@tohuhono/ui/button"
import { Card, CardContent } from "@tohuhono/ui/card"
import { Input } from "@tohuhono/ui/input"
import { Switch } from "@tohuhono/ui/switch"
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

import { useMenuState } from "#/components/layout/MenuContext"
import { usePlanningPokerIdentity } from "#/hooks/use-planning-poker-identity"
import { useRoomRealtime } from "#/hooks/use-room-realtime"
import {
  cardValues,
  castVoteState,
  changeRoleState,
  getVoteProgress,
  joinRoomState,
  leaveRoomState,
  rerollRoomState,
  resetRoomState,
  revealRoomState,
  setRoomResultState,
  type CardValue,
  type RoomState,
} from "#/lib/planning-poker"
import { roomQueryKey } from "#/lib/room-query"
import {
  castVote,
  changeRole,
  joinRoom,
  leaveRoom,
  rerollRound,
  resetRound,
  revealVotes,
  setRoomResult,
} from "#/lib/room.functions"

import { RoomHistory } from "./RoomHistory"
import { RoomJoinPanel } from "./RoomJoinPanel"
import { RoomMemberList } from "./RoomMemberList"
import { VoteDeck } from "./VoteDeck"

const isCardValue = (value: string): value is CardValue =>
  cardValues.some((cardValue) => cardValue === value)

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
    case "round_not_revealed":
      return "Reveal the cards before changing the result."
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
  const { roomMenuPortalElement } = useMenuState()
  const { identity, rememberDisplayName } = usePlanningPokerIdentity()
  const { room, setRoom, isLoading } = useRoomRealtime({
    initialRoom,
    roomId,
  })
  const joinRoomFn = useServerFn(joinRoom)
  const leaveRoomFn = useServerFn(leaveRoom)
  const changeRoleFn = useServerFn(changeRole)
  const castVoteFn = useServerFn(castVote)
  const revealVotesFn = useServerFn(revealVotes)
  const resetRoundFn = useServerFn(resetRound)
  const rerollRoundFn = useServerFn(rerollRound)
  const setRoomResultFn = useServerFn(setRoomResult)
  const [joinName, setJoinName] = useState(identity?.displayName ?? "")
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)
  const [resultInput, setResultInput] = useState("")
  const [isResultInputFocused, setIsResultInputFocused] = useState(false)
  const resultBlurTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    if (!joinName && identity?.displayName) {
      setJoinName(identity.displayName)
    }
  }, [identity?.displayName, joinName])

  useEffect(() => {
    setResultInput(room?.result ?? "")
  }, [room?.result])

  useEffect(
    () => () => {
      if (resultBlurTimeoutRef.current !== null) {
        window.clearTimeout(resultBlurTimeoutRef.current)
      }
    },
    [],
  )

  const currentMember = room?.members.find((member) => member.id === identity?.memberId) ?? null
  const voteProgress = room ? getVoteProgress(room) : null

  const applyRoomMutation = (nextRoom: RoomState) => {
    setFeedbackMessage(null)
    setRoom(nextRoom)
  }

  const createRoomMutationOptions = <TVars,>(
    optimisticUpdate?: (currentRoom: RoomState, variables: TVars) => RoomState,
  ) => ({
    onMutate: async (variables: TVars) => {
      await queryClient.cancelQueries({ queryKey: roomQueryKey(roomId) })

      const previousRoom =
        queryClient.getQueryData<RoomState | null>(roomQueryKey(roomId)) ?? room ?? null

      if (!previousRoom || !optimisticUpdate) {
        return { previousRoom }
      }

      try {
        applyRoomMutation(optimisticUpdate(previousRoom, variables))
      } catch {
        // Let the server remain the source of truth for invalid optimistic transitions.
      }

      return { previousRoom }
    },
    onSuccess: (nextRoom: RoomState) => {
      applyRoomMutation(nextRoom)
    },
    onError: (error: unknown, _variables: TVars, context?: { previousRoom: RoomState | null }) => {
      if (context?.previousRoom) {
        setRoom(context.previousRoom)
      }

      setFeedbackMessage(formatRoomError(error))
    },
  })

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
    ...createRoomMutationOptions((currentRoom, name) => {
      if (!identity) {
        return currentRoom
      }

      return joinRoomState({
        room: currentRoom,
        memberId: identity.memberId,
        name,
        now: Date.now(),
      })
    }),
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
    ...createRoomMutationOptions<undefined>((currentRoom) => {
      if (!identity) {
        return currentRoom
      }

      return leaveRoomState({
        room: currentRoom,
        memberId: identity.memberId,
        now: Date.now(),
      })
    }),
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
    ...createRoomMutationOptions((currentRoom, role) => {
      if (!identity) {
        return currentRoom
      }

      return changeRoleState({
        room: currentRoom,
        memberId: identity.memberId,
        role,
        now: Date.now(),
      })
    }),
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
    ...createRoomMutationOptions((currentRoom, vote) => {
      if (!identity) {
        return currentRoom
      }

      return castVoteState({
        room: currentRoom,
        memberId: identity.memberId,
        vote,
        now: Date.now(),
      })
    }),
  })
  const revealVotesMutation = useMutation({
    mutationFn: () => revealVotesFn({ data: { roomId } }),
    ...createRoomMutationOptions<undefined>((currentRoom) =>
      revealRoomState({
        room: currentRoom,
        now: Date.now(),
      }),
    ),
  })
  const resetRoundMutation = useMutation({
    mutationFn: () => resetRoundFn({ data: { roomId } }),
    ...createRoomMutationOptions<undefined>((currentRoom) =>
      resetRoomState({
        room: currentRoom,
        now: Date.now(),
      }),
    ),
  })
  const rerollRoundMutation = useMutation({
    mutationFn: () => rerollRoundFn({ data: { roomId } }),
    ...createRoomMutationOptions<undefined>((currentRoom) =>
      rerollRoomState({
        room: currentRoom,
        now: Date.now(),
      }),
    ),
  })
  const setRoomResultMutation = useMutation({
    mutationFn: (nextResult: CardValue) =>
      setRoomResultFn({ data: { roomId, result: nextResult } }),
    ...createRoomMutationOptions((currentRoom, nextResult) =>
      setRoomResultState({
        room: currentRoom,
        result: nextResult,
        now: Date.now(),
      }),
    ),
  })

  const isPending =
    joinRoomMutation.isPending ||
    leaveRoomMutation.isPending ||
    changeRoleMutation.isPending ||
    castVoteMutation.isPending ||
    revealVotesMutation.isPending ||
    resetRoundMutation.isPending ||
    rerollRoundMutation.isPending ||
    setRoomResultMutation.isPending

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

  const handleResultChange = (nextResult: CardValue) => {
    if (!room?.revealed || !isResultInputFocused || nextResult === room.result) {
      return
    }

    setFeedbackMessage(null)
    setResultInput(nextResult)
    setRoomResultMutation.mutate(nextResult)
  }

  const handleReveal = () => {
    setFeedbackMessage(null)
    revealVotesMutation.mutate(undefined)
  }

  const handleAccept = () => {
    setFeedbackMessage(null)
    resetRoundMutation.mutate(undefined)
  }

  const handleReroll = () => {
    setFeedbackMessage(null)
    rerollRoundMutation.mutate(undefined)
  }

  const commitResultInput = () => {
    if (!room?.revealed) {
      return
    }

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

    if (nextResult === room.result) {
      return
    }

    setFeedbackMessage(null)
    setRoomResultMutation.mutate(nextResult)
  }

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(window.location.href)
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
        void navigate({ to: "/" })
      },
    })
  }

  if (isLoading) {
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

  const canReset = room.revealed || room.members.some((member) => member.vote !== null)
  const centerLabel = `${voteProgress?.readyCount ?? 0} / ${voteProgress?.participantCount ?? 0}`

  return (
    <>
      {roomMenuPortalElement
        ? createPortal(
            <div className="grid grid-cols-[1fr_auto] items-center justify-items-start gap-3">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={handleCopyLink}
                  variant="ghost"
                  size="icon"
                  className="size-8 sm:size-9"
                >
                  <Share1Icon />
                </Button>
                <Link to={window.location.href} className="whitespace-nowrap">
                  {room.roomId}
                </Link>
              </div>

              <div className="flex gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <span className="hidden sm:inline">spectate</span>
                  <Switch
                    checked={currentMember?.role === "spectator"}
                    disabled={!currentMember || isPending}
                    onCheckedChange={(checked) =>
                      handleRoleSwitch(checked ? "spectator" : "participant")
                    }
                  />
                </label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleExit}
                  aria-label="Exit room"
                  className="px-2 sm:px-4"
                >
                  <ExitIcon />
                </Button>
              </div>
            </div>,
            roomMenuPortalElement,
          )
        : null}

      <VoteDeck
        selectedVote={room?.revealed ? (room.result ?? null) : (currentMember?.vote ?? null)}
        disabled={room?.revealed ? !isResultInputFocused : currentMember?.role !== "participant"}
        isPending={isPending}
        preventButtonFocus={room?.revealed && isResultInputFocused}
        onVote={room?.revealed ? handleResultChange : handleVote}
      />
      <Card className="w-full max-w-5xl">
        <CardContent className="p-4 sm:p-6">
          <div className="bg-muted/20 relative mx-auto aspect-square w-full max-w-4xl rounded-[999px] border sm:aspect-video">
            <RoomMemberList room={room} currentMemberId={identity?.memberId ?? null} />

            <div
              className={`bg-background absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3 rounded-[999px] border py-4 text-center shadow-sm sm:py-5 ${
                room.revealed ? "w-44 px-4 sm:w-52 sm:px-5" : "w-44 px-5 sm:w-56 sm:px-6"
              }`}
            >
              {room.revealed ? (
                <div className="flex w-full justify-center">
                  <Input
                    id="result"
                    value={resultInput}
                    onChange={(event) => setResultInput(event.target.value.trim())}
                    onFocus={() => {
                      if (resultBlurTimeoutRef.current !== null) {
                        window.clearTimeout(resultBlurTimeoutRef.current)
                      }

                      setIsResultInputFocused(true)
                    }}
                    onBlur={() => {
                      commitResultInput()
                      resultBlurTimeoutRef.current = window.setTimeout(() => {
                        setIsResultInputFocused(false)
                        resultBlurTimeoutRef.current = null
                      }, 0)
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault()
                        commitResultInput()
                      }
                    }}
                    size={2}
                    className="w-12 text-center text-sm font-semibold sm:text-base"
                    disabled={isPending}
                  />
                </div>
              ) : (
                <div className="text-muted-foreground text-sm">{centerLabel}</div>
              )}
              <datalist id="planning-poker-result-values">
                {cardValues.map((cardValue) => (
                  <option key={cardValue} value={cardValue} />
                ))}
              </datalist>
              {room.revealed ? (
                <div className="grid w-full grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReroll}
                    disabled={isPending || !canReset}
                    className="h-8 w-full text-xs sm:h-9 sm:text-sm"
                  >
                    Reroll
                  </Button>
                  <Button
                    type="button"
                    onClick={handleAccept}
                    disabled={isPending || !canReset}
                    className="h-8 w-full text-xs sm:h-9 sm:text-sm"
                  >
                    Accept
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  onClick={handleReveal}
                  disabled={isPending || room.members.length === 0}
                  className="h-8 w-full text-xs sm:h-9 sm:text-sm"
                >
                  Reveal
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <RoomHistory history={room.history} />

      {feedbackMessage ? <p className="text-destructive text-sm">{feedbackMessage}</p> : null}

      <RoomJoinPanel
        open={!currentMember}
        joinName={joinName}
        isPending={isPending}
        errorMessage={feedbackMessage}
        onJoinNameChange={setJoinName}
        onSubmit={handleJoinRoom}
      />
    </>
  )
}

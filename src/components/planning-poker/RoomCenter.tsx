import { useIsMutating } from "@tanstack/react-query"
import { Button } from "@tohuhono/ui/button"
import { Input } from "@tohuhono/ui/input"
import { useRef } from "react"

import {
  useClaimDealerMutation,
  usePassDealerMutation,
  roomMutationKey,
  useRerollRoundMutation,
  useResetRoundMutation,
  useRevealVotesMutation,
} from "#/hooks/use-room-mutations"
import { getActiveDealer, type CardValue, type RoomState } from "#/lib/planning-poker"

import { formatRoomError } from "./room-error"

const EditableResultCenter = ({
  value,
  onChange,
  onCommit,
  onFocusChange,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  onCommit: () => void
  onFocusChange: (focused: boolean) => void
  disabled: boolean
}) => {
  const blurTimeoutRef = useRef<number | null>(null)

  return (
    <div className="flex w-full justify-center">
      <Input
        id="result"
        aria-label="Room result"
        value={value}
        onChange={(event) => onChange(event.target.value.trim())}
        onFocus={() => {
          if (blurTimeoutRef.current !== null) {
            window.clearTimeout(blurTimeoutRef.current)
          }
          onFocusChange(true)
        }}
        onBlur={() => {
          onCommit()
          blurTimeoutRef.current = window.setTimeout(() => {
            onFocusChange(false)
            blurTimeoutRef.current = null
          }, 0)
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault()
            onCommit()
          }
        }}
        size={2}
        className="w-12 text-center text-sm font-semibold sm:text-base"
        disabled={disabled}
      />
    </div>
  )
}

const RevealedResultCenter = ({ result }: { result: CardValue | null }) => (
  <div className="text-foreground text-lg font-semibold sm:text-xl">{result ?? "-"}</div>
)

const VoteProgressCenter = ({ centerLabel }: { centerLabel: string }) => (
  <div className="text-muted-foreground text-sm">{centerLabel}</div>
)

const RevealedRoundControls = ({
  handleReroll,
  handleAccept,
  isRoundResetPending,
  canReset,
}: {
  handleReroll: () => void
  handleAccept: () => void
  isRoundResetPending: boolean
  canReset: boolean
}) => (
  <div className="grid w-full grid-cols-2 gap-2">
    <Button
      type="button"
      variant="outline"
      onClick={handleReroll}
      disabled={isRoundResetPending || !canReset}
      className="h-8 w-full text-xs sm:h-9 sm:text-sm"
    >
      Reroll
    </Button>
    <Button
      type="button"
      onClick={handleAccept}
      disabled={isRoundResetPending || !canReset}
      className="h-8 w-full text-xs sm:h-9 sm:text-sm"
    >
      Accept
    </Button>
  </div>
)

const HiddenRoundControls = ({
  handleReveal,
  isRevealPending,
  memberCount,
}: {
  handleReveal: () => void
  isRevealPending: boolean
  memberCount: number
}) => (
  <Button
    type="button"
    onClick={handleReveal}
    disabled={isRevealPending || memberCount === 0}
    className="h-8 w-full text-xs sm:h-9 sm:text-sm"
  >
    Reveal
  </Button>
)

const ClaimDealerButton = ({
  handleClaimDealer,
  isDealerControlsBusy,
}: {
  handleClaimDealer: () => void
  isDealerControlsBusy: boolean
}) => (
  <Button
    type="button"
    variant="outline"
    onClick={handleClaimDealer}
    disabled={isDealerControlsBusy}
    className="h-8 w-full text-xs sm:h-9 sm:text-sm"
  >
    Claim dealer
  </Button>
)

const PassDealerButton = ({
  handlePassDealer,
  isDealerControlsBusy,
}: {
  handlePassDealer: () => void
  isDealerControlsBusy: boolean
}) => (
  <Button
    type="button"
    variant="outline"
    onClick={handlePassDealer}
    disabled={isDealerControlsBusy}
    className="h-8 w-full text-xs sm:h-9 sm:text-sm"
  >
    Pass dealer
  </Button>
)

const RoundControls = ({
  room,
  currentMemberId,
}: {
  room: RoomState
  currentMemberId: string | null
}) => {
  const currentMember = room.members.find((member) => member.id === currentMemberId) ?? null
  const activeDealer = getActiveDealer(room)
  const isCurrentDealer = activeDealer?.id === currentMember?.id
  const canUseDealerControls = Boolean(currentMember) && (!activeDealer || isCurrentDealer)
  const canReveal = canUseDealerControls && Boolean(currentMember)
  const canReset = room.revealed || room.members.some((member) => member.vote !== null)
  const mutationOptions = { formatRoomError }
  const { mutate: mutateRevealVotes } = useRevealVotesMutation(mutationOptions)
  const { mutate: mutateResetRound } = useResetRoundMutation(mutationOptions)
  const { mutate: mutateRerollRound } = useRerollRoundMutation(mutationOptions)
  const revealMutations = useIsMutating({
    mutationKey: roomMutationKey(room.roomId, "reveal"),
  })
  const resetMutations = useIsMutating({ mutationKey: roomMutationKey(room.roomId, "reset") })
  const rerollMutations = useIsMutating({ mutationKey: roomMutationKey(room.roomId, "reroll") })
  const isRevealPending = revealMutations > 0
  const isRoundResetPending = resetMutations > 0 || rerollMutations > 0

  if (!canReveal) {
    return null
  }

  return room.revealed ? (
    <RevealedRoundControls
      handleReroll={() => mutateRerollRound(undefined)}
      handleAccept={() => mutateResetRound(undefined)}
      isRoundResetPending={isRoundResetPending}
      canReset={canReset}
    />
  ) : (
    <HiddenRoundControls
      handleReveal={() => mutateRevealVotes(undefined)}
      isRevealPending={isRevealPending}
      memberCount={room.members.length}
    />
  )
}

const DealerControls = ({
  room,
  currentMemberId,
}: {
  room: RoomState
  currentMemberId: string | null
}) => {
  const currentMember = room.members.find((member) => member.id === currentMemberId) ?? null
  const activeDealer = getActiveDealer(room)
  const isCurrentDealer = activeDealer?.id === currentMember?.id
  const canClaimDealer = Boolean(currentMember) && activeDealer === null
  const canPassDealer = Boolean(isCurrentDealer)
  const mutationOptions = { formatRoomError }
  const { mutate: mutateClaimDealer } = useClaimDealerMutation(mutationOptions)
  const { mutate: mutatePassDealer } = usePassDealerMutation(mutationOptions)
  const claimDealerMutations = useIsMutating({
    mutationKey: roomMutationKey(room.roomId, "claimDealer"),
  })
  const passDealerMutations = useIsMutating({
    mutationKey: roomMutationKey(room.roomId, "passDealer"),
  })
  const revealMutations = useIsMutating({
    mutationKey: roomMutationKey(room.roomId, "reveal"),
  })
  const resetMutations = useIsMutating({ mutationKey: roomMutationKey(room.roomId, "reset") })
  const rerollMutations = useIsMutating({ mutationKey: roomMutationKey(room.roomId, "reroll") })
  const isDealerControlsBusy =
    claimDealerMutations > 0 ||
    passDealerMutations > 0 ||
    revealMutations > 0 ||
    resetMutations > 0 ||
    rerollMutations > 0

  if (canClaimDealer) {
    return (
      <ClaimDealerButton
        handleClaimDealer={() => mutateClaimDealer(undefined)}
        isDealerControlsBusy={isDealerControlsBusy}
      />
    )
  }

  if (canPassDealer) {
    return (
      <PassDealerButton
        handlePassDealer={() => mutatePassDealer(undefined)}
        isDealerControlsBusy={isDealerControlsBusy}
      />
    )
  }

  return null
}

export const RoomCenter = {
  EditableResult: EditableResultCenter,
  RevealedResult: RevealedResultCenter,
  VoteProgress: VoteProgressCenter,
  RevealedControls: RevealedRoundControls,
  HiddenControls: HiddenRoundControls,
  ClaimDealer: ClaimDealerButton,
  PassDealer: PassDealerButton,
  RoundControls,
  DealerControls,
}

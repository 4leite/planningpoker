import { useIsMutating } from "@tanstack/react-query"
import { Button } from "@tohuhono/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@tohuhono/ui/tooltip"

import { useMemberId } from "#/hooks/use-planning-poker-identity"
import {
  useClaimDealerMutation,
  usePassDealerMutation,
  roomMutationKey,
} from "#/hooks/use-room-mutations"
import { useRoomData } from "#/hooks/use-room-realtime"
import { getActiveDealer } from "#/lib/planning-poker"

import { formatRoomError } from "./room-error"

const ClaimDealerButton = ({
  handleClaimDealer,
  isDealerControlsBusy,
}: {
  handleClaimDealer: () => void
  isDealerControlsBusy: boolean
}) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClaimDealer}
          disabled={isDealerControlsBusy}
          className="w-full"
        >
          Deal
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">Take control of table</TooltipContent>
    </Tooltip>
  </TooltipProvider>
)

const PassDealerButton = ({
  handlePassDealer,
  isDealerControlsBusy,
}: {
  handlePassDealer: () => void
  isDealerControlsBusy: boolean
}) => (
  <div className="w-full">
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            onClick={handlePassDealer}
            disabled={isDealerControlsBusy}
            className="h-8 w-full text-xs sm:h-9 sm:text-sm"
          >
            Pass
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Release control of table</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </div>
)

export const DealerControls = () => {
  const { room } = useRoomData()

  const currentMemberId = useMemberId()
  const roomId = room?.roomId ?? ""
  const mutationOptions = { formatRoomError }
  const { mutate: mutateClaimDealer } = useClaimDealerMutation(mutationOptions)
  const { mutate: mutatePassDealer } = usePassDealerMutation(mutationOptions)
  const claimDealerMutations = useIsMutating({
    mutationKey: roomMutationKey(roomId, "claimDealer"),
  })
  const passDealerMutations = useIsMutating({
    mutationKey: roomMutationKey(roomId, "passDealer"),
  })
  const revealMutations = useIsMutating({
    mutationKey: roomMutationKey(roomId, "reveal"),
  })
  const resetMutations = useIsMutating({ mutationKey: roomMutationKey(roomId, "reset") })
  const rerollMutations = useIsMutating({ mutationKey: roomMutationKey(roomId, "reroll") })
  const isDealerControlsBusy =
    claimDealerMutations > 0 ||
    passDealerMutations > 0 ||
    revealMutations > 0 ||
    resetMutations > 0 ||
    rerollMutations > 0

  if (!room) {
    return null
  }

  const currentMember = room.members.find((member) => member.id === currentMemberId) ?? null
  const activeDealer = getActiveDealer(room)
  const isCurrentDealer = activeDealer?.id === currentMember?.id
  const canClaimDealer = Boolean(currentMember) && activeDealer === null
  const canPassDealer = Boolean(isCurrentDealer)

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

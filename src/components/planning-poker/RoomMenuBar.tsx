import { ExitIcon, Share1Icon } from "@radix-ui/react-icons"
import { useNavigate } from "@tanstack/react-router"
import { Button } from "@tohuhono/ui/button"
import { Switch } from "@tohuhono/ui/switch"
import { createPortal } from "react-dom"

import { useMenuState } from "#/components/layout/MenuContext"
import { usePlanningPokerIdentity } from "#/hooks/use-planning-poker-identity"
import { useChangeRoleMutation, useLeaveRoomMutation } from "#/hooks/use-room-mutations"
import { useRoomData } from "#/hooks/use-room-realtime"

import { formatRoomError } from "./room-error"

export const RoomMenuBar = () => {
  const navigate = useNavigate()
  const { identity } = usePlanningPokerIdentity()
  const { room } = useRoomData()
  const identityMemberId = identity?.memberId ?? null
  const { roomMenuPortalElement } = useMenuState()
  const { mutate: mutateChangeRole, isPending: isRoleChangePending } = useChangeRoleMutation({
    formatRoomError,
  })
  const { mutate: mutateLeaveRoom } = useLeaveRoomMutation({
    formatRoomError,
  })

  if (!room) {
    return null
  }

  const currentMember = room.members.find((member) => member.id === identityMemberId) ?? null

  const handleExit = () => {
    if (!identity) {
      void navigate({ to: "/" })
      return
    }

    mutateLeaveRoom(undefined, {
      onSuccess: () => {
        void navigate({ to: "/" })
      },
    })
  }

  if (!roomMenuPortalElement) return null

  return createPortal(
    <div className="grid grid-cols-[1fr_auto] items-center justify-items-start gap-3">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          onClick={() => navigator.clipboard.writeText(window.location.href)}
          variant="ghost"
          size="icon"
          aria-label="Copy room link"
          className="size-8 sm:size-9"
        >
          <Share1Icon />
        </Button>
        <span className="whitespace-nowrap">{room.roomId}</span>
      </div>

      <div className="flex gap-2">
        <label className="flex items-center gap-2 text-sm">
          <span className="hidden sm:inline">spectate</span>
          <Switch
            checked={currentMember?.role === "spectator"}
            disabled={!currentMember || isRoleChangePending}
            aria-label="Spectate"
            onCheckedChange={(checked) => mutateChangeRole(checked ? "spectator" : "participant")}
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
}

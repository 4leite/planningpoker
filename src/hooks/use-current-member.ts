import { useMemberId } from "#/hooks/use-planning-poker-identity"
import { useRoomData } from "#/hooks/use-room-realtime"

export const useCurrentMember = () => {
  const { room } = useRoomData()
  const currentMemberId = useMemberId()

  return room?.members.find((member) => member.id === currentMemberId) ?? null
}

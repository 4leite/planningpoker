import { queryOptions } from "@tanstack/react-query"

import { type RoomState } from "#/lib/planning-poker"

export const roomQueryKey = (roomId: string) => ["room", roomId] as const

export const roomQueryOptions = ({
  roomId,
  queryFn,
  initialData,
  enabled,
}: {
  roomId: string
  queryFn: () => Promise<RoomState | null>
  initialData?: RoomState | null
  enabled?: boolean
}) =>
  queryOptions({
    queryKey: roomQueryKey(roomId),
    queryFn,
    initialData,
    enabled,
  })

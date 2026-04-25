import { queryOptions } from "@tanstack/react-query"

import { type RoomState } from "#/lib/planning-poker"

export const roomQueryKey = () => ["room"] as const

export const roomQueryOptions = ({
  queryFn,
  initialData,
  enabled,
}: {
  queryFn: () => Promise<RoomState | null>
  initialData?: RoomState | null
  enabled?: boolean
}) =>
  queryOptions({
    queryKey: roomQueryKey(),
    queryFn,
    initialData,
    enabled,
  })

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useServerFn } from "@tanstack/react-start"
import { useEffect, useState } from "react"

import { roomUpdatedEventSchema, type RoomState } from "#/lib/planning-poker"
import { roomQueryKey, roomQueryOptions } from "#/lib/room-query"
import { reconcileRoomSnapshot } from "#/lib/room-sync"
import { getRoomSnapshotFn } from "#/lib/room.functions"

export const useRoomRealtime = ({
  initialRoom,
  roomId,
}: {
  initialRoom: RoomState | null
  roomId: string
}) => {
  const queryClient = useQueryClient()
  const [connectionState, setConnectionState] = useState<
    "idle" | "connecting" | "live" | "reconnecting"
  >(initialRoom ? "connecting" : "idle")
  const fetchSnapshot = useServerFn(getRoomSnapshotFn)

  const query = useQuery(
    roomQueryOptions({
      roomId,
      initialData: initialRoom ?? undefined,
      queryFn: () =>
        fetchSnapshot({
          data: {
            roomId,
          },
        }),
    }),
  )

  const hasActiveRoom = query.data !== null && query.data !== undefined

  const setRoom = (nextRoom: RoomState | null) => {
    queryClient.setQueryData(roomQueryKey(roomId), (currentRoom: RoomState | null | undefined) => {
      return reconcileRoomSnapshot({
        currentRoom,
        nextRoom,
      })
    })
  }

  useEffect(() => {
    if (!hasActiveRoom) {
      setConnectionState("idle")
      return
    }

    const eventSource = new EventSource(`/api/rooms/${encodeURIComponent(roomId)}/events`)

    const handleRoomUpdated = (event: Event) => {
      if (!(event instanceof MessageEvent)) {
        return
      }

      try {
        const parsed = roomUpdatedEventSchema.parse(JSON.parse(event.data))
        setRoom(parsed.room)
        setConnectionState("live")
      } catch {
        setConnectionState("reconnecting")
      }
    }

    eventSource.addEventListener("room.updated", handleRoomUpdated)
    eventSource.onopen = () => {
      setConnectionState("live")
    }
    eventSource.onerror = () => {
      setConnectionState("reconnecting")
    }

    return () => {
      eventSource.removeEventListener("room.updated", handleRoomUpdated)
      eventSource.close()
      setConnectionState("idle")
    }
  }, [hasActiveRoom, roomId])

  return {
    room: query.data ?? null,
    setRoom,
    connectionState,
    isLoading: query.isPending,
  }
}

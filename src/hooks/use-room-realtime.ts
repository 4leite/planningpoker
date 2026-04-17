import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useServerFn } from "@tanstack/react-start"
import { useEffect, useState } from "react"

import { roomUpdatedEventSchema, type RoomState } from "#/lib/planning-poker"
import { roomQueryKey, roomQueryOptions } from "#/lib/room-query"
import { getRoomSnapshotFn } from "#/lib/room.functions"

export const useRoomRealtime = ({
  initialRoom,
  roomId,
  enabled,
}: {
  initialRoom: RoomState | null
  roomId: string
  enabled: boolean
}) => {
  const queryClient = useQueryClient()
  const [connectionState, setConnectionState] = useState<
    "idle" | "connecting" | "live" | "reconnecting"
  >(enabled ? "connecting" : "idle")
  const fetchSnapshot = useServerFn(getRoomSnapshotFn)

  const query = useQuery(
    roomQueryOptions({
      roomId,
      enabled,
      initialData: initialRoom,
      queryFn: () =>
        fetchSnapshot({
          data: {
            roomId,
          },
        }),
    }),
  )

  const setRoom = (nextRoom: RoomState | null) => {
    queryClient.setQueryData(roomQueryKey(roomId), (currentRoom: RoomState | null | undefined) => {
      if (!nextRoom) {
        return null
      }

      if (!currentRoom || nextRoom.version >= currentRoom.version) {
        return nextRoom
      }

      return currentRoom
    })
  }

  useEffect(() => {
    if (!enabled) {
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
  }, [enabled, roomId])

  return {
    room: query.data ?? null,
    setRoom,
    connectionState,
  }
}

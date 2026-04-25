import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"

import { type RoomState } from "#/lib/planning-poker"
import {
  reconcileRoomSnapshot,
  roomSocketMessageSchema,
  type RoomSocketAction,
} from "#/lib/room-sync"

export const roomQueryKey = () => ["room"] as const
export const roomFeedbackQueryKey = () => ["room", "feedback"] as const
export const roomMetaQueryKey = () => ["room", "meta"] as const

type RoomMeta = {
  isBootstrapping: boolean
  hasReceivedSnapshot: boolean
}

export type SendAction = (action: Omit<RoomSocketAction, "mutationId">) => Promise<RoomState | null>

export const useRoomFeedback = () => {
  const queryClient = useQueryClient()
  const { data: feedbackMessage = null } = useQuery<string | null>({
    queryKey: roomFeedbackQueryKey(),
    queryFn: () => null,
    staleTime: Infinity,
    gcTime: Infinity,
    enabled: false,
    initialData: null,
  })

  const setFeedbackMessage = (message: string | null) => {
    queryClient.setQueryData(roomFeedbackQueryKey(), message)
  }

  const clearFeedbackMessage = () => {
    setFeedbackMessage(null)
  }

  return {
    feedbackMessage,
    setFeedbackMessage,
    clearFeedbackMessage,
  }
}

export const useRoomRealtime = ({ roomId }: { roomId: string }) => {
  const queryClient = useQueryClient()
  const socketRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<number | null>(null)
  const pendingActionsRef = useRef(
    new Map<
      string,
      { resolve: (room: RoomState | null) => void; reject: (error: Error) => void }
    >(),
  )
  const actionCounterRef = useRef(0)
  const [connectionState, setConnectionState] = useState<
    "idle" | "connecting" | "live" | "reconnecting"
  >("connecting")

  const setRoomMeta = (nextMeta: RoomMeta) => {
    queryClient.setQueryData(roomMetaQueryKey(), nextMeta)
  }

  useEffect(() => {
    let disposed = false
    let sawMissingRoom = false

    setRoomMeta({
      isBootstrapping: true,
      hasReceivedSnapshot: false,
    })

    const rejectPendingActions = (error: Error) => {
      for (const [mutationId, pendingAction] of pendingActionsRef.current) {
        pendingAction.reject(error)
        pendingActionsRef.current.delete(mutationId)
      }
    }

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current === null) {
        return
      }

      window.clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }

    const connect = () => {
      clearReconnectTimer()
      setConnectionState((currentState) =>
        currentState === "idle" ? "connecting" : "reconnecting",
      )

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
      const socket = new WebSocket(
        `${protocol}//${window.location.host}/api/rooms/${encodeURIComponent(roomId)}/socket`,
      )
      socketRef.current = socket

      socket.onopen = () => {
        setConnectionState("live")
      }

      socket.onmessage = (event) => {
        try {
          const message = roomSocketMessageSchema.parse(JSON.parse(event.data))

          if (message.type === "room.snapshot") {
            setRoomMeta({
              isBootstrapping: false,
              hasReceivedSnapshot: true,
            })
            sawMissingRoom = message.room === null
            queryClient.setQueryData(roomQueryKey(), (currentRoom: RoomState | null | undefined) =>
              reconcileRoomSnapshot({ currentRoom: currentRoom ?? null, nextRoom: message.room }),
            )
            if (message.mutationId) {
              pendingActionsRef.current.get(message.mutationId)?.resolve(message.room)
              pendingActionsRef.current.delete(message.mutationId)
            }
            return
          }

          const error = new Error(message.error)
          pendingActionsRef.current.get(message.mutationId)?.reject(error)
          pendingActionsRef.current.delete(message.mutationId)
        } catch {
          setConnectionState("reconnecting")
        }
      }

      socket.onerror = () => {
        setConnectionState("reconnecting")
      }

      socket.onclose = () => {
        if (socketRef.current === socket) {
          socketRef.current = null
        }

        if (disposed || sawMissingRoom) {
          rejectPendingActions(new Error("room_socket_closed"))
          setConnectionState(sawMissingRoom ? "idle" : "reconnecting")
          return
        }

        rejectPendingActions(new Error("room_socket_reconnecting"))
        setConnectionState("reconnecting")
        reconnectTimerRef.current = window.setTimeout(connect, 1000)
      }
    }

    connect()

    return () => {
      disposed = true
      clearReconnectTimer()
      rejectPendingActions(new Error("room_socket_closed"))
      socketRef.current?.close()
      socketRef.current = null
      setConnectionState("idle")
      setRoomMeta({
        isBootstrapping: true,
        hasReceivedSnapshot: false,
      })
    }
  }, [roomId, queryClient])

  const sendAction: SendAction = (action) => {
    const socket = socketRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error("room_socket_reconnecting"))
    }

    const mutationId = `${Date.now()}-${actionCounterRef.current}`
    actionCounterRef.current += 1

    return new Promise<RoomState | null>((resolve, reject) => {
      pendingActionsRef.current.set(mutationId, { resolve, reject })
      socket.send(JSON.stringify({ ...action, mutationId }))
    })
  }

  return {
    sendAction,
    connectionState,
  }
}

export const useRoomData = () => {
  const { data: room = null } = useQuery<RoomState | null>({
    queryKey: roomQueryKey(),
    queryFn: () => null,
    staleTime: Infinity,
    gcTime: Infinity,
    enabled: false,
    initialData: null,
  })

  return { room }
}

export const useRoomMeta = () => {
  const { data: meta = { isBootstrapping: true, hasReceivedSnapshot: false } } = useQuery<RoomMeta>(
    {
      queryKey: roomMetaQueryKey(),
      queryFn: () => ({ isBootstrapping: true, hasReceivedSnapshot: false }),
      staleTime: Infinity,
      gcTime: Infinity,
      enabled: false,
      initialData: { isBootstrapping: true, hasReceivedSnapshot: false },
    },
  )

  return meta
}

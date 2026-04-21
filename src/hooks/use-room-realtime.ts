import { useEffect, useRef, useState } from "react"

import { type RoomState } from "#/lib/planning-poker"
import {
  reconcileRoomSnapshot,
  roomSocketMessageSchema,
  type RoomSocketAction,
} from "#/lib/room-sync"

export const useRoomRealtime = ({
  initialRoom,
  roomId,
}: {
  initialRoom: RoomState | null
  roomId: string
}) => {
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
  const [room, setRoomState] = useState<RoomState | null>(initialRoom)
  const [isLoading, setIsLoading] = useState(true)

  const setRoom = (nextRoom: RoomState | null) => {
    setRoomState((currentRoom) =>
      reconcileRoomSnapshot({
        currentRoom,
        nextRoom,
      }),
    )
  }

  useEffect(() => {
    let disposed = false
    let sawMissingRoom = false

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
          setIsLoading(false)

          if (message.type === "room.snapshot") {
            sawMissingRoom = message.room === null
            setRoom(message.room)
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
    }
  }, [roomId])

  const sendAction = (action: Omit<RoomSocketAction, "mutationId">) => {
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
    room,
    setRoom,
    sendAction,
    connectionState,
    isLoading,
  }
}

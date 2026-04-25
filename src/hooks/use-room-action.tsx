import { createContext, useContext } from "react"

import { useRoomRealtime, type SendAction } from "./use-room-realtime"

type RoomActionContextValue = {
  sendAction: SendAction
}

const RoomActionContext = createContext<RoomActionContextValue | null>(null)

export const RoomRealtimeProvider = ({
  roomId,
  children,
}: {
  roomId: string
  children: React.ReactNode
}) => {
  const { sendAction } = useRoomRealtime({ roomId })

  return <RoomActionContext.Provider value={{ sendAction }}>{children}</RoomActionContext.Provider>
}

export const useRoomAction = () => {
  const value = useContext(RoomActionContext)

  if (!value) {
    throw new Error("useRoomAction must be used within RoomRealtimeProvider")
  }

  return value.sendAction
}

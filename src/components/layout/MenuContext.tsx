import { createContext, useContext, useState } from "react"

type RoomMenuState = {
  roomLinkLabel: string
  onCopyLink: () => void
  spectatorChecked: boolean
  spectatorDisabled: boolean
  onSpectatorChange: (checked: boolean) => void
  exitDisabled: boolean
  onExit: () => void
}

const MenuContext = createContext<{
  roomMenu: RoomMenuState | null
  setRoomMenu: React.Dispatch<React.SetStateAction<RoomMenuState | null>>
} | null>(null)

export const MenuProvider = ({ children }: { children: React.ReactNode }) => {
  const [roomMenu, setRoomMenu] = useState<RoomMenuState | null>(null)

  return <MenuContext.Provider value={{ roomMenu, setRoomMenu }}>{children}</MenuContext.Provider>
}

export const useMenuState = () => {
  const value = useContext(MenuContext)

  if (!value) {
    throw new Error("useMenuState must be used within MenuProvider")
  }

  return value
}

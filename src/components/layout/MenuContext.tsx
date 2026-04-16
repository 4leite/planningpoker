import { createContext, useContext, useState } from "react"

const MenuContext = createContext<{
  roomMenuPortalElement: HTMLDivElement | null
  setRoomMenuPortalElement: React.Dispatch<React.SetStateAction<HTMLDivElement | null>>
} | null>(null)

export const MenuProvider = ({ children }: { children: React.ReactNode }) => {
  const [roomMenuPortalElement, setRoomMenuPortalElement] = useState<HTMLDivElement | null>(null)

  return (
    <MenuContext.Provider value={{ roomMenuPortalElement, setRoomMenuPortalElement }}>
      {children}
    </MenuContext.Provider>
  )
}

export const useMenuState = () => {
  const value = useContext(MenuContext)

  if (!value) {
    throw new Error("useMenuState must be used within MenuProvider")
  }

  return value
}

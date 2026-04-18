import { useEffect, useRef } from "react"

import { ModeToggle } from "../ModeToggle"
import { useMenuState } from "./MenuContext"

export const Menu = () => {
  const { setRoomMenuPortalElement } = useMenuState()
  const portalRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setRoomMenuPortalElement(portalRef.current)

    return () => {
      setRoomMenuPortalElement(null)
    }
  }, [setRoomMenuPortalElement])

  return (
    <aside className="bg-sidebar text-sidebar-foreground grid w-full grid-cols-[1fr_auto] items-center gap-2 p-2">
      <div ref={portalRef} />
      <ModeToggle className="px-2 sm:px-4" />
    </aside>
  )
}

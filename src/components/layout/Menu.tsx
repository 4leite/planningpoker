import { ExitIcon } from "@radix-ui/react-icons"
import { Button } from "@tohuhono/ui/button"
import { Switch } from "@tohuhono/ui/switch"
import { cn } from "@tohuhono/utils"

import { ModeToggle } from "../ModeToggle"
import { useMenuState } from "./MenuContext"

export const Menu = () => {
  const { roomMenu } = useMenuState()

  return (
    <aside
      className={cn(
        "bg-sidebar flex w-full items-center gap-3 p-4",
        roomMenu ? "justify-between" : "justify-end",
      )}
    >
      {roomMenu ? (
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={roomMenu.onCopyLink}
            className="text-muted-foreground max-w-40 truncate text-sm underline underline-offset-4 sm:max-w-none"
          >
            {roomMenu.roomLinkLabel}
          </button>
          <label className="flex items-center gap-2 text-sm">
            <span>spectator</span>
            <Switch
              checked={roomMenu.spectatorChecked}
              disabled={roomMenu.spectatorDisabled}
              onCheckedChange={roomMenu.onSpectatorChange}
            />
          </label>
          <Button
            type="button"
            variant="outline"
            className="h-9 w-9 p-0"
            disabled={roomMenu.exitDisabled}
            onClick={roomMenu.onExit}
            aria-label="Exit room"
          >
            <ExitIcon />
          </Button>
        </div>
      ) : null}

      <ModeToggle />
    </aside>
  )
}

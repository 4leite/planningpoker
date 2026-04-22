import { useNavigate } from "@tanstack/react-router"
import { Button, buttonVariants } from "@tohuhono/ui/button"
import { Input } from "@tohuhono/ui/input"
import { cn } from "@tohuhono/utils"
import { maxLength } from "human-id"
import { useState } from "react"

import { roomIdSchema } from "#/lib/planning-poker"

export const HomeScreen = ({
  initialErrorMessage = null,
}: {
  initialErrorMessage?: string | null
}) => {
  const navigate = useNavigate()
  const [joinRoomId, setJoinRoomId] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(initialErrorMessage)

  const handleJoinRoom = (event: React.FormEvent<HTMLFormElement>) => {
    const submitter = "submitter" in event.nativeEvent ? event.nativeEvent.submitter : null

    if (submitter instanceof HTMLButtonElement && submitter.value === "create") {
      setErrorMessage(null)
      return
    }

    event.preventDefault()
    const normalizedRoomId = joinRoomId.trim().toLocaleLowerCase()

    if (!roomIdSchema.safeParse(normalizedRoomId).success) {
      setErrorMessage("Use a room id like silver-regions-try.")
      return
    }

    setErrorMessage(null)
    void navigate({
      to: "/r/$room",
      params: { room: normalizedRoomId },
    })
  }

  const hasJoinRoomId = joinRoomId.trim().length > 0

  return (
    <form className="flex w-md flex-col gap-4" onSubmit={handleJoinRoom}>
      <Button
        type="submit"
        name="action"
        value="create"
        formAction="/api/rooms/create"
        formMethod="post"
        className="w-full"
      >
        Create New Table
      </Button>
      <div className="group relative grid grid-cols-[0fr_auto] gap-3 transition-all duration-600 ease-in-out focus-within:grid-cols-[1fr_auto] hover:grid-cols-[1fr_auto]">
        <span
          className={cn(
            buttonVariants({ variant: "secondary" }),
            "text-secondary-foreground/50 visible absolute z-10 h-full w-full transition-all transition-discrete duration-300 ease-in-out",
            "group-focus-within:hidden group-focus-within:opacity-0",
            "group-hover:hidden group-hover:opacity-0",
            "sr-only:hidden",
          )}
        >
          Join Existing Room
        </span>
        <Input
          value={joinRoomId}
          onChange={(event) => setJoinRoomId(event.target.value)}
          maxLength={maxLength()}
          placeholder="room id"
          aria-label="Room id"
          className="w-full text-center"
        />

        <Button
          type={"submit"}
          name="action"
          value="join"
          variant="secondary"
          disabled={!hasJoinRoomId}
          className={cn("h-full w-auto")}
        >
          Join
        </Button>
      </div>
      {errorMessage ? <p className="text-destructive text-sm">{errorMessage}</p> : null}
    </form>
  )
}

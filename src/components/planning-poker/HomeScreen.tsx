import { useMutation } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"
import { Button, buttonVariants } from "@tohuhono/ui/button"
import { Input } from "@tohuhono/ui/input"
import { cn } from "@tohuhono/utils"
import { maxLength } from "human-id"
import { useState } from "react"

import { roomIdSchema } from "#/lib/planning-poker"
import { createRoomFn } from "#/lib/room.functions"

export const HomeScreen = () => {
  const navigate = useNavigate()
  const createRoomServerFn = useServerFn(createRoomFn)
  const [joinRoomId, setJoinRoomId] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const createRoomMutation = useMutation({
    mutationFn: () =>
      createRoomServerFn({
        data: {},
      }),
    onSuccess: ({ roomId }) => {
      void navigate({
        to: "/r/$room",
        params: { room: roomId },
      })
    },
    onError: (error) => {
      setErrorMessage(
        error instanceof Error ? error.message : "We could not open a room right now.",
      )
    },
  })

  const handleCreateRoom = () => {
    setErrorMessage(null)
    createRoomMutation.mutate()
  }

  const handleJoinRoom = (event: React.FormEvent<HTMLFormElement>) => {
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
        type="button"
        className="w-full"
        disabled={createRoomMutation.isPending}
        onClick={handleCreateRoom}
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
          className="w-full text-center"
        />

        <Button
          type={"submit"}
          variant="secondary"
          disabled={createRoomMutation.isPending || !hasJoinRoomId}
          className={cn("h-full w-auto")}
        >
          Join
        </Button>
      </div>
      {errorMessage ? <p className="text-destructive text-sm">{errorMessage}</p> : null}
    </form>
  )
}

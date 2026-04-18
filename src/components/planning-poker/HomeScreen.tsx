import { useMutation } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"
import { Button } from "@tohuhono/ui/button"
import { Input } from "@tohuhono/ui/input"
import { useState } from "react"

import { roomIdSchema } from "#/lib/planning-poker"
import { createRoomFn } from "#/lib/room.functions"

export const HomeScreen = () => {
  const navigate = useNavigate()
  const createRoomServerFn = useServerFn(createRoomFn)
  const [joinRoomId, setJoinRoomId] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const createRoomMutation = useMutation({
    mutationFn: () => createRoomServerFn(),
    onSuccess: ({ roomId }) => {
      void navigate({
        to: "/rooms/$room",
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
      to: "/rooms/$room",
      params: { room: normalizedRoomId },
    })
  }

  return (
    <main className="mx-auto flex min-h-[calc(100svh-4.5rem)] w-full max-w-2xl items-center justify-center px-4 py-10">
      <form className="flex w-full max-w-xl flex-col items-center gap-4" onSubmit={handleJoinRoom}>
        <Input
          value={joinRoomId}
          onChange={(event) => setJoinRoomId(event.target.value)}
          placeholder="room id"
          className="h-12 text-center text-base"
        />
        <div className="flex w-full justify-center gap-3">
          <Button
            type="submit"
            variant="outline"
            className="min-w-28"
            disabled={createRoomMutation.isPending}
          >
            enter
          </Button>
          <Button
            type="button"
            className="min-w-28"
            disabled={createRoomMutation.isPending}
            onClick={handleCreateRoom}
          >
            create
          </Button>
        </div>
        {errorMessage ? <p className="text-destructive text-sm">{errorMessage}</p> : null}
      </form>
    </main>
  )
}

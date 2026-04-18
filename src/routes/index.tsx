import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { HomeScreen } from "#/components/planning-poker/HomeScreen"

export const Route = createFileRoute("/")({
  validateSearch: z.object({
    room: z.string().optional(),
  }),
  head: () => ({
    meta: [
      {
        title: "Planning Poker | Fast public estimation rooms",
      },
    ],
  }),
  component: App,
})

function App() {
  return <HomeScreen />
}

import { createFileRoute } from "@tanstack/react-router"

import { HomeScreen } from "#/components/planning-poker/HomeScreen"

export const Route = createFileRoute("/")({
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

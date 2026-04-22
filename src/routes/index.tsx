import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { HomeScreen } from "#/components/planning-poker/HomeScreen"

const landingPageCacheControl = "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800"

export const Route = createFileRoute("/")({
  validateSearch: z.object({
    createError: z.string().optional(),
    room: z.string().optional(),
  }),
  headers: () => ({
    "Cache-Control": landingPageCacheControl,
    "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet, noimageindex",
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
  const { createError } = Route.useSearch()

  return (
    <HomeScreen initialErrorMessage={createError ? "We could not open a room right now." : null} />
  )
}

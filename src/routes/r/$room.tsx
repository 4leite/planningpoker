import { createFileRoute } from "@tanstack/react-router"

import { RoomScreen } from "#/components/planning-poker/RoomScreen"

const roomShellCacheControl = "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800"

export const Route = createFileRoute("/r/$room")({
  headers: () => ({
    "Cache-Control": roomShellCacheControl,
    "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet, noimageindex",
  }),
  head: ({ params }) => ({
    meta: [
      {
        title: `Room ${params.room} | Planning Poker`,
      },
    ],
  }),
  component: RoomRoute,
})

function RoomRoute() {
  const { room } = Route.useParams()

  return <RoomScreen initialRoom={null} roomId={room} />
}

import { createFileRoute } from "@tanstack/react-router"

import { RoomScreen } from "#/components/planning-poker/RoomScreen"
import { getRoomSnapshotFn } from "#/lib/room.functions"

export const Route = createFileRoute("/rooms/$room")({
  loader: ({ params }) =>
    getRoomSnapshotFn({
      data: {
        roomId: params.room,
      },
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
  const initialRoom = Route.useLoaderData()
  const { room } = Route.useParams()

  return <RoomScreen initialRoom={initialRoom} roomId={room} />
}

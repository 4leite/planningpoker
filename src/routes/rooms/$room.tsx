import { createFileRoute, redirect } from "@tanstack/react-router";

import { RoomScreen } from "#/components/planning-poker/RoomScreen";
import { getRoomSnapshotFn } from "#/lib/room.functions";

export const Route = createFileRoute("/rooms/$room")({
  loader: async ({ params }) => {
    const room = await getRoomSnapshotFn({
      data: {
        roomId: params.room,
      },
    });

    if (!room) {
      throw redirect({ to: "/", search: { room: params.room } });
    }

    return room;
  },
  head: ({ params }) => ({
    meta: [
      {
        title: `Room ${params.room} | Planning Poker`,
      },
    ],
  }),
  component: RoomRoute,
});

function RoomRoute() {
  const initialRoom = Route.useLoaderData();
  const { room } = Route.useParams();

  return <RoomScreen initialRoom={initialRoom} roomId={room} />;
}

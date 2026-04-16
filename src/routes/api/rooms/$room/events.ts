import { createFileRoute } from "@tanstack/react-router"

import { roomIdSchema } from "#/lib/planning-poker"
import { subscribeToRoomEvents, type RoomBackendConfig } from "#/lib/room.server"

const encoder = new TextEncoder()

const getRoomBackend = (): RoomBackendConfig => {
  if (process.env.ROOM_BACKEND === "memory") {
    return { kind: "memory" }
  }

  const redisUrl = process.env.REDIS_URL
  if (process.env.ROOM_BACKEND === "redis") {
    if (!redisUrl) {
      throw new Error("REDIS_URL is not configured")
    }

    return {
      kind: "redis",
      url: redisUrl,
    }
  }

  if (redisUrl) {
    return {
      kind: "redis",
      url: redisUrl,
    }
  }

  if (process.env.NODE_ENV !== "production") {
    return { kind: "memory" }
  }

  throw new Error("REDIS_URL is not configured")
}

export const Route = createFileRoute("/api/rooms/$room/events")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const roomId = roomIdSchema.parse(params.room)
        const backend = getRoomBackend()

        let cleanup: (() => Promise<void>) | null = null
        let keepAliveTimer: ReturnType<typeof setInterval> | null = null
        let closed = false

        const closeStream = async (controller?: ReadableStreamDefaultController<Uint8Array>) => {
          if (closed) {
            return
          }

          closed = true

          if (keepAliveTimer) {
            clearInterval(keepAliveTimer)
          }

          try {
            controller?.close()
          } catch {
            // no-op
          }

          await cleanup?.()
        }

        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const sendChunk = (value: string) => {
              controller.enqueue(encoder.encode(value))
            }

            sendChunk("retry: 2000\n\n")

            request.signal.addEventListener(
              "abort",
              () => {
                void closeStream(controller)
              },
              { once: true },
            )

            keepAliveTimer = setInterval(() => {
              try {
                sendChunk(`: keepalive ${Date.now()}\n\n`)
              } catch {
                void closeStream(controller)
              }
            }, 15000)

            cleanup = await subscribeToRoomEvents(backend, roomId, (message) => {
              try {
                sendChunk(`event: room.updated\ndata: ${message}\n\n`)
              } catch {
                void closeStream(controller)
              }
            })
          },
          async cancel() {
            await closeStream()
          },
        })

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
          },
        })
      },
    },
  },
})

const roomCreateWindowMs = 60 * 1000
const roomCreateLimit = 5

const requestBuckets = new Map<string, number[]>()

const isLoopbackAddress = (value: string) =>
  value === "127.0.0.1" || value === "::1" || value === "localhost" || value === "::ffff:127.0.0.1"

const getClientKey = (request: Request) => {
  const forwardedFor = request.headers.get("x-forwarded-for")
  const realIp = forwardedFor?.split(",")[0]?.trim()
  const cfConnectingIp = request.headers.get("cf-connecting-ip")
  const xRealIp = request.headers.get("x-real-ip")

  if (realIp || cfConnectingIp || xRealIp) {
    const clientIp = realIp ?? cfConnectingIp ?? xRealIp
    if (!clientIp) {
      return null
    }

    return isLoopbackAddress(clientIp) ? null : clientIp
  }

  return null
}

const pruneExpired = (now: number, entries: number[]) =>
  entries.filter((timestamp) => now - timestamp < roomCreateWindowMs)

export const assertRoomCreateAllowed = (request: Request, now: number) => {
  const clientKey = getClientKey(request)
  if (!clientKey) {
    return
  }

  const recentRequests = pruneExpired(now, requestBuckets.get(clientKey) ?? [])

  if (recentRequests.length >= roomCreateLimit) {
    requestBuckets.set(clientKey, recentRequests)
    throw new Error("room_create_rate_limited")
  }

  recentRequests.push(now)
  requestBuckets.set(clientKey, recentRequests)
}

const roomCreateWindowMs = 60 * 1000
const roomCreateLimit = 5

const requestBuckets = new Map<string, number[]>()

const getClientKey = (request: Request) => {
  const forwardedFor = request.headers.get("x-forwarded-for")
  const realIp = forwardedFor?.split(",")[0]?.trim()

  return (
    realIp ||
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("user-agent") ||
    "anonymous"
  )
}

const pruneExpired = (now: number, entries: number[]) =>
  entries.filter((timestamp) => now - timestamp < roomCreateWindowMs)

export const assertRoomCreateAllowed = (request: Request, now: number) => {
  const clientKey = getClientKey(request)
  const recentRequests = pruneExpired(now, requestBuckets.get(clientKey) ?? [])

  if (recentRequests.length >= roomCreateLimit) {
    requestBuckets.set(clientKey, recentRequests)
    throw new Error("room_create_rate_limited")
  }

  recentRequests.push(now)
  requestBuckets.set(clientKey, recentRequests)
}

import { test } from "./fixtures/room"

const namePool = [
  "Alice",
  "Bob",
  "Carol",
  "Dave",
  "Eve",
  "Frank",
  "Grace",
  "Hank",
  "Ivy",
  "Jules",
  "Kai",
  "Lena",
  "Maya",
  "Nico",
  "Owen",
  "Pia",
  "Quinn",
  "Rae",
  "Sage",
  "Tess",
  "Uma",
  "Vera",
  "Wes",
  "Xena",
  "Yara",
  "Zane",
] as const

const getMemberNames = (count: number) =>
  Array.from({ length: count }, (_, index) => {
    const baseName = namePool[index % namePool.length] ?? "Alice"
    const cycle = Math.floor(index / namePool.length)

    return cycle === 0 ? baseName : `${baseName} ${cycle + 1}`
  })

test("seed room for manual join @manual", async ({
  createRoomWithCreator,
  openMember,
  expectMemberVisible,
}, testInfo) => {
  test.setTimeout(0)

  const requestedCount = Number.parseInt(process.env.SEED_ROOM_MEMBER_COUNT ?? "12", 10)
  const memberCount = Number.isFinite(requestedCount) && requestedCount > 0 ? requestedCount : 12
  const memberNames = getMemberNames(memberCount)
  const creatorName = memberNames[0] ?? "Alice"
  const { roomUrl, creator } = await createRoomWithCreator(creatorName)

  testInfo.annotations.push({ type: "room-url", description: roomUrl })
  console.log(`\nRoom ready for manual join: ${roomUrl}\n`)

  for (const name of memberNames.slice(1)) {
    await openMember(roomUrl, name)
  }

  for (const name of memberNames) {
    await expectMemberVisible(creator.page, name)
  }

  await creator.page.pause()
})

import { expect, test } from "./fixtures/room"
import { castVote, revealVotes } from "./support/member-actions"
import { roomHistoryRow, roomResultInput } from "./support/room-selectors"

const MEMBER_NAMES = ["Alice", "Bob", "Carol", "Dave", "Eve", "Frank", "Grace", "Hank"] as const

test.describe("Room stress", () => {
  test.describe.configure({ mode: "serial" })

  test("eight members can join the same room and all become visible @stress", async ({
    createRoomWithCreator,
    openMember,
    expectMemberVisible,
  }) => {
    const { roomUrl, creator } = await createRoomWithCreator(MEMBER_NAMES[0])
    const sessions = [creator]

    for (const name of MEMBER_NAMES.slice(1)) {
      sessions.push(await openMember(roomUrl, name))
    }

    for (const name of MEMBER_NAMES) {
      await expectMemberVisible(creator.page, name)
    }
  })

  test("a high-capacity room completes a full reveal cycle @stress @realtime", async ({
    createRoomWithCreator,
    openMember,
  }) => {
    const { roomUrl, creator } = await createRoomWithCreator(MEMBER_NAMES[0])
    const sessions = [creator]

    for (const name of MEMBER_NAMES.slice(1)) {
      sessions.push(await openMember(roomUrl, name))
    }

    for (const session of sessions) {
      await castVote(session.page, "5")
    }

    await revealVotes(creator.page)

    await expect(roomResultInput(creator.page)).toHaveValue("5")
    await expect(roomHistoryRow(creator.page, 1)).toContainText("8/8")
    await expect(roomHistoryRow(creator.page, 1)).toContainText("5")
  })
})

import { type MemberSession, expect, test } from "./fixtures/room"
import {
  acceptRound,
  castVote,
  createRoom,
  joinRoom,
  overrideResult,
  revealVotes,
  rerollRound,
} from "./support/member-actions"
import {
  revealButton,
  roomHistoryRow,
  roomResultInput,
  roomSeat,
  seatStatus,
  voteButton,
  voteProgress,
} from "./support/room-selectors"

const delayRoomSocketActions = async ({
  page,
  actionTypes,
  delayMs,
}: {
  page: Parameters<typeof voteButton>[0]
  actionTypes: string[]
  delayMs: number
}) => {
  await page.addInitScript(
    ({ nextActionTypes, nextDelayMs }) => {
      const delayedTypes = new Set(nextActionTypes)
      const originalSend = WebSocket.prototype.send

      WebSocket.prototype.send = function patchedSend(data) {
        if (typeof data === "string") {
          try {
            const parsed = JSON.parse(data) as { type?: string }
            if (parsed.type && delayedTypes.has(parsed.type)) {
              window.setTimeout(() => {
                Reflect.apply(originalSend, this, [data])
              }, nextDelayMs)
              return
            }
          } catch {
            // Fall through to the native send when payload parsing fails.
          }
        }

        return Reflect.apply(originalSend, this, [data])
      }
    },
    { nextActionTypes: actionTypes, nextDelayMs: delayMs },
  )
}

const setupTwoMembers = async (
  createRoomWithCreator: (
    creatorName: string,
  ) => Promise<{ roomUrl: string; creator: MemberSession }>,
  openMember: (roomUrl: string, name: string) => Promise<MemberSession>,
) => {
  const { roomUrl, creator } = await createRoomWithCreator("Alice")
  const bob = await openMember(roomUrl, "Bob")

  return {
    alice: creator,
    bob,
  }
}

test.describe("Room voting", () => {
  test("participants can change votes while earlier vote requests are still pending @realtime", async ({
    page,
  }) => {
    await delayRoomSocketActions({
      page,
      actionTypes: ["room.castVote"],
      delayMs: 400,
    })

    await createRoom(page)
    await joinRoom(page, "Alice")

    await voteButton(page, "3").click()
    await expect(voteButton(page, "5")).toBeEnabled()

    await voteButton(page, "5").click()
    await expect(voteButton(page, "8")).toBeEnabled()

    await voteButton(page, "8").click()
    await expect(voteButton(page, "8")).toHaveAttribute("aria-pressed", "true")
  })

  test("reveal disables itself while the reveal request is pending @realtime", async ({ page }) => {
    await delayRoomSocketActions({
      page,
      actionTypes: ["room.reveal"],
      delayMs: 400,
    })

    await createRoom(page)
    await joinRoom(page, "Alice")

    await revealButton(page).click()
    await expect(revealButton(page)).toBeDisabled()
  })

  test("votes stay hidden until reveal and update other clients live @smoke @realtime", async ({
    createRoomWithCreator,
    openMember,
  }) => {
    const { alice, bob } = await setupTwoMembers(createRoomWithCreator, openMember)

    await castVote(alice.page, "3")
    await expect(seatStatus(bob.page, "Alice", "voted")).toBeVisible()
    await expect(roomSeat(bob.page, "Alice").getByText("3", { exact: true })).toHaveCount(0)

    await castVote(bob.page, "5")
    await expect(seatStatus(alice.page, "Bob", "voted")).toBeVisible()

    await revealVotes(alice.page)

    await expect(seatStatus(alice.page, "Bob", "5")).toBeVisible()
    await expect(seatStatus(bob.page, "Alice", "3")).toBeVisible()
  })

  test("reveal shows the computed result and a history row @smoke @realtime", async ({
    createRoomWithCreator,
    openMember,
  }) => {
    const { alice, bob } = await setupTwoMembers(createRoomWithCreator, openMember)

    await castVote(alice.page, "3")
    await castVote(bob.page, "5")
    await revealVotes(alice.page)

    await expect(roomResultInput(alice.page)).toHaveValue("3")
    await expect(roomResultInput(bob.page)).toHaveValue("3")
    await expect(roomHistoryRow(alice.page, 1)).toContainText("4")
    await expect(roomHistoryRow(alice.page, 1)).toContainText("2/2")
    await expect(roomHistoryRow(alice.page, 1)).toContainText("3")
  })

  test("accept resets the room into a fresh hidden round @smoke @realtime", async ({
    createRoomWithCreator,
    openMember,
  }) => {
    const { alice, bob } = await setupTwoMembers(createRoomWithCreator, openMember)

    await castVote(alice.page, "3")
    await castVote(bob.page, "5")
    await revealVotes(alice.page)
    await acceptRound(alice.page)

    await expect(revealButton(alice.page)).toBeVisible()
    await expect(revealButton(bob.page)).toBeVisible()
    await expect(voteProgress(alice.page, "0 / 2")).toBeVisible()
    await expect(voteProgress(bob.page, "0 / 2")).toBeVisible()
    await expect(roomHistoryRow(alice.page, 1)).toBeVisible()
  })

  test("reroll removes the latest revealed round and returns to a hidden round @realtime", async ({
    createRoomWithCreator,
    openMember,
  }) => {
    const { alice, bob } = await setupTwoMembers(createRoomWithCreator, openMember)

    await castVote(alice.page, "3")
    await castVote(bob.page, "5")
    await revealVotes(alice.page)
    await rerollRound(alice.page)

    await expect(revealButton(alice.page)).toBeVisible()
    await expect(revealButton(bob.page)).toBeVisible()
    await expect(roomHistoryRow(alice.page, 1)).toHaveCount(0)
    await expect(voteProgress(alice.page, "0 / 2")).toBeVisible()
  })

  test("result override updates the revealed room live @realtime", async ({
    createRoomWithCreator,
    openMember,
  }) => {
    const { alice, bob } = await setupTwoMembers(createRoomWithCreator, openMember)

    await castVote(alice.page, "3")
    await castVote(bob.page, "5")
    await revealVotes(alice.page)
    await overrideResult(alice.page, "5")

    await expect(roomResultInput(alice.page)).toHaveValue("5")
    await expect(roomResultInput(bob.page)).toHaveValue("5")
    await expect(roomHistoryRow(alice.page, 1)).toContainText("4")
    await expect(roomHistoryRow(alice.page, 1)).toContainText("5")
    await expect(roomHistoryRow(alice.page, 1)).toContainText("2/2")
  })
})

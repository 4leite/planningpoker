import { expect, test } from "./fixtures/room"
import { castVote, setSpectatorMode } from "./support/member-actions"
import { roomSeat, seatStatus, spectateToggle, voteButton } from "./support/room-selectors"

test.describe("Room roles", () => {
  test("spectators cannot cast a vote from the deck @errors", async ({ createRoomWithCreator }) => {
    const { creator } = await createRoomWithCreator("Alice")

    await setSpectatorMode(creator.page, true)

    await expect(spectateToggle(creator.page)).toBeChecked()
    await expect(voteButton(creator.page, "5")).toBeDisabled()
    await expect(seatStatus(creator.page, "Alice", "spectating")).toBeVisible()
  })

  test("switching to spectator clears the visible vote state for other clients @realtime", async ({
    createRoomWithCreator,
    openMember,
  }) => {
    const { roomUrl, creator } = await createRoomWithCreator("Alice")
    const bob = await openMember(roomUrl, "Bob")

    await castVote(creator.page, "5")
    await expect(seatStatus(bob.page, "Alice", "voted")).toBeVisible()

    await setSpectatorMode(creator.page, true)

    await expect(seatStatus(bob.page, "Alice", "spectating")).toBeVisible()
    await expect(roomSeat(bob.page, "Alice").getByText("voted", { exact: true })).toHaveCount(0)
  })

  test("switching back to participant re-enables voting and updates other clients @realtime", async ({
    createRoomWithCreator,
    openMember,
  }) => {
    const { roomUrl, creator } = await createRoomWithCreator("Alice")
    const bob = await openMember(roomUrl, "Bob")

    await setSpectatorMode(creator.page, true)
    await expect(seatStatus(bob.page, "Alice", "spectating")).toBeVisible()

    await setSpectatorMode(creator.page, false)

    await expect(voteButton(creator.page, "8")).toBeEnabled()
    await expect(roomSeat(bob.page, "Alice").getByText("spectating", { exact: true })).toHaveCount(
      0,
    )

    await castVote(creator.page, "8")
    await expect(seatStatus(bob.page, "Alice", "voted")).toBeVisible()
  })
})

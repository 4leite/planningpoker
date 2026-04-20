import { expect, type Page } from "@playwright/test"

import {
  acceptButton,
  createRoomButton,
  displayNameInput,
  landingJoinButton,
  rerollButton,
  revealButton,
  roomIdInput,
  roomJoinButton,
  roomResultInput,
  roomSeat,
  spectateToggle,
  voteButton,
} from "./room-selectors"

export const roomIdFromUrl = (roomUrl: string) => {
  const roomId = new URL(roomUrl).pathname.split("/").filter(Boolean).at(-1)

  if (!roomId) {
    throw new Error(`Unable to determine room id from ${roomUrl}`)
  }

  return roomId
}

export const createRoom = async (page: Page) => {
  await page.goto("/")
  await createRoomButton(page).click()
  await expect(page).toHaveURL(/\/r\//)
  await expect(displayNameInput(page)).toBeVisible()
  return page.url()
}

export const joinExistingRoomFromLanding = async (page: Page, roomId: string) => {
  await page.goto("/")
  await roomIdInput(page).fill(roomId)
  await landingJoinButton(page).click()
  await expect(page).toHaveURL(new RegExp(`/r/${roomId}$`))
  await expect(displayNameInput(page)).toBeVisible()
}

export const joinRoom = async (page: Page, name: string) => {
  await expect(displayNameInput(page)).toBeVisible()
  await displayNameInput(page).fill(name)
  await roomJoinButton(page).click()
  await expect(roomSeat(page, name)).toBeVisible()
}

export const castVote = async (page: Page, vote: string) => {
  await voteButton(page, vote).click()
}

export const revealVotes = async (page: Page) => {
  await revealButton(page).click()
}

export const acceptRound = async (page: Page) => {
  await acceptButton(page).click()
}

export const rerollRound = async (page: Page) => {
  await rerollButton(page).click()
}

export const setSpectatorMode = async (page: Page, shouldSpectate: boolean) => {
  const toggle = spectateToggle(page)
  const isChecked = await toggle.isChecked()

  if (isChecked !== shouldSpectate) {
    await toggle.click()
  }

  if (shouldSpectate) {
    await expect(toggle).toBeChecked()
  } else {
    await expect(toggle).not.toBeChecked()
  }
}

export const overrideResult = async (page: Page, result: string) => {
  const input = roomResultInput(page)
  await input.click()
  await input.fill(result)
  await input.press("Enter")
}

import { type Locator, type Page } from "@playwright/test"

export const createRoomButton = (page: Page) =>
  page.getByRole("button", { name: "Create New Table" })

export const roomIdInput = (page: Page) => page.getByLabel("Room id")

export const landingJoinButton = (page: Page) =>
  page.getByRole("button", { name: "Join", exact: true })

export const displayNameInput = (page: Page) => page.getByRole("textbox", { name: "Display name" })

export const roomJoinButton = (page: Page) =>
  page.getByRole("button", { name: /^join(?:ing\.\.\.)?$/i })

export const spectateToggle = (page: Page) => page.getByRole("switch", { name: /spectate/i })

export const revealButton = (page: Page) => page.getByRole("button", { name: "Reveal" })

export const acceptButton = (page: Page) => page.getByRole("button", { name: "Accept" })

export const rerollButton = (page: Page) => page.getByRole("button", { name: "Reroll" })

export const exitRoomButton = (page: Page) => page.getByRole("button", { name: "Exit room" })

export const roomResultInput = (page: Page) => page.getByLabel("Room result")

export const voteButton = (page: Page, vote: string) =>
  page.getByRole("button", { name: vote, exact: true })

export const roomSeat = (page: Page, memberName: string) =>
  page.getByRole("article", { name: `Seat for ${memberName}` })

export const roomHistoryRow = (page: Page, round: number) =>
  page.getByRole("listitem", { name: `Round ${round} history` })

export const voteProgress = (page: Page, progress: string) =>
  page.getByText(progress, { exact: true })

export const roomNotFoundMessage = (page: Page) => page.getByText("room not found", { exact: true })

export const seatStatus = (page: Page, memberName: string, value: string | RegExp): Locator =>
  roomSeat(page, memberName).getByText(value, { exact: typeof value === "string" })

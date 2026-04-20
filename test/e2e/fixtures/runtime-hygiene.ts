import { expect, test as base, type Page } from "@playwright/test"

type Matcher = RegExp | string | ((value: string) => boolean)

type RuntimeHygiene = {
  trackPage: (page: Page) => void
  allowConsoleError: (matcher: Matcher) => void
  allowPageError: (matcher: Matcher) => void
  allowRequestFailure: (matcher: Matcher) => void
  ignoreDuring: <T>(callback: () => Promise<T>) => Promise<T>
}

const matches = (matcher: Matcher, value: string) => {
  if (typeof matcher === "string") {
    return value.includes(matcher)
  }

  if (matcher instanceof RegExp) {
    return matcher.test(value)
  }

  return matcher(value)
}

const formatIssues = (label: string, issues: string[]) =>
  issues.length === 0 ? [] : [`${label}:`, ...issues.map((issue) => `- ${issue}`)]

export const test = base.extend<{ runtimeHygiene: RuntimeHygiene }>({
  runtimeHygiene: async ({}, use) => {
    const allowedConsoleErrors: Matcher[] = []
    const allowedPageErrors: Matcher[] = []
    const allowedRequestFailures: Matcher[] = []
    const consoleErrors: string[] = []
    const pageErrors: string[] = []
    const requestFailures: string[] = []
    const trackedPages = new WeakSet<Page>()
    let ignoreDepth = 0

    const trackPage = (trackedPage: Page) => {
      if (trackedPages.has(trackedPage)) {
        return
      }

      trackedPages.add(trackedPage)

      trackedPage.on("console", (message) => {
        if (ignoreDepth > 0 || message.type() !== "error") {
          return
        }

        consoleErrors.push(`${message.text()} (${trackedPage.url() || "about:blank"})`)
      })

      trackedPage.on("pageerror", (error) => {
        if (ignoreDepth > 0) {
          return
        }

        pageErrors.push(`${error.message} (${trackedPage.url() || "about:blank"})`)
      })

      trackedPage.on("requestfailed", (request) => {
        if (ignoreDepth > 0) {
          return
        }

        const failureText = request.failure()?.errorText ?? "unknown error"

        if (
          request.method() === "GET" &&
          request.url().includes("/api/rooms/") &&
          request.url().endsWith("/events") &&
          failureText === "net::ERR_ABORTED"
        ) {
          return
        }

        requestFailures.push(`${request.method()} ${request.url()} (${failureText})`)
      })
    }

    await use({
      trackPage,
      allowConsoleError: (matcher) => {
        allowedConsoleErrors.push(matcher)
      },
      allowPageError: (matcher) => {
        allowedPageErrors.push(matcher)
      },
      allowRequestFailure: (matcher) => {
        allowedRequestFailures.push(matcher)
      },
      ignoreDuring: async (callback) => {
        ignoreDepth += 1

        try {
          return await callback()
        } finally {
          ignoreDepth -= 1
        }
      },
    })

    const unexpectedConsoleErrors = consoleErrors.filter(
      (issue) => !allowedConsoleErrors.some((matcher) => matches(matcher, issue)),
    )
    const unexpectedPageErrors = pageErrors.filter(
      (issue) => !allowedPageErrors.some((matcher) => matches(matcher, issue)),
    )
    const unexpectedRequestFailures = requestFailures.filter(
      (issue) => !allowedRequestFailures.some((matcher) => matches(matcher, issue)),
    )
    const runtimeIssues = [
      ...formatIssues("Unexpected console errors", unexpectedConsoleErrors),
      ...formatIssues("Unexpected page errors", unexpectedPageErrors),
      ...formatIssues("Unexpected request failures", unexpectedRequestFailures),
    ]

    if (runtimeIssues.length > 0) {
      throw new Error(runtimeIssues.join("\n"))
    }
  },
})

export { expect }
export type { RuntimeHygiene }

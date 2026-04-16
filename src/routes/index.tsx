import { createFileRoute } from "@tanstack/react-router"

import { Main } from "#/components/layout/Main"

export const Route = createFileRoute("/")({ component: App })

function App() {
  return <Main />
}

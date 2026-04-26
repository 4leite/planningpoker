import { TanStackDevtools } from "@tanstack/react-devtools"
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools"
import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"

import { AntiFOUC } from "#/components/AntiFOUC"
import { Menu } from "#/components/layout/Menu"
import { MenuProvider } from "#/components/layout/MenuContext"
import { AppQueryProvider } from "#/components/QueryProvider"
import { PlanningPokerIdentityProvider } from "#/hooks/use-planning-poker-identity"

import appCss from "../styles.css?url"

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        name: "robots",
        content: "noindex, nofollow, noarchive, nosnippet, noimageindex",
      },
      {
        name: "googlebot",
        content: "noindex, nofollow, noarchive, nosnippet, noimageindex",
      },
      {
        title: "Planning Poker",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <AntiFOUC />
        <HeadContent />
      </head>
      <body className="bg-background text-foreground mx-auto flex min-h-svh max-w-4xl flex-col">
        <AppQueryProvider>
          <PlanningPokerIdentityProvider>
            <MenuProvider>
              <Menu />
              <main className="flex h-full w-full flex-1 flex-col items-center justify-start gap-2 py-6">
                {children}
              </main>
              <TanStackDevtools
                config={{
                  position: "bottom-right",
                }}
                plugins={[
                  {
                    name: "TanStack Query",
                    render: <ReactQueryDevtoolsPanel />,
                  },

                  {
                    name: "Tanstack Router",
                    render: <TanStackRouterDevtoolsPanel />,
                  },
                ]}
              />
            </MenuProvider>
          </PlanningPokerIdentityProvider>
        </AppQueryProvider>
        <Scripts />
      </body>
    </html>
  )
}

import { createContext, useContext, useEffect } from "react"
import { z } from "zod"

import { useLocalStorage } from "#/hooks/use-local-storage"

const identitySchema = z.object({
  memberId: z.string().uuid(),
  displayName: z.string().default(""),
})

type PlanningPokerIdentity = z.infer<typeof identitySchema>

type PlanningPokerIdentityContextValue = {
  identity: PlanningPokerIdentity | null
  rememberDisplayName: (displayName: string) => void
}

const PlanningPokerIdentityContext = createContext<PlanningPokerIdentityContextValue | null>(null)

const parseIdentity = (rawValue: string | null) => {
  if (!rawValue) {
    return null
  }

  try {
    const parsed = JSON.parse(rawValue)
    const result = identitySchema.safeParse(parsed)
    return result.success ? result.data : null
  } catch {
    return null
  }
}

const usePlanningPokerIdentityState = (): PlanningPokerIdentityContextValue => {
  const [identity, setIdentity] = useLocalStorage<PlanningPokerIdentity>(
    "planning-poker.identity",
    {
      parser: parseIdentity,
    },
  )

  useEffect(() => {
    if (identity?.memberId) {
      return
    }

    setIdentity({
      memberId: crypto.randomUUID(),
      displayName: identity?.displayName ?? "",
    })
  }, [identity, setIdentity])

  const rememberDisplayName = (displayName: string) => {
    setIdentity({
      memberId: identity?.memberId ?? crypto.randomUUID(),
      displayName,
    })
  }

  return {
    identity,
    rememberDisplayName,
  }
}

export const PlanningPokerIdentityProvider = ({ children }: { children: React.ReactNode }) => {
  const value = usePlanningPokerIdentityState()

  return (
    <PlanningPokerIdentityContext.Provider value={value}>
      {children}
    </PlanningPokerIdentityContext.Provider>
  )
}

export const usePlanningPokerIdentity = () => {
  const value = useContext(PlanningPokerIdentityContext)

  if (!value) {
    throw new Error("usePlanningPokerIdentity must be used within PlanningPokerIdentityProvider")
  }

  return value
}

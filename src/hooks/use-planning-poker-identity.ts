import { useEffect } from "react"
import { z } from "zod"

import { useLocalStorage } from "#/hooks/use-local-storage"

const identitySchema = z.object({
  memberId: z.string().uuid(),
  displayName: z.string().default(""),
})

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

export const usePlanningPokerIdentity = () => {
  const [identity, setIdentity] = useLocalStorage<z.infer<typeof identitySchema>>(
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

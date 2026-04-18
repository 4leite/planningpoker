import { useCallback, useMemo, useSyncExternalStore } from "react"

const defaultParser = <T>(value: string | null): T | null => {
  try {
    return value ? JSON.parse(value) : null
  } catch {
    return null
  }
}

export const useLocalStorage = <T>(
  key: string,
  {
    parser = defaultParser,
    init = () => null,
  }: {
    parser?: (value: string | null) => T | null
    init?: () => string | null
  } = {},
): [T | null, (state: T | null) => void] => {
  const storageKey = `oberon:${key}`

  const subscribe = useCallback((callback: () => void) => {
    window.addEventListener("storage", callback)
    window.addEventListener("local-storage-update", callback)
    return () => {
      window.removeEventListener("storage", callback)
      window.removeEventListener("local-storage-update", callback)
    }
  }, [])

  const rawValue = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(storageKey),
    () => {
      if (typeof window === "undefined") {
        return init()
      }

      return localStorage.getItem(storageKey)
    },
  )

  const data = useMemo(() => parser(rawValue), [rawValue, parser])

  const setState = useCallback(
    (newState: T | null) => {
      if (newState === null) {
        localStorage.removeItem(storageKey)
      } else {
        localStorage.setItem(storageKey, JSON.stringify(newState))
      }
      window.dispatchEvent(new Event("local-storage-update"))
    },
    [storageKey],
  )

  return [data, setState]
}

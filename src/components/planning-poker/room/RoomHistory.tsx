import { Button } from "@tohuhono/ui/button"

import { useRoomData } from "#/hooks/use-room-realtime"
import { type RoomHistoryEntry } from "#/lib/planning-poker"

const historyHeadings = ["Average", "Mode", "Result", "Votes"] as const

const formatVoteCount = (voteCount: number, participantCount: number) =>
  `${voteCount}/${participantCount}`

const getHistoryCsv = (history: RoomHistoryEntry[]) =>
  [
    historyHeadings.join(","),
    ...history.map((entry) =>
      [
        entry.average ?? "",
        entry.mode ?? "",
        entry.result ?? "",
        formatVoteCount(entry.voteCount, entry.participantCount),
      ].join(","),
    ),
  ].join("\n")

export const RoomHistory = () => {
  const { room } = useRoomData()
  const history = room?.history ?? []

  if (history.length === 0) {
    return null
  }

  const handleCopyHistory = async () => {
    await navigator.clipboard.writeText(getHistoryCsv(history))
  }

  return (
    <section aria-label="Room history" className="w-full max-w-5xl">
      <ol className="grid w-full grid-cols-[minmax(0,1fr)_auto_auto_auto_auto_minmax(0,1fr)] justify-center">
        <li
          key="headings"
          aria-label="History headings"
          className="text-muted-foreground/75 col-span-6 mx-auto grid grid-cols-subgrid items-center gap-4 text-lg font-medium uppercase sm:max-w-md sm:text-xs"
        >
          <div />
          {historyHeadings.map((heading) => (
            <div key={heading}>{heading}</div>
          ))}
          <Button
            type="button"
            onClick={handleCopyHistory}
            variant="ghost"
            className="w-fit justify-self-end"
            aria-label="Copy room history as CSV"
          >
            Copy History
          </Button>
        </li>
        {history.map((entry, index) => (
          <li
            key={entry.revealedAt}
            aria-label={`Round ${entry.round} history`}
            className="text-foreground/85 col-span-6 grid grid-cols-subgrid gap-4 text-center text-sm transition-transform sm:text-base"
            style={{
              opacity: Math.max(0.18, 1 - index * 0.18),
            }}
          >
            <div />
            <div>{entry.average ?? "-"}</div>
            <div>{entry.mode ?? "-"}</div>
            <div>{entry.result ?? "-"}</div>
            <div>{formatVoteCount(entry.voteCount, entry.participantCount)}</div>
            <div />
          </li>
        ))}
      </ol>
    </section>
  )
}

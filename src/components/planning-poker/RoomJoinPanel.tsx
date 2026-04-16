import { Button } from "@tohuhono/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@tohuhono/ui/dialog"
import { Input } from "@tohuhono/ui/input"

export const RoomJoinPanel = ({
  joinName,
  isPending,
  errorMessage,
  open,
  onJoinNameChange,
  onSubmit,
}: {
  joinName: string
  isPending: boolean
  errorMessage: string | null
  open: boolean
  onJoinNameChange: (value: string) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}) => (
  <Dialog open={open}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Enter your name</DialogTitle>
        <DialogDescription>Pick a display name to join this room.</DialogDescription>
      </DialogHeader>
      <form className="space-y-4" onSubmit={onSubmit}>
        <Input
          value={joinName}
          onChange={(event) => onJoinNameChange(event.target.value)}
          placeholder="name"
          className="h-11"
          autoFocus
        />
        {errorMessage ? <p className="text-destructive text-sm">{errorMessage}</p> : null}
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? "joining..." : "join"}
        </Button>
      </form>
    </DialogContent>
  </Dialog>
)

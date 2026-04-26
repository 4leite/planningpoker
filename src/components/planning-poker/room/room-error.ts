export const formatRoomError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return "Something slipped while updating the room. Try again."
  }

  switch (error.message) {
    case "display_name_taken":
      return "That display name is already taken in this room."
    case "room_not_found":
      return "This room no longer exists."
    case "room_member_missing":
      return "Your seat is not active in this room anymore. Join again to keep playing."
    case "spectators_cannot_vote":
      return "Switch back to participant before casting a vote."
    case "round_already_revealed":
      return "The cards are already face up. Reset to start a new round."
    case "round_not_revealed":
      return "Reveal the cards before changing the result."
    case "dealer_action_forbidden":
      return "Only the current dealer can do that. Ask them to pass dealing or clear it."
    case "dealer_already_claimed":
      return "Dealer is already claimed. Ask them to Pass first."
    default:
      return error.message || "Something slipped while updating the room. Try again."
  }
}

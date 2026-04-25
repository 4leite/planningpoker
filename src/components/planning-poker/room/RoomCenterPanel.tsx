import { useIsMutating } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { useCurrentMember } from "#/hooks/use-current-member";
import {
  roomMutationKey,
  useCastVoteMutation,
  useSetRoomResultMutation,
} from "#/hooks/use-room-mutations";
import { useRoomData, useRoomFeedback } from "#/hooks/use-room-realtime";
import {
  cardValues,
  getActiveDealer,
  type CardValue,
  type RoomState,
} from "#/lib/planning-poker";

import { formatRoomError } from "./room-error";
import { VoteDeck } from "./VoteDeck";
import { Table, TableTop } from "./Table";

const isCardValue = (value: string): value is CardValue =>
  cardValues.some((cardValue) => cardValue === value);

const useResultInput = ({
  room,
  mutateSetRoomResult,
}: {
  room: RoomState | null;
  mutateSetRoomResult: (value: CardValue) => void;
}) => {
  const { setFeedbackMessage } = useRoomFeedback();
  const [resultInput, setResultInput] = useState("");
  const [isResultInputFocused, setIsResultInputFocused] = useState(false);

  useEffect(() => {
    setResultInput(room?.result ?? "");
  }, [room?.result]);

  const commitResultInput = () => {
    if (!room?.revealed) return;

    const nextResult = resultInput.trim();

    if (!nextResult) {
      setResultInput(room.result ?? "");
      return;
    }

    if (!isCardValue(nextResult)) {
      setFeedbackMessage("Choose a card from the deck values.");
      setResultInput(room.result ?? "");
      return;
    }

    if (nextResult === room.result) return;

    mutateSetRoomResult(nextResult);
  };

  const handleResultChange = (nextResult: CardValue) => {
    if (
      !room?.revealed ||
      !isResultInputFocused ||
      nextResult === room.result
    ) {
      return;
    }

    setResultInput(nextResult);
    mutateSetRoomResult(nextResult);
  };

  return {
    resultInput,
    setResultInput,
    isResultInputFocused,
    setIsResultInputFocused,
    commitResultInput,
    handleResultChange,
  };
};

export const RoomCenterPanel = () => {
  const { room } = useRoomData();

  const currentMember = useCurrentMember();
  const mutationOptions = { formatRoomError };

  const { mutate: mutateCastVote, isPending: isVotePending } =
    useCastVoteMutation(mutationOptions);
  const { mutate: mutateSetRoomResult, isPending: isResultPending } =
    useSetRoomResultMutation(mutationOptions);
  const {
    resultInput,
    setResultInput,
    isResultInputFocused,
    setIsResultInputFocused,
    commitResultInput,
    handleResultChange,
  } = useResultInput({ room, mutateSetRoomResult });

  const activeDealer = room ? getActiveDealer(room) : null;
  const isCurrentDealer = activeDealer?.id === currentMember?.id;
  const canUseDealerControls =
    Boolean(currentMember) && (!activeDealer || isCurrentDealer);
  const canEditResult = Boolean(room?.revealed) && canUseDealerControls;
  const resetMutations = useIsMutating({
    mutationKey: roomMutationKey("reset"),
  });
  const rerollMutations = useIsMutating({
    mutationKey: roomMutationKey("reroll"),
  });
  const isRoundResetPending = resetMutations > 0 || rerollMutations > 0;

  if (!room) {
    return null;
  }

  return (
    <>
      <VoteDeck
        selectedVote={
          room.revealed ? (room.result ?? null) : (currentMember?.vote ?? null)
        }
        disabled={
          room.revealed
            ? !canEditResult ||
              !isResultInputFocused ||
              isResultPending ||
              isRoundResetPending
            : currentMember?.role !== "participant"
        }
        isPending={
          room.revealed ? isResultPending || isRoundResetPending : isVotePending
        }
        preventButtonFocus={
          room.revealed && canEditResult && isResultInputFocused
        }
        onVote={
          room.revealed ? handleResultChange : (vote) => mutateCastVote(vote)
        }
      />

      <Table>
        <TableTop
          resultInput={resultInput}
          setResultInput={setResultInput}
          isResultInputFocused={isResultInputFocused}
          setIsResultInputFocused={setIsResultInputFocused}
          commitResultInput={commitResultInput}
        />
      </Table>
    </>
  );
};

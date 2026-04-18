import { Button } from "@tohuhono/ui/button";
import { cn } from "@tohuhono/utils";

import { cardValues, type CardValue } from "#/lib/planning-poker";

export const VoteDeck = ({
  selectedVote,
  disabled,
  isPending,
  onVote,
}: {
  selectedVote: CardValue | null;
  disabled: boolean;
  isPending: boolean;
  onVote: (vote: CardValue) => void;
}) => (
  <div className="grid w-full grid-cols-5 gap-2 sm:gap-3">
    {cardValues.map((cardValue) => {
      const isSelected = selectedVote === cardValue;
      return (
        <Button
          key={cardValue}
          type="button"
          disabled={disabled || isPending}
          onClick={() => onVote(cardValue)}
          variant="outline"
          className={cn(
            "h-11 rounded-lg text-sm font-semibold sm:h-16 sm:text-lg",
            isSelected && "border-primary bg-muted",
          )}
        >
          {cardValue}
        </Button>
      );
    })}
  </div>
);

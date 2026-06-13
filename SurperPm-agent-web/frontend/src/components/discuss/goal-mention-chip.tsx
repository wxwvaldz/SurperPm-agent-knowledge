import { Target } from "lucide-react";

interface GoalMentionChipProps {
  goalRef: string; // e.g. "@goal-3"
}

export function GoalMentionChip({ goalRef }: GoalMentionChipProps) {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 border-2 border-border bg-primary/10 text-xs font-mono font-bold shadow-[1px_1px_0_0_#000]">
      <Target size={10} />
      {goalRef}
    </span>
  );
}

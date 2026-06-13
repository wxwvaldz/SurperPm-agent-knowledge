interface GoalMentionChipProps {
  goalRef: string; // e.g. "@goal-3"
}

export function GoalMentionChip({ goalRef }: GoalMentionChipProps) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-primary/15 text-primary text-xs font-mono font-medium">
      {goalRef}
    </span>
  );
}

export const topicKeys = {
  all: (goalId: string | number) => ["topics", goalId] as const,
  list: (goalId: string | number) => [...topicKeys.all(goalId), "list"] as const,
};

export const discussionKeys = {
  all: (goalId: string | number) => ["discussions", goalId] as const,
  list: (goalId: string | number, topicId?: number | null) =>
    topicId != null
      ? ([...discussionKeys.all(goalId), "list", topicId] as const)
      : ([...discussionKeys.all(goalId), "list"] as const),
};

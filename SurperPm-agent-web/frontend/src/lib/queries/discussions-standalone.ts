export const standaloneDiscussionKeys = {
  all: () => ["discussions-standalone"] as const,
  list: (topicId?: number | null) =>
    topicId != null
      ? ([...standaloneDiscussionKeys.all(), "list", topicId] as const)
      : ([...standaloneDiscussionKeys.all(), "list"] as const),
};

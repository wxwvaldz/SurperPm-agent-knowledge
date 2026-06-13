import { queryOptions } from "@tanstack/react-query";
import { api } from "../api";
import { discussionListSchema, type Discussion } from "../schemas/discussion";
import { parseWithFallback } from "../utils/parse-with-fallback";

export const standaloneDiscussionKeys = {
  all: () => ["discussions-standalone"] as const,
  list: (topicId?: number | null) =>
    topicId != null
      ? ([...standaloneDiscussionKeys.all(), "list", topicId] as const)
      : ([...standaloneDiscussionKeys.all(), "list"] as const),
};

export type { Discussion };

export const standaloneDiscussionListOptions = (topicId?: number | null) =>
  queryOptions({
    queryKey: standaloneDiscussionKeys.list(topicId),
    queryFn: async () => {
      const params = topicId != null ? `?topic_id=${topicId}` : "";
      const res = await api.get(`/discussions${params}`);
      return parseWithFallback(discussionListSchema, res, [] as Discussion[]);
    },
  });

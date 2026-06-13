import { queryOptions } from "@tanstack/react-query";
import { api } from "../api";
import { discussionListSchema, type Discussion } from "../schemas/discussion";
import { parseWithFallback } from "../utils/parse-with-fallback";

export const discussionKeys = {
  all: (goalId: number) => ["discussions", goalId] as const,
  list: (goalId: number, topicId?: number | null) =>
    topicId != null
      ? ([...discussionKeys.all(goalId), "list", topicId] as const)
      : ([...discussionKeys.all(goalId), "list"] as const),
};

export type { Discussion };

export const discussionListOptions = (
  goalId: number,
  topicId?: number | null
) =>
  queryOptions({
    queryKey: discussionKeys.list(goalId, topicId),
    queryFn: async () => {
      const params = topicId != null ? `?topic_id=${topicId}` : "";
      const res = await api.get(
        `/goals/${goalId}/discussions${params}`
      );
      return parseWithFallback(discussionListSchema, res, [] as Discussion[]);
    },
  });

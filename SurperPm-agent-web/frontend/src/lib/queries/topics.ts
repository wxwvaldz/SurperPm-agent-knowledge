import { queryOptions } from "@tanstack/react-query";
import { api } from "../api";
import { topicListSchema } from "../schemas/topic";
import { parseWithFallback } from "../utils/parse-with-fallback";

export const topicKeys = {
  all: (goalId: number) => ["topics", goalId] as const,
  list: (goalId: number) => [...topicKeys.all(goalId), "list"] as const,
};

export const topicListOptions = (goalId: number) =>
  queryOptions({
    queryKey: topicKeys.list(goalId),
    queryFn: async () => {
      const res = await api.get(`/goals/${goalId}/topics`);
      return parseWithFallback(topicListSchema, res, []);
    },
  });

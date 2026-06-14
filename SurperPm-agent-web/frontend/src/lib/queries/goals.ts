import { queryOptions } from "@tanstack/react-query";
import { api } from "../api";
import { goalSchema, goalListSchema } from "../schemas/goal";
import { parseWithFallback } from "../utils/parse-with-fallback";

export const goalKeys = {
  all: () => ["goals"] as const,
  list: (topicId?: number) =>
    [...goalKeys.all(), "list", topicId ?? "all"] as const,
  detail: (id: string | number) => ["goals", "detail", id] as const,
};

export const goalListOptions = (topicId?: number) =>
  queryOptions({
    queryKey: goalKeys.list(topicId),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (topicId !== undefined) params.set("topic_id", String(topicId));
      const qs = params.toString();
      const res = await api.get(`/goals${qs ? `?${qs}` : ""}`);
      return parseWithFallback(goalListSchema, res, []);
    },
  });

export const goalDetailOptions = (goalId: string | number) =>
  queryOptions({
    queryKey: goalKeys.detail(goalId),
    queryFn: async () => {
      const res = await api.get(`/goals/${goalId}`);
      return goalSchema.parse(res);
    },
  });

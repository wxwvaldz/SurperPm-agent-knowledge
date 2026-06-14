import { queryOptions } from "@tanstack/react-query";
import { api } from "../api";
import { goalSchema, goalListSchema } from "../schemas/goal";
import { parseWithFallback } from "../utils/parse-with-fallback";

export const goalKeys = {
  all: () => ["goals"] as const,
  list: (groupId?: number) =>
    [...goalKeys.all(), "list", groupId ?? "all"] as const,
  detail: (id: number) => ["goals", "detail", id] as const,
};

export const goalListOptions = (groupId?: number) =>
  queryOptions({
    queryKey: goalKeys.list(groupId),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (groupId !== undefined) params.set("group_id", String(groupId));
      const qs = params.toString();
      const res = await api.get(`/goals${qs ? `?${qs}` : ""}`);
      return parseWithFallback(goalListSchema, res, []);
    },
  });

export const goalDetailOptions = (goalId: number) =>
  queryOptions({
    queryKey: goalKeys.detail(goalId),
    queryFn: async () => {
      const res = await api.get(`/goals/${goalId}`);
      return goalSchema.parse(res);
    },
  });

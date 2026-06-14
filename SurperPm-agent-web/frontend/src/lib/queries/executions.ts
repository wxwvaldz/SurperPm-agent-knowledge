import { queryOptions } from "@tanstack/react-query";
import { api } from "../api";
import { executionListSchema } from "../schemas/execution";
import { parseWithFallback } from "../utils/parse-with-fallback";

export const executionKeys = {
  all: (goalId?: string | number) =>
    goalId != null ? (["executions", goalId] as const) : (["executions"] as const),
  list: (goalId: string | number) => [...executionKeys.all(goalId), "list"] as const,
};

export const executionListOptions = (goalId: string | number) =>
  queryOptions({
    queryKey: executionKeys.list(goalId),
    queryFn: async () => {
      const res = await api.get(`/goals/${goalId}/executions`);
      return parseWithFallback(executionListSchema, res, []);
    },
    staleTime: 10_000,
    refetchInterval: 5_000,
  });

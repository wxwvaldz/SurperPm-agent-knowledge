import { queryOptions } from "@tanstack/react-query";
import { api } from "../api";
import { goalListSchema } from "../schemas/goal";
import { parseWithFallback } from "../utils/parse-with-fallback";

export const goalKeys = {
  all: (wsId: string) => ["goals", wsId] as const,
  list: (wsId: string) => [...goalKeys.all(wsId), "list"] as const,
  detail: (wsId: string, id: number) => [...goalKeys.all(wsId), id] as const,
};

export const goalListOptions = (workspaceId: string) =>
  queryOptions({
    queryKey: goalKeys.list(workspaceId),
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspaceId}/goals`);
      return parseWithFallback(goalListSchema, res, []);
    },
  });

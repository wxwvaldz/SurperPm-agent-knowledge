import { queryOptions } from "@tanstack/react-query";
import { api } from "../api";
import { workspaceListSchema } from "../schemas/workspace";
import { parseWithFallback } from "../utils/parse-with-fallback";

export const workspaceKeys = {
  all: () => ["workspaces"] as const,
  list: () => [...workspaceKeys.all(), "list"] as const,
  detail: (id: string) => [...workspaceKeys.all(), id] as const,
};

export const workspaceListOptions = () =>
  queryOptions({
    queryKey: workspaceKeys.list(),
    queryFn: async () => {
      const res = await api.get("/workspaces");
      return parseWithFallback(workspaceListSchema, res, []);
    },
  });

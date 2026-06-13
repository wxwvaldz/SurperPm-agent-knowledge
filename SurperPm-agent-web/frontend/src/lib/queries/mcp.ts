import { queryOptions } from "@tanstack/react-query";
import { api } from "../api";
import { mcpServerListSchema } from "../schemas/mcp";
import { parseWithFallback } from "../utils/parse-with-fallback";

export const mcpKeys = {
  all: (wsId: string) => ["mcp", wsId] as const,
  list: (wsId: string) => [...mcpKeys.all(wsId), "list"] as const,
};

export const mcpListOptions = (workspaceId: string) =>
  queryOptions({
    queryKey: mcpKeys.list(workspaceId),
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspaceId}/mcp/servers`);
      return parseWithFallback(mcpServerListSchema, res, []);
    },
    enabled: !!workspaceId,
  });

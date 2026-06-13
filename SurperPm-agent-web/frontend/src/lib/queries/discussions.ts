import { queryOptions } from "@tanstack/react-query";
import { api } from "../api";
import { discussionListSchema, type Discussion } from "../schemas/discussion";
import { parseWithFallback } from "../utils/parse-with-fallback";

export const discussionKeys = {
  all: (wsId: string) => ["discussions", wsId] as const,
  list: (wsId: string) => [...discussionKeys.all(wsId), "list"] as const,
};

export type { Discussion };

export const discussionListOptions = (workspaceId: string) =>
  queryOptions({
    queryKey: discussionKeys.list(workspaceId),
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspaceId}/discussions`);
      return parseWithFallback(discussionListSchema, res, [] as Discussion[]);
    },
  });

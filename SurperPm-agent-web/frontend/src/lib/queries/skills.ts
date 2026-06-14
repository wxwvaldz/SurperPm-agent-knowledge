import { queryOptions } from "@tanstack/react-query";
import { api } from "../api";
import { skillDetailSchema, skillSummaryListSchema } from "../schemas/skill";
import { parseWithFallback } from "../utils/parse-with-fallback";

export const skillKeys = {
  all: (wsId: string) => ["skills", wsId] as const,
  list: (wsId: string) => [...skillKeys.all(wsId), "list"] as const,
  detail: (wsId: string, slug: string) =>
    [...skillKeys.all(wsId), slug] as const,
};

export const skillListOptions = (workspaceId: string) =>
  queryOptions({
    queryKey: skillKeys.list(workspaceId),
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspaceId}/skills`);
      return parseWithFallback(skillSummaryListSchema, res, []);
    },
    enabled: !!workspaceId,
  });

export const skillDetailOptions = (workspaceId: string, slug: string) =>
  queryOptions({
    queryKey: skillKeys.detail(workspaceId, slug),
    queryFn: async () => {
      const res = await api.get(
        `/workspaces/${workspaceId}/skills/${slug}`,
      );
      return parseWithFallback(skillDetailSchema, res, null);
    },
    enabled: !!workspaceId && !!slug,
  });

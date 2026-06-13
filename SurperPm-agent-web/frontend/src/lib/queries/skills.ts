import { queryOptions } from "@tanstack/react-query";
import { api } from "../api";
import { skillDetailSchema, skillSummaryListSchema } from "../schemas/skill";
import { parseWithFallback } from "../utils/parse-with-fallback";

export const skillKeys = {
  all: (wsId: string) => ["skills", wsId] as const,
  list: (wsId: string) => [...skillKeys.all(wsId), "list"] as const,
  detail: (wsId: string, id: number) => [...skillKeys.all(wsId), id] as const,
};

export const skillListOptions = (workspaceId: string) =>
  queryOptions({
    queryKey: skillKeys.list(workspaceId),
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspaceId}/skills`);
      return parseWithFallback(skillSummaryListSchema, res, []);
    },
  });

export const skillDetailOptions = (workspaceId: string, skillId: number) =>
  queryOptions({
    queryKey: skillKeys.detail(workspaceId, skillId),
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspaceId}/skills/${skillId}`);
      return parseWithFallback(skillDetailSchema, res, null);
    },
  });

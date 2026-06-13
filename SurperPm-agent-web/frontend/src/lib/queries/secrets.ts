import { queryOptions } from "@tanstack/react-query";
import { api } from "../api";
import { secretListSchema } from "../schemas/secret";
import { parseWithFallback } from "../utils/parse-with-fallback";

export const secretKeys = {
  all: (slug: string) => ["secrets", slug] as const,
  list: (slug: string) => [...secretKeys.all(slug), "list"] as const,
  detail: (slug: string, id: number) => [...secretKeys.all(slug), id] as const,
};

export const secretListOptions = (workspaceSlug: string) =>
  queryOptions({
    queryKey: secretKeys.list(workspaceSlug),
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspaceSlug}/secrets`);
      return parseWithFallback(secretListSchema, res, []);
    },
  });

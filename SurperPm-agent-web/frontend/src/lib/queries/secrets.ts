import { queryOptions } from "@tanstack/react-query";
import { api } from "../api";
import { secretListSchema } from "../schemas/secret";
import { parseWithFallback } from "../utils/parse-with-fallback";

export const secretKeys = {
  all: () => ["secrets"] as const,
  list: () => [...secretKeys.all(), "list"] as const,
};

export const secretListOptions = () =>
  queryOptions({
    queryKey: secretKeys.list(),
    queryFn: async () => {
      const res = await api.get("/global-config/secrets");
      return parseWithFallback(secretListSchema, res, []);
    },
  });

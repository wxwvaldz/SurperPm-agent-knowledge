import { queryOptions } from "@tanstack/react-query";
import { api } from "../api";
import { topicListSchema } from "../schemas/topic";
import { parseWithFallback } from "../utils/parse-with-fallback";

export const standaloneTopicKeys = {
  all: () => ["topics-standalone"] as const,
  list: () => [...standaloneTopicKeys.all(), "list"] as const,
};

export const standaloneTopicListOptions = () =>
  queryOptions({
    queryKey: standaloneTopicKeys.list(),
    queryFn: async () => {
      const res = await api.get("/topics");
      return parseWithFallback(topicListSchema, res, []);
    },
  });

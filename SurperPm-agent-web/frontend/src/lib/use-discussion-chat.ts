import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWS } from "../providers/ws-provider";
import { discussionKeys } from "./queries/discussions";
import { standaloneDiscussionKeys } from "./queries/discussions-standalone";
import { discussionListSchema, type Discussion } from "./schemas/discussion";
import { parseWithFallback } from "./utils/parse-with-fallback";
import { api } from "./api";
import type { CardResponse } from "./schemas/interactive-card";

export interface ChatMessage {
  id: number;
  role: string;
  author: string | null;
  content: string;
  imageDataUri: string | null;
  cardResponse: CardResponse | null;
  createdAt: string;
  streaming: boolean;
}

interface UseDiscussionChatArgs {
  topicId?: number | null;
  goalId?: number;
}

const STREAM_TIMEOUT_MS = 60_000;

export function useDiscussionChat({ topicId, goalId }: UseDiscussionChatArgs) {
  const queryClient = useQueryClient();
  const ws = useWS();
  const isGoal = goalId != null;

  const { data: discussions = [] } = useQuery({
    queryKey: isGoal
      ? discussionKeys.list(goalId, topicId)
      : standaloneDiscussionKeys.list(topicId),
    queryFn: async () => {
      const params = topicId != null ? `?topic_id=${topicId}` : "";
      const path = isGoal
        ? `/goals/${goalId}/discussions${params}`
        : `/discussions${params}`;
      const res = await api.get(path);
      return parseWithFallback(discussionListSchema, res, [] as Discussion[]);
    },
  });

  const invalidate = useCallback(
    () =>
      queryClient.refetchQueries({
        queryKey: isGoal
          ? discussionKeys.all(goalId)
          : standaloneDiscussionKeys.all(),
      }),
    [queryClient, isGoal, goalId],
  );

  const streamingRef = useRef(new Map<number, string>());
  const [isRunning, setIsRunning] = useState(false);
  const [, forceRender] = useState(0);

  useEffect(() => {
    if (!ws) return;

    const matches = (gid: number | null) => (isGoal ? gid === goalId : gid === null);

    const offDelta = ws.on("discussion_delta", (raw: unknown) => {
      const data = raw as {
        goal_id: number | null;
        discussion_id: number;
        delta: string;
        error?: string;
        done?: boolean;
      };
      if (!matches(data.goal_id)) return;

      if (data.done) {
        setIsRunning(false);
        invalidate().then(() => {
          streamingRef.current.delete(data.discussion_id);
          forceRender((c) => c + 1);
        });
        return;
      }

      if (data.error) {
        streamingRef.current.set(
          data.discussion_id,
          (streamingRef.current.get(data.discussion_id) ?? "") +
            `\n\n⚠️ ${data.error}`,
        );
        setIsRunning(false);
      } else {
        streamingRef.current.set(
          data.discussion_id,
          (streamingRef.current.get(data.discussion_id) ?? "") + data.delta,
        );
        setIsRunning(true);
      }
      forceRender((c) => c + 1);
    });

    const offCreated = ws.on("discussion_created", (raw: unknown) => {
      const data = raw as { goal_id: number | null; role: string; id: number };
      if (!matches(data.goal_id)) return;

      if (data.role === "agent") {
        setIsRunning(true);
      } else {
        invalidate();
      }
    });

    return () => {
      offDelta();
      offCreated();
    };
  }, [ws, isGoal, goalId, invalidate]);

  useEffect(() => {
    if (!isRunning) return;
    const timer = setTimeout(() => {
      if (streamingRef.current.size > 0) {
        streamingRef.current.clear();
        setIsRunning(false);
        invalidate();
        forceRender((c) => c + 1);
      }
    }, STREAM_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isRunning, invalidate]);

  const messages: ChatMessage[] = (() => {
    const out: ChatMessage[] = discussions.map((d) => {
      const streamed = streamingRef.current.get(d.id);
      return {
        id: d.id,
        role: d.role,
        author: d.author ?? null,
        content: streamed ?? d.content,
        imageDataUri: d.image_data_uri ?? null,
        cardResponse: (d.card_response as CardResponse | null) ?? null,
        createdAt: d.created_at,
        streaming: streamed != null,
      };
    });
    for (const [id, text] of streamingRef.current) {
      if (!out.some((m) => m.id === id)) {
        out.push({
          id,
          role: "agent",
          author: null,
          content: text,
          imageDataUri: null,
          cardResponse: null,
          createdAt: new Date().toISOString(),
          streaming: true,
        });
      }
    }
    out.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() ||
        a.id - b.id,
    );
    // Back-link: if a user message has cardResponse, attach it to the preceding
    // agent message — that's where the interactive card lives, so it needs the
    // response to show as "submitted" and prevent re-selection on refresh.
    for (let i = 1; i < out.length; i++) {
      if (out[i].role === "user" && out[i].cardResponse) {
        // Find the nearest preceding agent message
        for (let j = i - 1; j >= 0; j--) {
          if (out[j].role === "agent") {
            out[j].cardResponse = out[i].cardResponse;
            break;
          }
        }
      }
    }
    // 过滤空 content 且不在 streaming 的 agent 消息（空壳气泡，视觉上会与 TypingIndicator 同时出现）
    return out.filter((m) => !(m.role === "agent" && !m.content.trim() && !m.streaming));
  })();

  const send = useCallback(
    async (text: string, imageDataUri?: string, cardResponse?: CardResponse) => {
      if (!text.trim() && !imageDataUri) return;
      const body: Record<string, unknown> = {
        content: text,
        role: "user",
        topic_id: topicId ?? undefined,
      };
      if (imageDataUri) body.image_data_uri = imageDataUri;
      if (cardResponse) body.card_response = cardResponse;
      await api.post(isGoal ? `/goals/${goalId}/discussions` : "/discussions", body);
      invalidate();
    },
    [isGoal, goalId, topicId, invalidate],
  );

  return { messages, isRunning, send };
}

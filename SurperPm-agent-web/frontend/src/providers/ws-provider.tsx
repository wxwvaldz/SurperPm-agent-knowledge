import { createContext, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { WSClient } from "../lib/ws-client";
import { standaloneDiscussionKeys } from "../lib/queries/discussions-standalone";
import { executionKeys } from "../lib/queries/executions";
import { goalKeys } from "../lib/queries/goals";
import { skillKeys } from "../lib/queries/skills";
import { standaloneTopicKeys } from "../lib/queries/topics-standalone";
import { discussionKeys } from "../lib/queries/discussions";
import { topicKeys } from "../lib/queries/topics";
import { workspaceKeys } from "../lib/queries/workspaces";
import { useExecutionStore } from "../lib/stores/execution";

const WSContext = createContext<WSClient | null>(null);

export function useWS() {
  return useContext(WSContext);
}

interface WSProviderProps {
  workspaceId: string;
  children: React.ReactNode;
}

export function WSProvider({ workspaceId, children }: WSProviderProps) {
  const queryClient = useQueryClient();
  const [wsClient, setWsClient] = useState<WSClient | null>(null);

  useEffect(() => {
    const ws = new WSClient(workspaceId);
    setWsClient(ws);

    ws.on("goal_created", () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.all() });
    });
    ws.on("goal_updated", () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.all() });
    });
    ws.on("discussion_created", () => {
      queryClient.invalidateQueries({
        queryKey: standaloneDiscussionKeys.all(),
      });
    });
    ws.on("execution_started", () => {
      queryClient.invalidateQueries({ queryKey: executionKeys.all() });
      queryClient.invalidateQueries({ queryKey: goalKeys.all() });
    });
    ws.on("execution_progress", (data) => {
      useExecutionStore.getState().updateProgress(data as any);
    });
    ws.on("execution_completed", () => {
      queryClient.invalidateQueries({ queryKey: executionKeys.all() });
      queryClient.invalidateQueries({ queryKey: goalKeys.all() });
      useExecutionStore.getState().clearProgress();
    });
    ws.on("workspace_updated", () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all() });
    });
    ws.on("topic_created", () => {
      queryClient.invalidateQueries({ queryKey: standaloneTopicKeys.all() });
    });
    ws.on("topic_updated", () => {
      queryClient.invalidateQueries({ queryKey: standaloneTopicKeys.all() });
    });
    ws.on("knowledge_updated", () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-tree"] });
      queryClient.invalidateQueries({ queryKey: ["knowledge-content"] });
    });
    ws.on("skill_created", () => {
      queryClient.invalidateQueries({ queryKey: skillKeys.all(workspaceId) });
    });
    ws.on("skill_updated", () => {
      queryClient.invalidateQueries({ queryKey: skillKeys.all(workspaceId) });
    });
    ws.on("skill_deleted", () => {
      queryClient.invalidateQueries({ queryKey: skillKeys.all(workspaceId) });
    });

    return () => ws.close();
  }, [workspaceId, queryClient]);

  return (
    <WSContext.Provider value={wsClient}>
      {children}
    </WSContext.Provider>
  );
}

interface GoalWSProviderProps {
  goalId: number;
  children: React.ReactNode;
}

export function GoalWSProvider({ goalId, children }: GoalWSProviderProps) {
  const queryClient = useQueryClient();
  const [wsClient, setWsClient] = useState<WSClient | null>(null);

  useEffect(() => {
    const ws = new WSClient(`goal:${goalId}`);
    setWsClient(ws);

    ws.on("goal_updated", () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.all() });
    });
    ws.on("discussion_created", () => {
      queryClient.invalidateQueries({ queryKey: discussionKeys.all(goalId) });
    });
    ws.on("execution_started", () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.all() });
      queryClient.invalidateQueries({ queryKey: executionKeys.all(goalId) });
    });
    ws.on("execution_progress", (data) => {
      useExecutionStore.getState().updateProgress(data as any);
    });
    ws.on("execution_completed", () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.all() });
      queryClient.invalidateQueries({ queryKey: executionKeys.all(goalId) });
      useExecutionStore.getState().clearProgress();
    });
    ws.on("topic_created", () => {
      queryClient.invalidateQueries({ queryKey: topicKeys.all(goalId) });
    });
    ws.on("topic_updated", () => {
      queryClient.invalidateQueries({ queryKey: topicKeys.all(goalId) });
    });

    return () => ws.close();
  }, [goalId, queryClient]);

  return (
    <WSContext.Provider value={wsClient}>
      {children}
    </WSContext.Provider>
  );
}

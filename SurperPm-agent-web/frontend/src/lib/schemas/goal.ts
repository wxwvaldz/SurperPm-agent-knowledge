import { z } from "zod";

export const goalSchema = z.object({
  id: z.number(),
  workspace_id: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  status: z.string().default("todo"),
  reviewed_by: z.string().nullable().optional(),
  reviewed_at: z.string().nullable().optional(),
  priority: z.number().default(0),
  assigned_to: z.string().nullable().optional(),
  suggested_assignee: z.string().nullable().optional(),
  parent_goal_id: z.number().nullable().optional(),
  group_id: z.number().nullable().optional(),
  token_budget: z.number().nullable().optional(),
  deadline: z.string().nullable().optional(),
  slug: z.string().nullable().optional(),
  session_name: z.string().nullable().optional(),
  repo_url: z.string().nullable().optional(),
  repo_path: z.string().nullable().optional(),
  repos: z.string().nullable().optional(),
  schedule: z.string().nullable().optional(),
  delay_until: z.string().nullable().optional(),
  target: z.string().nullable().optional(),
  created_at: z.string().optional().default(""),
  updated_at: z.string().optional().default(""),
});

export type Goal = z.infer<typeof goalSchema>;

export const goalListSchema = z.array(goalSchema);

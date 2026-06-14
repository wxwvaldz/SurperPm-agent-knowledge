import { z } from "zod";

export const executionSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  goal_id: z.number(),
  workspace_id: z.string().optional().default(""),
  status: z.string().default("pending"),
  branch: z.string().nullable().optional(),
  started_at: z.string().nullable().optional(),
  finished_at: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
  log_path: z.string().nullable().optional(),
  pr_url: z.string().nullable().optional(),
  token_used: z.number().nullable().optional(),
  token_budget: z.number().nullable().optional(),
  summary: z.string().nullable().optional(),
  artifacts: z.any().nullable().optional(),
  logs: z.any().nullable().optional(),
  created_at: z.string().optional().default(""),
});

export type Execution = z.infer<typeof executionSchema>;

export const executionListSchema = z.array(executionSchema);

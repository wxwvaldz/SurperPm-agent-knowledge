import { z } from "zod";

export const topicSchema = z.object({
  id: z.number(),
  workspace_id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  goal_id: z.number().nullable().optional(),
  session_name: z.string().nullable().optional(),
  repo_url: z.string().nullable().optional(),
  pinned: z.boolean().default(false),
  archived: z.boolean().default(false),
  created_at: z.string().optional().default(""),
  updated_at: z.string().optional().default(""),
});

export type Topic = z.infer<typeof topicSchema>;

export const topicListSchema = z.array(topicSchema);

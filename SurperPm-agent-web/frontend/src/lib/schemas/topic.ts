import { z } from "zod";

export const topicSchema = z.object({
  id: z.number(),
  workspace_id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  goal_id: z.number().nullable().optional(),
  repo_url: z.string().nullable().optional(),
  pinned: z.boolean(),
  archived: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Topic = z.infer<typeof topicSchema>;

export const topicListSchema = z.array(topicSchema);

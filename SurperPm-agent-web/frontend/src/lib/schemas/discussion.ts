import { z } from "zod";

export const discussionSchema = z.object({
  id: z.number(),
  workspace_id: z.string(),
  goal_id: z.number().nullable(),
  role: z.enum(["user", "agent", "system"]),
  content: z.string(),
  author: z.string().nullable().optional(),
  parent_id: z.number().nullable().optional(),
  created_at: z.string(),
});

export type Discussion = z.infer<typeof discussionSchema>;

export const discussionListSchema = z.array(discussionSchema);

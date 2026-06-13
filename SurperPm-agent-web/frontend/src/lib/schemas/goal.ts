import { z } from "zod";

export const goalSchema = z.object({
  id: z.number(),
  workspace_id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  status: z.enum(["todo", "doing", "done", "failed"]),
  priority: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Goal = z.infer<typeof goalSchema>;

export const goalListSchema = z.array(goalSchema);

import { z } from "zod";

export const discussionSchema = z.object({
  id: z.number(),
  workspace_id: z.string().optional().default(""),
  goal_id: z.number().nullable().optional(),
  role: z.string().default("user"),
  content: z.string().default(""),
  author: z.string().nullable().optional(),
  parent_id: z.number().nullable().optional(),
  topic_id: z.number().nullable().optional(),
  image_data_uri: z.string().nullable().optional(),
  card_response: z.any().nullable().optional(),
  created_at: z.string().optional().default(""),
});

export type Discussion = z.infer<typeof discussionSchema>;

export const discussionListSchema = z.array(discussionSchema);

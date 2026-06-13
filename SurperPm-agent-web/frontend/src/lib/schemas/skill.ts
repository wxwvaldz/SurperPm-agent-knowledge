import { z } from "zod";

export const skillFileSchema = z.object({
  id: z.number(),
  skill_id: z.number(),
  path: z.string(),
  content: z.string(),
  is_main: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const skillSummarySchema = z.object({
  id: z.number(),
  workspace_id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  source_type: z.enum(["manual", "github_import"]),
  source_url: z.string().nullable(),
  file_count: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const skillDetailSchema = skillSummarySchema.extend({
  files: z.array(skillFileSchema),
});

export type SkillFile = z.infer<typeof skillFileSchema>;
export type SkillSummary = z.infer<typeof skillSummarySchema>;
export type SkillDetail = z.infer<typeof skillDetailSchema>;

export const skillSummaryListSchema = z.array(skillSummarySchema);

import { z } from "zod";

export const skillSummarySchema = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string().default(""),
  version: z.string().default(""),
  tags: z.string().default(""),
  body: z.string().default(""),
});

export const skillFileSchema = z.object({
  path: z.string(),
  content: z.string(),
});

export const skillDetailSchema = skillSummarySchema.extend({
  files: z.array(skillFileSchema).default([]),
});

export type SkillSummary = z.infer<typeof skillSummarySchema>;
export type SkillDetail = z.infer<typeof skillDetailSchema>;
export type SkillFile = z.infer<typeof skillFileSchema>;

export const skillSummaryListSchema = z.array(skillSummarySchema);

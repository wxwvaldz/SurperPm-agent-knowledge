import { z } from "zod";

export const workspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  repo_url: z.string().nullable().optional(),
  knowledge_repo_url: z.string().nullable().optional(),
  ssh_public_key: z.string().nullable().optional(),
  repos: z.any().nullable().optional(),
  created_at: z.string().optional().default(""),
  updated_at: z.string().optional().default(""),
});

export type Workspace = z.infer<typeof workspaceSchema>;

export const workspaceListSchema = z.array(workspaceSchema);

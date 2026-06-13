import { z } from "zod";

export const workspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  repo_url: z.string().nullable(),
  knowledge_repo_url: z.string().nullable(),
  ssh_public_key: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Workspace = z.infer<typeof workspaceSchema>;

export const workspaceListSchema = z.array(workspaceSchema);

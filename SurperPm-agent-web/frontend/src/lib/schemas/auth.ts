import { z } from "zod";

export const userSchema = z.object({
  username: z.string(),
  repo: z.string(),
  avatar_url: z.string().optional(),
  is_founder: z.boolean().optional(),
});

export type User = z.infer<typeof userSchema>;

export const repoSchema = z.object({
  name: z.string(),
  owner: z.string(),
  private: z.boolean(),
  desc: z.string(),
  updated: z.string(),
  stars: z.number(),
});

export type Repo = z.infer<typeof repoSchema>;

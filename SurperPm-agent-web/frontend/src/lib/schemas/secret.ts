import { z } from "zod";

export const secretSchema = z.object({
  id: z.number(),
  key: z.string(),
  value: z.string(),
  category: z.string(),
});

export type Secret = z.infer<typeof secretSchema>;

export const secretListSchema = z.array(secretSchema);

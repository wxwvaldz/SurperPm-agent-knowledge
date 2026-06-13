import type { ZodSchema } from "zod";

export function parseWithFallback<T>(schema: ZodSchema<T>, data: unknown, fallback: T): T {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  console.warn("[parseWithFallback] validation failed:", result.error.issues);
  return fallback;
}

import { z } from "zod";

export const mcpServerSchema = z.object({
  name: z.string(),
  transport: z.string().default("stdio"),
  command: z.string().nullable().default(null),
  args: z.any().default([]),
  env: z.any().default({}),
  url: z.string().nullable().default(null),
  headers: z.any().default({}),
  enabled: z.boolean().default(false),
  plugin_source: z.string().optional(),
  source: z.string().optional(),
});

export const mcpServerListSchema = z.array(mcpServerSchema);

export const mcpTestResultSchema = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
  message: z.string().optional(),
  status: z.number().optional(),
});

export type MCPServer = z.infer<typeof mcpServerSchema>;
export type MCPTestResult = z.infer<typeof mcpTestResultSchema>;

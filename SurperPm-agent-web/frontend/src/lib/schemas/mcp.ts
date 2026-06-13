import { z } from "zod";

export const mcpServerSchema = z.object({
  id: z.number().nullable(),
  workspace_id: z.string(),
  name: z.string(),
  transport: z.enum(["stdio", "sse", "http"]),
  command: z.string().nullable(),
  args: z.string().nullable(),
  env: z.string().nullable(),
  url: z.string().nullable(),
  headers: z.string().nullable(),
  enabled: z.boolean(),
  plugin_source: z.string().nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});

export const mcpServerListSchema = z.array(mcpServerSchema);

export const mcpTestResultSchema = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
  stdout: z.string().optional(),
  status: z.number().optional(),
});

export const mcpDiscoverResultSchema = z.object({
  discovered: z.number(),
  upserted: z.array(z.object({
    action: z.enum(["created", "updated"]),
    name: z.string(),
  })),
});

export type MCPServer = z.infer<typeof mcpServerSchema>;
export type MCPTestResult = z.infer<typeof mcpTestResultSchema>;
export type MCPDiscoverResult = z.infer<typeof mcpDiscoverResultSchema>;

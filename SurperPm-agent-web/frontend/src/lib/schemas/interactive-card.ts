import { z } from "zod";

// ── Option (radio / checkbox) ──
export const cardOptionSchema = z.object({
  label: z.string(),
  description: z.string().optional(),
});

// ── Field (text card) ──
export const cardFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  required: z.boolean().optional().default(false),
  placeholder: z.string().optional(),
  type: z.enum(["text", "date"]).optional().default("text"),
});

// ── Union schema ──
export const interactiveCardSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("radio"),
    title: z.string(),
    description: z.string().optional(),
    options: z.array(cardOptionSchema).min(1),
  }),
  z.object({
    type: z.literal("checkbox"),
    title: z.string(),
    description: z.string().optional(),
    options: z.array(cardOptionSchema).min(1),
  }),
  z.object({
    type: z.literal("text"),
    title: z.string(),
    description: z.string().optional(),
    fields: z.array(cardFieldSchema).min(1),
  }),
]);

export type InteractiveCard = z.infer<typeof interactiveCardSchema>;
export type CardOption = z.infer<typeof cardOptionSchema>;
export type CardField = z.infer<typeof cardFieldSchema>;

// ── User response (sent back to AI) ──
export interface CardResponse {
  type: "radio" | "checkbox" | "text";
  title: string;
  /** radio: the selected label; checkbox: selected labels; text: empty */
  selected?: string | string[];
  /** text card only: {[key]: value} */
  values?: Record<string, string>;
}

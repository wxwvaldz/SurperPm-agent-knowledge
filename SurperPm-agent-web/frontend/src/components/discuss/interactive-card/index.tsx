import { interactiveCardSchema, type InteractiveCard, type CardResponse } from "@/lib/schemas/interactive-card";
import { RadioCard } from "./radio-card";
import { CheckboxCard } from "./checkbox-card";
import { TextCard } from "./text-card";

/**
 * Safely evaluate a JS/TS expression inside a card code block.
 * Only allows the `card` variable to be defined — no access to globals.
 */
function evalCardCode(code: string): unknown {
  // Strip TypeScript type annotations (simple cases: `as X`, `: Type`)
  const cleaned = code
    .replace(/const\s+card\s*:\s*\w+/g, "const card")
    .replace(/as\s+const/g, "")
    .replace(/as\s+\w+/g, "")
    .trim();
  // Use Function constructor — no access to window/document/globalThis
  const fn = new Function(`
    "use strict";
    ${cleaned}
    return card;
  `);
  return fn();
}

/** Extract card definitions from AI message content.
 *
 * Supports three formats (checked in order):
 * 1. ```interactive-card  →  JSON content
 * 2. ```card              →  JS/TS: `const card = { type: "...", ... }`
 * 3. ```ts / ```js        →  JS/TS: same as above, but only if card object found
 */
export function parseInteractiveCards(content: string): {
  text: string;
  cards: InteractiveCard[];
} {
  const cards: InteractiveCard[] = [];

  // --- Format 1: ```interactive-card (JSON) ---
  let text = content.replace(
    /```interactive-card\s*\n([\s\S]*?)```/g,
    (_match, json: string) => {
      try {
        const parsed = JSON.parse(json.trim());
        const validated = interactiveCardSchema.parse(parsed);
        cards.push(validated);
      } catch { /* skip */ }
      return "";
    },
  );

  // --- Format 2: ```card (JS expression) ---
  text = text.replace(
    /```card\s*\n([\s\S]*?)```/g,
    (_match, code: string) => {
      try {
        const result = evalCardCode(code);
        const validated = interactiveCardSchema.parse(result);
        cards.push(validated);
      } catch { /* skip */ }
      return "";
    },
  );

  // --- Format 3: ```ts or ```js with card-like pattern ---
  // Only extract if the block contains `const card =` or `card =`
  text = text.replace(
    /```(?:ts|typescript|js|javascript)\s*\n([\s\S]*?)```/g,
    (_match, code: string) => {
      if (!/\bcard\s*[=:]/.test(code)) return _match; // not a card block, keep it
      try {
        const result = evalCardCode(code);
        const validated = interactiveCardSchema.parse(result);
        cards.push(validated);
        return ""; // remove from rendered text
      } catch { /* skip */ }
      return _match; // keep original if eval fails
    },
  );

  return { text: text.trim(), cards };
}

interface InteractiveCardViewProps {
  card: InteractiveCard;
  disabled: boolean;
  initialResponse?: CardResponse | null;
  onSubmit: (response: CardResponse) => void;
}

/** Dispatcher — renders the correct card component by type. */
export function InteractiveCardView({ card, disabled, initialResponse, onSubmit }: InteractiveCardViewProps) {
  switch (card.type) {
    case "radio":
      return <RadioCard card={card} disabled={disabled} initialResponse={initialResponse} onSubmit={onSubmit} />;
    case "checkbox":
      return <CheckboxCard card={card} disabled={disabled} initialResponse={initialResponse} onSubmit={onSubmit} />;
    case "text":
      return <TextCard card={card} disabled={disabled} initialResponse={initialResponse} onSubmit={onSubmit} />;
  }
}

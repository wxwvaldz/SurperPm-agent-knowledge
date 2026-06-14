import { useState } from "react";
import { CheckSquare, Square, ArrowRight } from "lucide-react";
import type { InteractiveCard, CardResponse } from "@/lib/schemas/interactive-card";

interface CheckboxCardProps {
  card: InteractiveCard & { type: "checkbox" };
  disabled: boolean;
  initialResponse?: CardResponse | null;
  onSubmit: (response: CardResponse) => void;
}

export function CheckboxCard({ card, disabled, initialResponse, onSubmit }: CheckboxCardProps) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(Array.isArray(initialResponse?.selected) ? initialResponse.selected : []),
  );
  const [submitted, setSubmitted] = useState(!!initialResponse);

  const toggle = (label: string) => {
    if (submitted || disabled) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const handleSubmit = () => {
    if (selected.size === 0) return;
    setSubmitted(true);
    onSubmit({ type: "checkbox", title: card.title, selected: Array.from(selected) });
  };

  const isDone = submitted || disabled;

  return (
    <div className="border-2 border-border shadow-[4px_4px_0_0_#000] bg-card mt-3 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3 border-b border-border bg-background">
        <span className="flex items-center justify-center w-7 h-7 border-2 border-border bg-background shadow-[2px_2px_0_0_#059669]">
          <CheckSquare size={14} className="text-[#059669]" strokeWidth={2.5} />
        </span>
        <div>
          <p className="text-[13px] font-head font-bold text-foreground leading-tight">
            {card.title}
          </p>
          {card.description && (
            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{card.description}</p>
          )}
        </div>
        {!isDone && (
          <span className="ml-auto text-[10px] text-muted-foreground">可多选</span>
        )}
      </div>

      {/* Options */}
      <div className="flex flex-col">
        {card.options.map((opt, i) => {
          const isSelected = selected.has(opt.label);
          return (
            <button
              key={i}
              type="button"
              disabled={isDone}
              onClick={() => toggle(opt.label)}
              className={`flex items-center gap-3 px-4 py-3 text-left transition-all duration-100
                ${i < card.options.length - 1 ? "border-b border-border" : ""}
                ${isSelected
                  ? "bg-[#ecfdf5] border-l-[3px] border-l-[#059669]"
                  : "bg-background border-l-[3px] border-l-transparent hover:bg-background"}
                ${isDone ? "cursor-default" : "cursor-pointer"}
              `}
            >
              <span className="shrink-0">
                {isSelected ? (
                  <CheckSquare size={18} className="text-[#059669]" strokeWidth={2} />
                ) : (
                  <Square size={18} className="text-muted-foreground/30" strokeWidth={2} />
                )}
              </span>
              <div className="flex-1 min-w-0">
                <span className={`text-[13px] leading-snug ${isSelected ? "font-semibold text-foreground" : "text-foreground/80"}`}>
                  {opt.label}
                </span>
                {opt.description && (
                  <span className="block text-[11px] text-muted-foreground leading-snug mt-0.5">
                    {opt.description}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-background">
        <span className="text-[11px] text-muted-foreground">
          {isDone ? (
            <span className="flex items-center gap-1 text-[#059669] font-medium">
              <CheckSquare size={12} /> 已选 {selected.size} 项
            </span>
          ) : selected.size > 0 ? (
            <span className="text-foreground/60">{selected.size} 项已选择</span>
          ) : (
            "至少选择一项"
          )}
        </span>
        {!isDone && (
          <button
            type="button"
            disabled={selected.size === 0}
            onClick={handleSubmit}
            className="inline-flex items-center gap-1.5 border-2 border-border bg-foreground text-background px-4 py-1.5 text-xs font-head font-bold shadow-[2px_2px_0_0_#000] transition-all hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] disabled:opacity-25 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0"
          >
            确认
            <span className="opacity-60 text-[10px]">({selected.size})</span>
            <ArrowRight size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

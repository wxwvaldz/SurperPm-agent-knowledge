import { useState } from "react";
import { Circle, CheckCircle2, ArrowRight } from "lucide-react";
import type { InteractiveCard, CardResponse } from "@/lib/schemas/interactive-card";

interface RadioCardProps {
  card: InteractiveCard & { type: "radio" };
  disabled: boolean;
  initialResponse?: CardResponse | null;
  onSubmit: (response: CardResponse) => void;
}

export function RadioCard({ card, disabled, initialResponse, onSubmit }: RadioCardProps) {
  const [selected, setSelected] = useState<string | null>(
    typeof initialResponse?.selected === "string" ? initialResponse.selected : null,
  );
  const [submitted, setSubmitted] = useState(!!initialResponse);

  const handleSubmit = () => {
    if (!selected) return;
    setSubmitted(true);
    onSubmit({ type: "radio", title: card.title, selected });
  };

  const isDone = submitted || disabled;

  return (
    <div className="border-2 border-border shadow-[4px_4px_0_0_#000] bg-card mt-3 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3 border-b-2 border-border bg-background">
        <span className="flex items-center justify-center w-7 h-7 border-2 border-border bg-background shadow-[2px_2px_0_0_#8B5CF6]">
          <span className="text-[#7c3aed] text-sm font-black">?</span>
        </span>
        <div>
          <p className="text-[13px] font-head font-bold text-foreground leading-tight">
            {card.title}
          </p>
          {card.description && (
            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{card.description}</p>
          )}
        </div>
      </div>

      {/* Options */}
      <div className="flex flex-col">
        {card.options.map((opt, i) => {
          const isSelected = selected === opt.label;
          return (
            <button
              key={i}
              type="button"
              disabled={isDone}
              onClick={() => setSelected(opt.label)}
              className={`flex items-center gap-3 px-4 py-3 text-left transition-all duration-100
                ${i < card.options.length - 1 ? "border-b border-border" : ""}
                ${isSelected
                  ? "bg-[#f5f3ff] border-l-[3px] border-l-[#7c3aed]"
                  : "bg-background border-l-[3px] border-l-transparent hover:bg-muted/10"}
                ${isDone ? "cursor-default" : "cursor-pointer"}
              `}
            >
              <span className="shrink-0">
                {isSelected ? (
                  <CheckCircle2 size={18} className="text-[#7c3aed]" strokeWidth={2} />
                ) : (
                  <Circle size={18} className="text-muted-foreground/30" strokeWidth={2} />
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
      <div className="flex items-center justify-between px-4 py-2.5 border-t-2 border-border bg-background">
        <span className="text-[11px] text-muted-foreground">
          {isDone ? (
            <span className="flex items-center gap-1 text-[#7c3aed] font-medium">
              <CheckCircle2 size={12} /> 已选择
            </span>
          ) : selected ? (
            <span className="text-foreground/60">已选 1 项</span>
          ) : (
            "请选择一项"
          )}
        </span>
        {!isDone && (
          <button
            type="button"
            disabled={!selected}
            onClick={handleSubmit}
            className="inline-flex items-center gap-1.5 border-2 border-border bg-foreground text-background px-4 py-1.5 text-xs font-head font-bold shadow-[2px_2px_0_0_#000] transition-all hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] disabled:opacity-25 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0"
          >
            确认
            <ArrowRight size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import { PencilLine, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import type { InteractiveCard, CardResponse } from "@/lib/schemas/interactive-card";

interface TextCardProps {
  card: InteractiveCard & { type: "text" };
  disabled: boolean;
  initialResponse?: CardResponse | null;
  onSubmit: (response: CardResponse) => void;
}

export function TextCard({ card, disabled, initialResponse, onSubmit }: TextCardProps) {
  const [values, setValues] = useState<Record<string, string>>(initialResponse?.values ?? {});
  const [submitted, setSubmitted] = useState(!!initialResponse);

  const setValue = (key: string, val: string) => {
    if (submitted || disabled) return;
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  const filledCount = Object.keys(values).filter((k) => values[k]?.trim()).length;
  const missingRequired = card.fields.some((f) => f.required && !values[f.key]?.trim());
  const canSubmit = !missingRequired && filledCount > 0;
  const isDone = submitted || disabled;

  const handleSubmit = () => {
    if (!canSubmit) return;
    setSubmitted(true);
    onSubmit({
      type: "text",
      title: card.title,
      values: Object.fromEntries(Object.entries(values).filter(([, v]) => v.trim())),
    });
  };

  return (
    <div className="border-2 border-border shadow-[4px_4px_0_0_#000] bg-card mt-3 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3 border-b border-border bg-background">
        <span className="flex items-center justify-center w-7 h-7 border-2 border-border bg-background shadow-[2px_2px_0_0_#D97706]">
          <PencilLine size={14} className="text-[#D97706]" strokeWidth={2.5} />
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

      {/* Fields */}
      <div className="flex flex-col p-4 gap-3.5">
        {card.fields.map((field) => {
          const val = values[field.key] ?? "";
          const isFilled = val.trim().length > 0;
          const isRequired = field.required;
          const isEditable = !isDone;

          return (
            <div key={field.key}>
              <div className="flex items-center gap-2 mb-1.5">
                <label className="text-[11px] font-head font-bold uppercase tracking-wider text-foreground/70">
                  {field.label}
                </label>
                {isRequired && !isFilled && !isDone && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-[#D97706] font-medium">
                    <AlertCircle size={10} /> 必填
                  </span>
                )}
                {isFilled && !isDone && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-[#059669] font-medium">
                    <CheckCircle2 size={10} /> 已填写
                  </span>
                )}
              </div>
              <input
                type={field.type === "date" ? "date" : "text"}
                value={val}
                onChange={(e) => setValue(field.key, e.target.value)}
                disabled={!isEditable}
                placeholder={isDone ? "" : (field.placeholder || "")}
                className={`w-full border-2 px-3.5 py-2.5 text-[13px] bg-background outline-none transition-colors
                  placeholder:text-muted-foreground/30
                  ${!isEditable
                    ? "border-border bg-background text-foreground/50 cursor-default"
                    : isFilled
                      ? "border-border bg-background focus:border-foreground"
                      : isRequired
                        ? "border-border focus:border-foreground"
                        : "border-border focus:border-foreground"
                  }
                `}
              />
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-background">
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] text-muted-foreground">
            {isDone ? (
              <span className="flex items-center gap-1 text-[#059669] font-medium">
                <CheckCircle2 size={12} /> 已提交
              </span>
            ) : (
              <>{filledCount} / {card.fields.length} 项</>
            )}
          </span>
          {!isDone && missingRequired && (
            <span className="text-[10px] text-[#D97706] font-medium flex items-center gap-0.5">
              <AlertCircle size={10} />
              {card.fields.filter(f => f.required).length} 项必填
            </span>
          )}
        </div>
        {!isDone && (
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="inline-flex items-center gap-1.5 border-2 border-border bg-foreground text-background px-4 py-1.5 text-xs font-head font-bold shadow-[2px_2px_0_0_#000] transition-all hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] disabled:opacity-25 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0"
          >
            提交
            <ArrowRight size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

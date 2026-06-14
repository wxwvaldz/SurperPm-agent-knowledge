import { cn } from "@/lib/utils";

export function Textarea({
  type = "text",
  placeholder = "Enter text...",
  className = "",
  ...props
}) {
  return (
    <textarea
      placeholder={placeholder}
      rows={4}
      className={cn(
        "px-3 py-1.5 w-full border border-border rounded-sm bg-background text-sm transition-colors focus:border-foreground focus:outline-none placeholder:text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

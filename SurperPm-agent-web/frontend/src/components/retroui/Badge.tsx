import { cn } from "@/lib/utils";
import { cva, VariantProps } from "class-variance-authority";
import { HTMLAttributes } from "react";

const badgeVariants = cva("font-semibold rounded inline-flex items-center", {
  variants: {
    variant: {
      default: "bg-muted text-muted-foreground",
      outline: "outline-2 outline-foreground text-foreground",
      solid: "bg-foreground text-background",
      surface: "outline-2 bg-primary text-primary-foreground",
      pending: "bg-foreground/5 text-foreground/30",
      running: "bg-yellow-100 text-yellow-800",
      paused: "bg-blue-100 text-blue-800",
      success: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
      timeout: "bg-orange-100 text-orange-800",
      review: "bg-purple-100 text-purple-800",
      todo: "bg-blue-100 text-blue-800",
    },
    size: {
      sm: "px-2 py-1 text-xs",
      md: "px-2.5 py-1.5 text-sm",
      lg: "px-3 py-2 text-base",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "md",
  },
});

interface ButtonProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({
  children,
  size = "md",
  variant = "default",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <span
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    >
      {children}
    </span>
  );
}

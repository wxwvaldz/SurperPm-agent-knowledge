import { cn } from "@/lib/utils";
import { cva, VariantProps } from "class-variance-authority";
import React, { ButtonHTMLAttributes } from "react";
import { Button as BaseButton } from "@base-ui/react/button";

export const buttonVariants = cva(
  "font-head transition-colors rounded-sm cursor-pointer duration-150 font-medium flex justify-center items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border border-border hover:bg-primary/90",
        secondary:
          "bg-secondary text-secondary-foreground border border-border hover:bg-secondary/90",
        outline:
          "bg-transparent border border-border text-foreground hover:bg-muted",
        link: "bg-transparent hover:underline text-primary",
        ghost: "bg-transparent hover:bg-muted text-foreground"
      },
      size: {
        sm: "px-2.5 py-1 text-xs",
        md: "px-3 py-1.5 text-sm",
        lg: "px-5 py-2 text-sm",
        icon: "p-1.5",
      },
    },
    defaultVariants: {
      size: "md",
      variant: "default",
    },
  },
);

export interface IButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  render?: React.ReactElement | ((props: Record<string, any>) => React.ReactElement);
}

export const Button = React.forwardRef<HTMLButtonElement, IButtonProps>(
  ({ children, size = "md", className = "", variant = "default", render, ...props }, ref) => {
    return (
      <BaseButton
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        render={render}
        {...props}
      >
        {children}
      </BaseButton>
    );
  },
);

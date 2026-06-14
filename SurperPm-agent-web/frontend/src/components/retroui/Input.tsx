import React, { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export const Input: React.FC<InputProps> = ({
  type = "text",
  placeholder = "Enter text",
  className = "",
  ...props
}) => {
  return (
    <input
      type={type}
      placeholder={placeholder}
      className={`px-3 py-1.5 w-full rounded-sm border border-border bg-background text-sm transition-colors focus:border-foreground focus:outline-none ${
        props["aria-invalid"]
          ? "border-destructive text-destructive"
          : ""
      } ${className}`}
      {...props}
    />
  );
};

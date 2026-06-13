import { ButtonHTMLAttributes, forwardRef } from "react";
import { Spinner } from "./Spinner";

type ButtonVariant = "primary" | "danger" | "ghost" | "outline";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-primary text-white hover:shadow-glow hover:scale-[1.02] active:scale-[0.98]",
  danger:
    "bg-gradient-danger text-white hover:shadow-card-hover hover:scale-[1.02] active:scale-[0.98]",
  ghost:
    "bg-transparent text-neutral-text hover:bg-surface-hover",
  outline:
    "bg-transparent border border-neutral-border text-neutral-text hover:border-primary hover:text-primary",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      loading = false,
      fullWidth = false,
      disabled,
      children,
      className = "",
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`
          inline-flex items-center justify-center gap-2
          px-6 py-3 rounded-button text-sm font-semibold
          transition-all duration-200 ease-in-out
          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
          focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 focus:ring-offset-surface-page
          ${variantStyles[variant]}
          ${fullWidth ? "w-full" : ""}
          ${className}
        `}
        {...props}
      >
        {loading && <Spinner size="sm" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

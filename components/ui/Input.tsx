import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, className = "", ...props }, ref) => {
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="space-y-2">
        <label
          htmlFor={inputId}
          className="block text-small font-medium uppercase tracking-wide text-neutral-muted"
        >
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={`input-field ${error ? "input-field-error" : ""} ${className}`}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-small text-accent-error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

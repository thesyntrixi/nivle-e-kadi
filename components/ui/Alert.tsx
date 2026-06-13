type AlertVariant = "error" | "success" | "info" | "warning";

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  message: string;
}

const variantStyles: Record<AlertVariant, { container: string; icon: string }> = {
  error: {
    container: "bg-accent-error/10 border-accent-error/40 text-accent-error",
    icon: "text-accent-error",
  },
  success: {
    container: "bg-accent-success/10 border-accent-success/40 text-accent-success",
    icon: "text-accent-success",
  },
  info: {
    container: "bg-accent-info/10 border-accent-info/40 text-accent-info",
    icon: "text-accent-info",
  },
  warning: {
    container: "bg-accent-warning/10 border-accent-warning/40 text-accent-warning",
    icon: "text-accent-warning",
  },
};

function AlertIcon({ variant }: { variant: AlertVariant }) {
  if (variant === "error") {
    return (
      <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }
  if (variant === "success") {
    return (
      <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export function Alert({ variant = "error", title, message }: AlertProps) {
  const styles = variantStyles[variant];

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 p-4 border rounded-input text-sm animate-fade-in ${styles.container}`}
    >
      <span className={styles.icon}>
        <AlertIcon variant={variant} />
      </span>
      <div>
        {title && <p className="font-semibold mb-0.5">{title}</p>}
        <p>{message}</p>
      </div>
    </div>
  );
}

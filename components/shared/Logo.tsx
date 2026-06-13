interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  collapsed?: boolean;
}

const sizeMap = {
  sm: { icon: "h-8 w-8", text: "text-lg" },
  md: { icon: "h-10 w-10", text: "text-xl" },
  lg: { icon: "h-12 w-12", text: "text-2xl" },
};

export function Logo({ size = "md", showText = true, collapsed = false }: LogoProps) {
  const sizes = sizeMap[size];

  return (
    <div className="flex items-center gap-3">
      <div
        className={`${sizes.icon} flex items-center justify-center rounded-card bg-gradient-primary shadow-glow`}
        aria-hidden="true"
      >
        <svg className="h-1/2 w-1/2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      </div>
      {showText && !collapsed && (
        <div>
          <p className={`${sizes.text} font-bold text-neutral-text leading-tight`}>NIVLE E-Kadi</p>
          <p className="text-small text-neutral-muted">Invitation Manager</p>
        </div>
      )}
    </div>
  );
}

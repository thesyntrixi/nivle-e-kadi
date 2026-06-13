interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "h-4 w-4 border-2",
  md: "h-5 w-5 border-2",
  lg: "h-8 w-8 border-[3px]",
};

export function Spinner({ size = "md", className = "" }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`
        inline-block rounded-full border-white/30 border-t-white animate-spin
        ${sizeMap[size]}
        ${className}
      `}
    />
  );
}

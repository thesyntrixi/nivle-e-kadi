interface LogoProps {
  size?: "sm" | "md" | "lg";
  collapsed?: boolean;
}

const sizeMap = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl",
};

export function Logo({ size = "md", collapsed = false }: LogoProps) {
  const textSize = sizeMap[size];

  if (collapsed) {
    return (
      <div className="flex items-center justify-center">
        <span className={`${textSize} font-bold text-white leading-none`}>N</span>
      </div>
    );
  }

  return (
    <div className="flex items-center">
      <span className={`${textSize} font-bold text-white leading-tight tracking-tight`}>
        NIVLE E-Kadi
      </span>
    </div>
  );
}

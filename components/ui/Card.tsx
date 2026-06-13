import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  padding?: "sm" | "md" | "lg";
}

const paddingMap = {
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function Card({
  hover = false,
  padding = "md",
  children,
  className = "",
  ...props
}: CardProps) {
  return (
    <div
      className={`
        glass-card ${paddingMap[padding]}
        ${hover ? "transition-all duration-200 hover:shadow-card-hover hover:border-primary/30" : ""}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}

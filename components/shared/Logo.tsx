import Image from "next/image";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  collapsed?: boolean;
}

const sizeMap = {
  sm: { width: 120, height: 32, collapsedWidth: 32, collapsedHeight: 32 },
  md: { width: 150, height: 40, collapsedWidth: 40, collapsedHeight: 40 },
  lg: { width: 180, height: 48, collapsedWidth: 48, collapsedHeight: 48 },
};

export function Logo({ size = "md", collapsed = false }: LogoProps) {
  const sizes = sizeMap[size];
  const width = collapsed ? sizes.collapsedWidth : sizes.width;
  const height = collapsed ? sizes.collapsedHeight : sizes.height;

  return (
    <div className="flex items-center">
      <Image
        src="/logo-03.png"
        alt="NIVLE E-Kadi"
        width={width}
        height={height}
        className="h-auto w-auto max-h-full object-contain"
        style={{ width, height }}
        priority
      />
    </div>
  );
}

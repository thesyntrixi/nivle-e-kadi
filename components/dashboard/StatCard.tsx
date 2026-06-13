import { Card } from "@/components/ui/Card";

type StatColor = "primary" | "success" | "info" | "warning";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  trend?: string;
  progress?: number;
  color: StatColor;
}

const colorStyles: Record<StatColor, { bar: string; icon: string }> = {
  primary: { bar: "bg-primary", icon: "bg-primary/15 text-primary" },
  success: { bar: "bg-accent-success", icon: "bg-accent-success/15 text-accent-success" },
  info: { bar: "bg-accent-info", icon: "bg-accent-info/15 text-accent-info" },
  warning: { bar: "bg-accent-warning", icon: "bg-accent-warning/15 text-accent-warning" },
};

export function StatCard({ title, value, icon, trend, progress = 0, color }: StatCardProps) {
  const styles = colorStyles[color];

  return (
    <Card hover className="group animate-slide-up">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-small text-neutral-muted font-medium uppercase tracking-wide">{title}</p>
          <p className="text-3xl font-bold text-neutral-text mt-2">{value}</p>
          {trend && <p className="text-small text-neutral-muted mt-1">{trend}</p>}
        </div>
        <div
          className={`h-12 w-12 rounded-card flex items-center justify-center text-xl ${styles.icon} transition-transform duration-200 group-hover:scale-110`}
          aria-hidden="true"
        >
          {icon}
        </div>
      </div>
      <div className="h-1.5 w-full bg-surface-hover rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${styles.bar}`}
          style={{ width: `${Math.min(progress, 100)}%` }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </Card>
  );
}

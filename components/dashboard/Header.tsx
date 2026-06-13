"use client";

import { usePathname } from "next/navigation";
import { pageMeta } from "./nav-config";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const meta = pageMeta[pathname] ?? pageMeta["/"];

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-4 px-6 py-4 bg-surface-page/80 backdrop-blur-xl border-b border-neutral-border">
      <div className="flex items-center gap-4 min-w-0">
        <button
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          className="lg:hidden p-2 rounded-lg text-neutral-muted hover:bg-surface-hover hover:text-neutral-text transition-colors"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="min-w-0">
          <h1 className="text-h2 text-neutral-text truncate">{meta.title}</h1>
          <p className="text-small text-neutral-muted truncate">{meta.subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-card bg-surface-card border border-neutral-border">
          <div className="h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center text-white text-sm font-semibold">
            A
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-neutral-text">Admin</p>
            <p className="text-small text-neutral-muted">nivledesigns@gmailcom</p>
          </div>
        </div>
      </div>
    </header>
  );
}

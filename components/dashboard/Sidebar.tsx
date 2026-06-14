"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { navItems, staffNavItems, NavItem } from "./nav-config";
import { NavIconSvg } from "./NavIcon";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onCloseMobile?: () => void;
  logoutLoading: boolean;
  onLogout: () => void;
  mobile?: boolean;
  items?: readonly NavItem[];
}

export function Sidebar({
  collapsed,
  onToggleCollapse,
  onCloseMobile,
  logoutLoading,
  onLogout,
  mobile = false,
  items = navItems,
}: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={`
        flex flex-col h-full bg-surface-sidebar border-r border-neutral-border
        ${mobile ? "w-72" : collapsed ? "w-[72px]" : "w-64"}
        transition-all duration-300 ease-in-out
      `}
    >
      <div className={`flex items-center ${collapsed && !mobile ? "justify-center p-4" : "justify-between p-5"}`}>
        <Logo size="sm" showText={!collapsed || mobile} collapsed={collapsed && !mobile} />
        {!mobile && (
          <button
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="p-1.5 rounded-lg text-neutral-muted hover:bg-surface-hover hover:text-neutral-text transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {collapsed ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              )}
            </svg>
          </button>
        )}
        {mobile && onCloseMobile && (
          <button
            onClick={onCloseMobile}
            aria-label="Close menu"
            className="p-1.5 rounded-lg text-neutral-muted hover:bg-surface-hover hover:text-neutral-text transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto" aria-label="Main navigation">
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              title={collapsed && !mobile ? item.label : undefined}
              className={`
                nav-item
                ${active ? "nav-item-active" : ""}
                ${collapsed && !mobile ? "justify-center px-2" : ""}
              `}
            >
              <NavIconSvg icon={item.icon} />
              {(!collapsed || mobile) && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-neutral-border">
        <Button
          variant="danger"
          fullWidth
          onClick={onLogout}
          loading={logoutLoading}
          className={collapsed && !mobile ? "!px-2" : ""}
        >
          {collapsed && !mobile ? (
            logoutLoading ? <Spinner size="sm" /> : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            )
          ) : (
            logoutLoading ? "Signing out..." : "Sign Out"
          )}
        </Button>
      </div>
    </aside>
  );
}

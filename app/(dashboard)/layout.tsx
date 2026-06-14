"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { navItems, staffNavItems } from "@/components/dashboard/nav-config";
import { UserRole } from "@/lib/database/types";
import { Spinner } from "@/components/ui/Spinner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setRole(d.data.role);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingRole(false));
  }, []);

  async function handleLogout() {
    setLogoutLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setLogoutLoading(false);
    }
  }

  const sidebarItems = role === "check-in-staff" ? staffNavItems : navItems;

  if (loadingRole) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface-page">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-surface-page overflow-hidden">
      <div className="hidden lg:flex shrink-0">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
          logoutLoading={logoutLoading}
          onLogout={handleLogout}
          items={sidebarItems}
        />
      </div>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 z-50 animate-slide-up">
            <Sidebar
              collapsed={false}
              onToggleCollapse={() => {}}
              onCloseMobile={() => setMobileMenuOpen(false)}
              logoutLoading={logoutLoading}
              onLogout={handleLogout}
              mobile
              items={sidebarItems}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header onMenuClick={() => setMobileMenuOpen(true)} />

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

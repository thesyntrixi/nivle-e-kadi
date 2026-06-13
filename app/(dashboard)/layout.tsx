"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  return (
    <div className="flex h-screen bg-surface-page overflow-hidden">
      <div className="hidden lg:flex shrink-0">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
          logoutLoading={logoutLoading}
          onLogout={handleLogout}
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

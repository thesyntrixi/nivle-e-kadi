"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || "Login failed");
        return;
      }

      const role = data.data?.user?.role;
      router.push(role === "check-in-staff" ? "/check-in-staff" : "/");
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-page flex items-center justify-center p-4 md:p-8">
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-accent-info/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-[420px] animate-fade-in">
        <div className="text-center mb-8 animate-slide-up">
          <div className="flex justify-center mb-6">
            <Logo size="lg" />
          </div>
          <p className="text-neutral-muted">Sign in to manage your digital invitations</p>
        </div>

        <Card padding="lg" className="animate-slide-up shadow-glow">
          <h2 className="text-h2 text-neutral-text mb-6">Sign In</h2>

          {error && (
            <div className="mb-6">
              <Alert variant="error" title="Authentication failed" message={error} />
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Weka barua pepe yako"
              required
              autoComplete="email"
              disabled={loading}
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Weka nywila yako"
              required
              autoComplete="current-password"
              disabled={loading}
            />

            <Button type="submit" fullWidth loading={loading} className="mt-2">
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </Card>

        <footer className="text-center mt-8 text-small text-neutral-muted">
          <p>NIVLE E-Kadi &copy; 2026. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}

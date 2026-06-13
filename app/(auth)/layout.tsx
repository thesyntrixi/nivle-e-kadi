// app/(auth)/layout.tsx
export const metadata = {
  title: 'Login - NIVLE E-Kadi',
  description: 'Admin login for NIVLE E-Kadi invitation system',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-b from-slate-50 to-white">
      {children}
    </div>
  );
}

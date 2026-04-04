export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex items-start justify-center p-4 pt-8 sm:items-center sm:pt-4">
      {children}
    </div>
  );
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Set Up Your Business",
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="border-b border-border px-6 py-4 flex items-center gap-2">
        <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center">
          <span className="text-primary-foreground text-xs font-bold">T</span>
        </div>
        <span className="font-semibold text-sm">TabAndRate</span>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl">{children}</div>
      </main>
    </div>
  );
}

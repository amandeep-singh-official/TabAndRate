import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Left — Branding Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-foreground flex-col justify-between p-12">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-sm font-bold">T</span>
          </div>
          <span className="text-background font-semibold text-lg">TabAndRate</span>
        </div>

        <div className="space-y-6">
          <blockquote className="space-y-3">
            <p className="text-background/80 text-xl leading-relaxed">
              &ldquo;Since using TabAndRate, our Google reviews went from 42 to
              over 200 in just two months. The AI drafts are surprisingly
              natural.&rdquo;
            </p>
            <footer className="text-background/50 text-sm">
              — Priya S., Owner of Spice Garden Restaurant
            </footer>
          </blockquote>

          <div className="flex gap-6 text-background/40 text-sm">
            <span>2,400+ businesses</span>
            <span>·</span>
            <span>180K+ reviews generated</span>
          </div>
        </div>
      </div>

      {/* Right — Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[400px]">{children}</div>
      </div>
    </div>
  );
}

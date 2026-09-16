import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">TabAndRate</h1>
        <p className="text-muted-foreground text-lg">
          AI-powered Google review funnel for local businesses.
        </p>
      </div>
      <div className="flex gap-4">
        <Link
          href="/signup"
          className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Get Started
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-border px-6 py-3 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
        >
          Sign In
        </Link>
      </div>
    </main>
  );
}

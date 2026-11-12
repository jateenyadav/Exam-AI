import Link from "next/link";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

/** The logo mark: an "E" on an indigo-to-sky tile. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-tone-sky text-lg font-bold text-white shadow-sm",
        className,
      )}
    >
      E
    </span>
  );
}

/**
 * Shared top bar: logo on the left, page actions and the theme switch on the right.
 * `compact` hides the word mark on very narrow phones (pages with three or more actions).
 */
export function SiteHeader({
  children,
  sticky = true,
  compact = false,
  className,
}: {
  children?: React.ReactNode;
  sticky?: boolean;
  compact?: boolean;
  className?: string;
}) {
  return (
    <header className={cn("z-50 border-b bg-background/80 backdrop-blur-md", sticky && "sticky top-0", className)}>
      <div className="container mx-auto flex items-center justify-between gap-2 px-3 py-2.5 sm:px-4">
        <Link href="/" aria-label="ExamAce home" className="flex shrink-0 items-center gap-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <LogoMark />
          <span className={cn("text-lg font-bold sm:text-xl", compact && "hidden min-[400px]:inline")}>ExamAce</span>
        </Link>
        <nav className="flex min-w-0 items-center gap-1 sm:gap-2">
          {children}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

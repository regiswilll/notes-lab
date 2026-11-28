import { NotebookPen } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

/** The app name with a small accent mark. Used in the header and on the auth pages. */
export function Brand({ href, className }: { href?: string; className?: string }) {
  const content = (
    <>
      <span
        aria-hidden
        className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground"
      >
        <NotebookPen className="h-4 w-4" />
      </span>
      <span className="text-[15px] font-semibold tracking-tight">Notes</span>
    </>
  );
  const classes = cn("flex items-center gap-2.5", className);
  return href ? (
    <Link
      href={href}
      className={cn(
        classes,
        "rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
    >
      {content}
    </Link>
  ) : (
    <div className={classes}>{content}</div>
  );
}

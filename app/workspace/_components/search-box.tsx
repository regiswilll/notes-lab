"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { MAX_SEARCH, notesHref } from "../list-state";

/**
 * Search box at the top of the sidebar. As you type (after a short pause) it
 * updates ?q= in the URL; the page then lists only notes whose title or body
 * contains the text, inside the current tag filter. An open note, the tag
 * filter and the tags list are kept.
 */
export function SearchBox({
  q,
  openId,
  tags,
  view,
  disabled = false,
}: {
  /** The search text currently in the URL. */
  q: string;
  openId: number | null;
  tags: number[];
  view?: "tags";
  /** Shown greyed out while the page is still loading. */
  disabled?: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(q);
  const [searching, startTransition] = useTransition();
  // The search text last put in the URL, so we only navigate on real changes.
  const sent = useRef(q);

  // If the URL's search changes some other way, show it in the box.
  useEffect(() => {
    if (q !== sent.current) {
      sent.current = q;
      setValue(q);
    }
  }, [q]);

  useEffect(() => {
    const next = value.trim().slice(0, MAX_SEARCH);
    if (next === sent.current) return;
    const timer = setTimeout(() => {
      sent.current = next;
      startTransition(() => {
        router.replace(notesHref({ id: openId, tags, q: next, view }), { scroll: false });
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [value, openId, tags, view, router]);

  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search notes…"
        aria-label="Search notes by title or text"
        maxLength={MAX_SEARCH}
        disabled={disabled}
        className="h-10 w-full bg-background pl-9 pr-3 rounded-md border border-input bg-transparent text-sm transition-colors placeholder:text-muted-foreground/70 hover:border-foreground/25 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-60"
      />
      <span role="status" className="sr-only">
        {searching ? "Searching…" : ""}
      </span>
    </div>
  );
}

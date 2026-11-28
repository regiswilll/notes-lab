"use client";

import { ChevronRight, Folder, Inbox, Pencil } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { EditCollectionDialog } from "./edit-collection-dialog";

/**
 * A group in the sidebar. Groups start open.
 * - Collection: the arrow folds/unfolds the group; the name opens the
 *   edit pop-up (rename or delete).
 * - "Uncollected" (no collection prop): the whole heading folds/unfolds it.
 * The notes list is rendered on the server and passed in as children; it is
 * only hidden when folded, so the folded state survives page refreshes.
 */
export function NoteGroup({
  name,
  noteCount,
  collectionId,
  children,
}: {
  name: string;
  noteCount: number;
  /** Set for a real collection; leave out for "Uncollected". */
  collectionId?: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const contentId = `group-${collectionId ?? "uncollected"}`;

  const toggleProps = {
    type: "button" as const,
    onClick: () => setOpen((o) => !o),
    "aria-expanded": open,
    "aria-controls": contentId,
  };
  const chevron = (
    <ChevronRight className={cn("text-muted-foreground transition-transform", open && "rotate-90")} />
  );
  const count = (
    <span className="shrink-0 px-2 text-xs font-normal text-muted-foreground" aria-label={`${noteCount} notes`}>
      {noteCount}
    </span>
  );
  const rowClass =
    "flex items-center rounded-md text-sm font-medium text-foreground/90 [&_svg]:size-4 [&_svg]:shrink-0";
  const focusRing =
    "rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div>
      {collectionId === undefined ? (
        <button {...toggleProps} className={cn(rowClass, focusRing, "w-full gap-2 px-2 py-1.5 text-left hover:bg-accent")}>
          {chevron}
          <Inbox className="text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate">{name}</span>
          {count}
        </button>
      ) : (
        <div className={cn(rowClass, "hover:bg-accent")}>
          <button
            {...toggleProps}
            aria-label={`${open ? "Collapse" : "Expand"} ${name}`}
            className={cn(focusRing, "flex items-center gap-2 py-1.5 pl-2 pr-1")}
          >
            {chevron}
            <Folder className="text-muted-foreground" />
          </button>
          <button
            type="button"
            onClick={() => setEditing(true)}
            title="Rename or delete this collection"
            className={cn(focusRing, "group/name flex min-w-0 flex-1 items-center gap-1.5 py-1.5 pl-1 text-left")}
          >
            <span className="truncate">{name}</span>
            <Pencil className="text-muted-foreground opacity-0 transition-opacity group-hover/name:opacity-100 group-focus-visible/name:opacity-100" />
          </button>
          {count}
        </div>
      )}

      <div id={contentId} hidden={!open} className="mb-2 ml-[1.0625rem] mt-1 border-l pl-2">
        {children}
      </div>

      {editing && collectionId !== undefined && (
        <EditCollectionDialog
          id={collectionId}
          name={name}
          noteCount={noteCount}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}

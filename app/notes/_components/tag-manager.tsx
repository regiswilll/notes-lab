"use client";

import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import type { TagWithCount } from "@/lib/db";
import { deleteTagAction, renameTagAction, type ActionState } from "../actions";

const initialState: ActionState = { status: "idle" };

const iconButton =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50";

/**
 * The tags list, shown in the main area when "Tags" is clicked in the sidebar.
 * Each tag has an edit button (rename in place: Enter saves, Escape cancels)
 * and a delete button.
 */
export function TagManager({
  tags,
  closeHref,
  headingId = "tags-heading",
}: {
  tags: TagWithCount[];
  /** Where "Close" goes: the notes page, keeping the tag filter. */
  closeHref: string;
  /** Unique heading id (the list can be on the page twice: small and wide screens). */
  headingId?: string;
}) {
  return (
    <section aria-labelledby={headingId} className="mx-auto w-full max-w-xl">
      <div className="flex items-center justify-between gap-3">
        <h2 id={headingId} className="text-lg font-semibold">
          Tags
        </h2>
        <Link
          href={closeHref}
          className="rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          Close
        </Link>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Renaming or deleting a tag changes it on every note that has it.
      </p>

      {tags.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          No tags yet. Add tags to a note in the editor.
        </p>
      ) : (
        <ul className="mt-4 divide-y rounded-md border">
          {tags.map((tag) => (
            <TagRow key={tag.id} tag={tag} />
          ))}
        </ul>
      )}
    </section>
  );
}

function TagRow({ tag }: { tag: TagWithCount }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(tag.name);

  const [renameState, renameAction, renaming] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await renameTagAction(prev, formData);
      if (result.status === "success") setEditing(false);
      return result;
    },
    initialState,
  );
  const [deleteState, deleteAction, deleting] = useActionState(deleteTagAction, initialState);

  function startEditing() {
    setName(tag.name);
    setEditing(true);
  }

  const usedOn =
    tag.noteCount === 0 ? "No notes" : tag.noteCount === 1 ? "1 note" : `${tag.noteCount} notes`;
  const error =
    (editing && renameState.status === "error" && renameState.message) ||
    (deleteState.status === "error" && deleteState.message) ||
    null;

  return (
    <li className="px-3 py-2">
      <div className="flex items-center gap-2">
        {editing ? (
          // A form with one text box: pressing Enter submits it.
          <form action={renameAction} className="min-w-0 flex-1">
            <input type="hidden" name="id" value={tag.id} />
            <input
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setEditing(false);
              }}
              aria-label={`New name for tag "${tag.name}"`}
              required
              maxLength={50}
              autoFocus
              disabled={renaming}
              className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </form>
        ) : (
          <span className="min-w-0 flex-1 truncate text-sm">
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-secondary-foreground">
              {tag.name}
            </span>
          </span>
        )}

        <span className="shrink-0 text-xs text-muted-foreground">
          {editing ? (renaming ? "Saving…" : "Enter to save · Esc to cancel") : usedOn}
        </span>

        {!editing && (
          <button
            type="button"
            onClick={startEditing}
            aria-label={`Edit tag "${tag.name}"`}
            title="Edit tag name"
            className={`${iconButton} hover:bg-accent hover:text-foreground`}
          >
            <Pencil className="h-4 w-4" />
          </button>
        )}

        <form
          action={deleteAction}
          onSubmit={(e) => {
            const notes =
              tag.noteCount === 0
                ? ""
                : tag.noteCount === 1
                  ? " It will be removed from 1 note."
                  : ` It will be removed from ${tag.noteCount} notes.`;
            if (!window.confirm(`Delete the tag "${tag.name}"?${notes} The notes themselves stay.`)) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="id" value={tag.id} />
          <button
            type="submit"
            disabled={deleting || renaming}
            aria-label={`Delete tag "${tag.name}"`}
            title="Delete tag"
            className={`${iconButton} hover:bg-destructive/10 hover:text-destructive`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </form>
      </div>

      {error && (
        <p role="alert" className="mt-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </li>
  );
}

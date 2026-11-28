"use client";

import { Check, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import type { TagWithCount } from "@/lib/db";
import { colorLabel, TAG_COLOR_CLASSES, TAG_COLORS, tagPillClass } from "@/lib/tag-colors";
import { cn } from "@/lib/utils";
import {
  deleteTagAction,
  renameTagAction,
  setTagColorAction,
  type ActionState,
} from "../actions";

const initialState: ActionState = { status: "idle" };

const iconButton =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

/**
 * The tags list, shown in the main area when "Tags" is clicked in the sidebar.
 * Each tag has a colour button (pick from the palette; saved at once), an
 * edit button (rename in place: Enter saves, Escape cancels) and a delete button.
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
        <h2 id={headingId} className="text-xl font-semibold tracking-tight">
          Tags
        </h2>
        <Link
          href={closeHref}
          className="rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
        <ul className="mt-6 divide-y rounded-lg border">
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
  const [picking, setPicking] = useState(false);
  const [colorState, colorAction, coloring] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await setTagColorAction(prev, formData);
      if (result.status === "success") setPicking(false);
      return result;
    },
    initialState,
  );

  function startEditing() {
    setName(tag.name);
    setEditing(true);
  }

  const usedOn =
    tag.noteCount === 0 ? "No notes" : tag.noteCount === 1 ? "1 note" : `${tag.noteCount} notes`;
  const error =
    (editing && renameState.status === "error" && renameState.message) ||
    (deleteState.status === "error" && deleteState.message) ||
    (colorState.status === "error" && colorState.message) ||
    null;

  return (
    <li className="px-4 py-3">
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
              className="h-8 w-full px-2 rounded-md border border-input bg-transparent text-sm transition-colors placeholder:text-muted-foreground/70 hover:border-foreground/25 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            />
          </form>
        ) : (
          <span className="min-w-0 flex-1 truncate text-sm">
            <span className={cn("rounded-full px-2.5 py-0.5", tagPillClass(tag.color))}>
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
            onClick={() => setPicking((p) => !p)}
            aria-expanded={picking}
            aria-controls={`tag-colors-${tag.id}`}
            aria-label={`Colour of tag "${tag.name}": ${colorLabel(tag.color)}. Change colour`}
            title="Change colour"
            className={`${iconButton} hover:bg-accent`}
          >
            <span className={cn("h-4 w-4 rounded-full", TAG_COLOR_CLASSES[tag.color].swatch)} />
          </button>
        )}

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

      {picking && !editing && (
        // One submit button per colour: clicking a swatch saves it at once.
        <form
          id={`tag-colors-${tag.id}`}
          action={colorAction}
          className="mt-2 flex flex-wrap items-center gap-1.5"
          aria-label={`Colours for tag "${tag.name}"`}
        >
          <input type="hidden" name="id" value={tag.id} />
          {TAG_COLORS.map((color) => (
            <button
              key={color}
              type="submit"
              name="color"
              value={color}
              disabled={coloring}
              aria-pressed={color === tag.color}
              aria-label={colorLabel(color)}
              title={colorLabel(color)}
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-white ring-offset-2 ring-offset-background transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
                TAG_COLOR_CLASSES[color].swatch,
                color === tag.color && "ring-2 ring-foreground",
              )}
            >
              {color === tag.color && <Check className="h-3.5 w-3.5" aria-hidden />}
            </button>
          ))}
          {coloring && <span className="text-xs text-muted-foreground">Saving…</span>}
        </form>
      )}

      {error && (
        <p role="alert" className="mt-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </li>
  );
}

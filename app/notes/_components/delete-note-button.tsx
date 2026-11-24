"use client";

import { Trash2 } from "lucide-react";
import { useActionState } from "react";

import { deleteNoteAction, type ActionState } from "../actions";

const initialState: ActionState = { status: "idle" };

/** Small bin button shown next to a note in the sidebar. */
export function DeleteNoteButton({
  id,
  title,
  openId,
}: {
  id: number;
  title: string;
  /** The note open in the editor, so deleting it can close the editor. */
  openId: number | null;
}) {
  const [state, formAction, pending] = useActionState(
    deleteNoteAction,
    initialState,
  );

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        const name = title.trim() ? `"${title}"` : "this note";
        if (!window.confirm(`Delete ${name}? This can't be undone.`)) {
          e.preventDefault();
        }
      }}
      // "contents": the button sits in the list row; an error wraps onto its own line.
      className="contents"
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="openId" value={openId ?? ""} />
      <button
        type="submit"
        disabled={pending}
        aria-label={title.trim() ? `Delete "${title}"` : "Delete note without a title"}
        title="Delete note"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
      >
        <Trash2 className="h-4 w-4" />
      </button>
      {state.status === "error" && (
        <p role="alert" className="basis-full px-3 pb-1 text-xs text-destructive">
          {state.message}
        </p>
      )}
    </form>
  );
}

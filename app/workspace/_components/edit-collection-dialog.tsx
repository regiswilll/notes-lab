"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  deleteCollectionAction,
  renameCollectionAction,
  type ActionState,
} from "../actions";

const initialState: ActionState = { status: "idle" };

/**
 * Pop-up for one collection: change its name (Save) or delete it. Uses the
 * browser's own <dialog>, opened as a modal: Escape or a click outside closes
 * it. It is mounted fresh each time it opens, so old input and errors are gone.
 */
export function EditCollectionDialog({
  id,
  name,
  noteCount,
  onClose,
}: {
  id: number;
  name: string;
  noteCount: number;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [newName, setNewName] = useState(name);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  // Closing the <dialog> (Escape, Cancel, outside click, or after a successful
  // action) fires its "close" event, which unmounts this component.
  const close = () => dialogRef.current?.close();

  const [renameState, renameAction, renaming] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await renameCollectionAction(prev, formData);
      if (result.status === "success") close();
      return result;
    },
    initialState,
  );
  const [deleteState, deleteAction, deleting] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await deleteCollectionAction(prev, formData);
      if (result.status === "success") close();
      return result;
    },
    initialState,
  );

  const busy = renaming || deleting;
  const unchanged = newName.trim() === name || newName.trim() === "";
  const error =
    renameState.status === "error"
      ? renameState.message
      : deleteState.status === "error"
        ? deleteState.message
        : null;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      // A click on the backdrop lands on the <dialog> itself.
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) close();
      }}
      aria-labelledby={`edit-collection-${id}`}
      className="w-[calc(100%-2rem)] max-w-sm rounded-lg border bg-background p-0 text-foreground shadow-lg backdrop:bg-black/60"
    >
      <form action={renameAction} className="space-y-4 p-5">
        <h2 id={`edit-collection-${id}`} className="text-base font-semibold">
          Edit collection
        </h2>
        <input type="hidden" name="id" value={id} />

        <div className="space-y-1.5">
          <label htmlFor={`collection-name-${id}`} className="text-sm text-muted-foreground">
            Name
          </label>
          <Input
            id={`collection-name-${id}`}
            name="name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
            maxLength={100}
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            {noteCount === 0
              ? "No notes in this collection yet."
              : noteCount === 1
                ? "1 note in this collection."
                : `${noteCount} notes in this collection.`}
          </p>
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="submit"
            variant="ghost"
            formAction={deleteAction}
            formNoValidate
            disabled={busy}
            onClick={(e) => {
              const notes =
                noteCount === 0
                  ? ""
                  : noteCount === 1
                    ? " Its note will move to Uncollected."
                    : ` Its ${noteCount} notes will move to Uncollected.`;
              if (!window.confirm(`Delete the collection "${name}"?${notes}`)) {
                e.preventDefault();
              }
            }}
            className="mr-auto text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            {deleting ? "Deleting…" : "Delete"}
          </Button>
          <Button type="button" variant="outline" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy || unchanged}>
            {renaming ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </dialog>
  );
}

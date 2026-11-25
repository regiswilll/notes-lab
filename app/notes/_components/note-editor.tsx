"use client";

import { useRouter } from "next/navigation";
import { startTransition, useActionState, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Collection, Note } from "@/lib/db";
import { CollectionPicker } from "./collection-picker";
import {
  deleteNoteAction,
  discardNewNoteAction,
  saveNoteAction,
  type ActionState,
} from "../actions";

const initialState: ActionState = { status: "idle" };

export function NoteEditor({
  note,
  collections,
  lastSavedLabel,
}: {
  note: Note;
  /** For the collection dropdown. */
  collections: Collection[];
  /** note.updated_at, already formatted on the server. */
  lastSavedLabel: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body ?? "");
  const [collectionId, setCollectionId] = useState(note.collection_id);
  // If the chosen collection is deleted meanwhile, fall back to "No collection".
  const selectedCollection = collections.some((c) => c.id === collectionId)
    ? collectionId
    : null;

  const [saveState, saveAction, saving] = useActionState(
    saveNoteAction,
    initialState,
  );
  const [deleteState, deleteAction, deleting] = useActionState(
    deleteNoteAction,
    initialState,
  );
  const [discardState, discardAction, discarding] = useActionState(
    discardNewNoteAction,
    initialState,
  );

  // A note with a blank title in the database has never been saved
  // (saving requires a title), so it counts as a new note.
  const isNew = note.title.trim() === "";

  // Compare against the version loaded from the database.
  const dirty =
    title !== note.title ||
    body !== (note.body ?? "") ||
    selectedCollection !== note.collection_id;

  // Warn before closing or reloading the tab with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // Cancel: leave the editor without saving.
  // - Existing note: nothing is sent to the database.
  // - New, never-saved note: it is deleted, so no blank note is left behind.
  function cancel() {
    if (isNew) {
      if (dirty && !window.confirm("Discard this new note?")) return;
      const formData = new FormData();
      formData.set("id", String(note.id));
      startTransition(() => discardAction(formData));
      return;
    }
    if (dirty && !window.confirm("Discard your unsaved changes?")) return;
    router.push("/notes");
  }

  let status: { text: string; tone: "muted" | "error" } | null = null;
  if (saving) status = { text: "Saving…", tone: "muted" };
  else if (saveState.status === "error" && dirty)
    status = { text: saveState.message ?? "Could not save.", tone: "error" };
  else if (discardState.status === "error")
    status = { text: discardState.message ?? "Could not discard.", tone: "error" };
  else if (dirty) status = { text: "Unsaved changes", tone: "muted" };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <form action={saveAction} className="flex min-h-0 flex-1 flex-col gap-4">
        <input type="hidden" name="id" value={note.id} />

        <div className="flex flex-wrap items-center gap-3">
          <Input
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (required)"
            aria-label="Title"
            required
            autoFocus={note.title === ""}
            className="h-11 min-w-0 flex-1 text-lg font-semibold md:text-lg"
          />
          <Button type="button" variant="outline" onClick={cancel} disabled={saving || discarding}>
            {discarding ? "Discarding…" : "Cancel"}
          </Button>
          <Button type="submit" disabled={!dirty || saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>

        <CollectionPicker
          noteId={note.id}
          value={selectedCollection}
          onChange={setCollectionId}
          collections={collections}
        />

        <textarea
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Start writing…"
          aria-label="Body"
          className="min-h-64 flex-1 resize-none rounded-md border border-input bg-transparent p-3 text-sm leading-relaxed shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </form>

      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <p
          role="status"
          className={status?.tone === "error" ? "text-destructive" : undefined}
        >
          {status?.text ??
            (note.title.trim() === ""
              ? "New note: add a title, then Save. The body is optional."
              : `Last saved ${lastSavedLabel}`)}
        </p>

        <form
          action={deleteAction}
          onSubmit={(e) => {
            if (!window.confirm(`Delete ${quoted(note.title)}? This can't be undone.`)) {
              e.preventDefault();
            }
          }}
          className="flex items-center gap-2"
        >
          <input type="hidden" name="id" value={note.id} />
          <input type="hidden" name="openId" value={note.id} />
          {deleteState.status === "error" && (
            <span role="alert" className="text-destructive">
              {deleteState.message}
            </span>
          )}
          <Button type="submit" variant="ghost" size="sm" disabled={deleting}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive">
            {deleting ? "Deleting…" : "Delete note"}
          </Button>
        </form>
      </div>
    </div>
  );
}

/** "My note" in quotes, or "this note" when the title is blank. */
function quoted(title: string) {
  return title.trim() ? `"${title}"` : "this note";
}

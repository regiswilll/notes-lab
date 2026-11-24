"use server";

// Server Actions for the notes page. They read form input, call lib/db.ts,
// and refresh or redirect. They never talk to Supabase themselves.
import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import {
  createNote,
  deleteNote,
  deleteNoteIfNeverSaved,
  updateNote,
} from "@/lib/db";

export type ActionState = {
  status: "idle" | "error";
  message?: string;
};

function readId(formData: FormData): number | null {
  const id = Number(formData.get("id"));
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function createNoteAction(): Promise<ActionState> {
  const result = await createNote();
  if (result.error !== null) {
    return { status: "error", message: `Could not create a note: ${result.error}` };
  }
  redirect(`/notes?id=${result.data.id}`);
}

export async function saveNoteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = readId(formData);
  if (id === null) {
    return { status: "error", message: "This note has no valid id." };
  }

  const title = String(formData.get("title") ?? "");
  // Browsers send textarea line breaks as \r\n; store plain \n so the saved
  // text matches what the editor holds (otherwise it would always look unsaved).
  const body = String(formData.get("body") ?? "").replace(/\r\n/g, "\n");
  if (title.trim() === "") {
    return { status: "error", message: "Give the note a title before saving." };
  }

  const result = await updateNote(id, { title, body });
  if (result.error !== null) {
    return { status: "error", message: `Could not save: ${result.error}` };
  }

  // Close the editor: go back to the list, with a "saved" confirmation.
  redirect(`/notes?saved=${id}`);
}

export async function deleteNoteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = readId(formData);
  if (id === null) {
    return { status: "error", message: "This note has no valid id." };
  }

  const result = await deleteNote(id);
  if (result.error !== null) {
    return { status: "error", message: `Could not delete: ${result.error}` };
  }

  // openId is the note open in the editor (if any). Deleting that note closes
  // the editor; deleting any other note keeps the editor and its unsaved text.
  const openId = Number(formData.get("openId"));
  if (openId === id) {
    redirect("/notes");
  }
  refresh();
  return { status: "idle" };
}

/** Cancel on a new, never-saved note: remove it and close the editor. */
export async function discardNewNoteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = readId(formData);
  if (id === null) {
    return { status: "error", message: "This note has no valid id." };
  }

  const result = await deleteNoteIfNeverSaved(id);
  if (result.error !== null) {
    return { status: "error", message: `Could not discard the new note: ${result.error}` };
  }
  redirect("/notes");
}

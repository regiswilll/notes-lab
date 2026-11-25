"use server";

// Server Actions for the notes page. They read form input, call lib/db.ts,
// and refresh or redirect. They never talk to Supabase themselves.
import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import {
  createCollection,
  createNote,
  deleteNote,
  deleteCollection,
  deleteNoteIfNeverSaved,
  renameCollection,
  updateNote,
} from "@/lib/db";

export type ActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

function readId(formData: FormData): number | null {
  const id = Number(formData.get("id"));
  return isId(id) ? id : null;
}

function isId(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

const MAX_COLLECTION_NAME = 100;

/** Trimmed collection name, or an error message if it can't be used. */
function readCollectionName(formData: FormData): { name: string } | { error: string } {
  const name = String(formData.get("name") ?? "").trim();
  if (name === "") return { error: "Give the collection a name." };
  if (name.length > MAX_COLLECTION_NAME) {
    return { error: `Keep the name to ${MAX_COLLECTION_NAME} characters or fewer.` };
  }
  return { name };
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
  // The collection dropdown: "" means "No collection".
  const rawCollection = String(formData.get("collection_id") ?? "");
  const collection_id = rawCollection === "" ? null : Number(rawCollection);
  if (collection_id !== null && !isId(collection_id)) {
    return { status: "error", message: "That is not a valid collection." };
  }

  const result = await updateNote(id, { title, body, collection_id });
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

/** "New collection" in the sidebar: adds a collection with the given name. */
export async function createCollectionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const checked = readCollectionName(formData);
  if ("error" in checked) {
    return { status: "error", message: checked.error };
  }

  const result = await createCollection(checked.name);
  if (result.error !== null) {
    return { status: "error", message: `Could not add the collection: ${result.error}` };
  }
  refresh();
  return { status: "success" };
}

/** "Save" in the edit-collection pop-up: renames the collection. */
export async function renameCollectionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = readId(formData);
  if (id === null) {
    return { status: "error", message: "This collection has no valid id." };
  }
  const checked = readCollectionName(formData);
  if ("error" in checked) {
    return { status: "error", message: checked.error };
  }

  const result = await renameCollection(id, checked.name);
  if (result.error !== null) {
    return { status: "error", message: `Could not rename the collection: ${result.error}` };
  }
  refresh();
  return { status: "success" };
}

/** "Delete" in the edit-collection pop-up. Its notes become uncollected. */
export async function deleteCollectionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = readId(formData);
  if (id === null) {
    return { status: "error", message: "This collection has no valid id." };
  }

  const result = await deleteCollection(id);
  if (result.error !== null) {
    return { status: "error", message: `Could not delete the collection: ${result.error}` };
  }
  refresh();
  return { status: "success" };
}

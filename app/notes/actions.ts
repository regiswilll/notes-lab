"use server";

// Server Actions for the notes page. They read form input, call lib/db.ts,
// and refresh or redirect. They never talk to Supabase themselves.
//
// Server Actions can be called directly, not only from the page, so each one
// first checks on the server that the user is signed in (requireUser sends
// them to the sign-in page if not). RLS would reject the query anyway; this
// gives a signed-out or expired session a clear path instead of an error.
import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/supabase/require-user";
import { isTagColor } from "@/lib/tag-colors";
import { notesHref, parseSearch, parseTagIds, type ListState } from "./list-state";
import {
  createCollection,
  createNote,
  deleteNote,
  deleteCollection,
  deleteNoteIfNeverSaved,
  deleteTag,
  renameCollection,
  renameTag,
  setNoteTags,
  setTagColor,
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
const MAX_TAG_NAME = 50;
const MAX_TAGS_PER_NOTE = 20;

/**
 * The sidebar's tag filter and search text, sent along by forms as hidden
 * "filter" ("1,3") and "q" fields, so a redirect keeps them.
 */
function readListState(formData: FormData): ListState {
  return {
    tags: parseTagIds(formData.get("filter")),
    q: parseSearch(formData.get("q")),
  };
}

/** Trimmed collection name, or an error message if it can't be used. */
function readCollectionName(formData: FormData): { name: string } | { error: string } {
  const name = String(formData.get("name") ?? "").trim();
  if (name === "") return { error: "Give the collection a name." };
  if (name.length > MAX_COLLECTION_NAME) {
    return { error: `Keep the name to ${MAX_COLLECTION_NAME} characters or fewer.` };
  }
  return { name };
}

export async function createNoteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();
  const result = await createNote();
  if (result.error !== null) {
    return { status: "error", message: `Could not create a note: ${result.error}` };
  }
  redirect(notesHref({ id: result.data.id, ...readListState(formData) }));
}

export async function saveNoteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();
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

  // Tag chips in the editor are sent as one "tag" field each.
  const tags = formData
    .getAll("tag")
    .map((value) => String(value).trim())
    .filter((name) => name !== "");
  if (tags.some((name) => name.length > MAX_TAG_NAME)) {
    return { status: "error", message: `Keep each tag to ${MAX_TAG_NAME} characters or fewer.` };
  }
  if (tags.length > MAX_TAGS_PER_NOTE) {
    return { status: "error", message: `A note can have at most ${MAX_TAGS_PER_NOTE} tags.` };
  }

  const result = await updateNote(id, { title, body, collection_id });
  if (result.error !== null) {
    return { status: "error", message: `Could not save: ${result.error}` };
  }
  const tagResult = await setNoteTags(id, tags);
  if (tagResult.error !== null) {
    refresh(); // the title/body/collection did save; show that
    return { status: "error", message: `Saved, but the tags could not be saved: ${tagResult.error}` };
  }

  // Close the editor: go back to the list, with a "saved" confirmation.
  redirect(notesHref({ saved: id, ...readListState(formData) }));
}

export async function deleteNoteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();
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
    redirect(notesHref(readListState(formData)));
  }
  refresh();
  return { status: "idle" };
}

/** Cancel on a new, never-saved note: remove it and close the editor. */
export async function discardNewNoteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();
  const id = readId(formData);
  if (id === null) {
    return { status: "error", message: "This note has no valid id." };
  }

  const result = await deleteNoteIfNeverSaved(id);
  if (result.error !== null) {
    return { status: "error", message: `Could not discard the new note: ${result.error}` };
  }
  redirect(notesHref(readListState(formData)));
}

/** "New collection" in the sidebar: adds a collection with the given name. */
export async function createCollectionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();
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
  await requireUser();
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
  await requireUser();
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

/** Enter in the tags list's edit box: renames the tag everywhere it is used. */
export async function renameTagAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();
  const id = readId(formData);
  if (id === null) {
    return { status: "error", message: "This tag has no valid id." };
  }
  const name = String(formData.get("name") ?? "").trim();
  if (name === "") {
    return { status: "error", message: "Give the tag a name." };
  }
  if (name.length > MAX_TAG_NAME) {
    return { status: "error", message: `Keep a tag to ${MAX_TAG_NAME} characters or fewer.` };
  }

  const result = await renameTag(id, name);
  if (result.error !== null) {
    return { status: "error", message: `Could not rename the tag: ${result.error}` };
  }
  refresh();
  return { status: "success" };
}

/** Delete in the tags list: removes the tag from every note, then deletes it. */
export async function deleteTagAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();
  const id = readId(formData);
  if (id === null) {
    return { status: "error", message: "This tag has no valid id." };
  }

  const result = await deleteTag(id);
  if (result.error !== null) {
    return { status: "error", message: `Could not delete the tag: ${result.error}` };
  }
  refresh();
  return { status: "success" };
}

/** A colour swatch in the tags list: changes the tag's colour everywhere. */
export async function setTagColorAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();
  const id = readId(formData);
  if (id === null) {
    return { status: "error", message: "This tag has no valid id." };
  }
  const color = formData.get("color");
  if (!isTagColor(color)) {
    return { status: "error", message: "That is not one of the tag colours." };
  }

  const result = await setTagColor(id, color);
  if (result.error !== null) {
    return { status: "error", message: `Could not change the colour: ${result.error}` };
  }
  refresh();
  return { status: "success" };
}

// The single module for database access. Components and pages import from
// here (or from Server Actions that import from here) and never call Supabase
// directly. Server-only: it reads the request's cookies through the server
// Supabase client, so never import it from a "use client" component.
import { createClient } from "@/lib/supabase/server";

/** What the sidebar needs for each note. */
export type NoteSummary = {
  id: number;
  title: string;
  updated_at: string;
};

/** A full note, for the editor. */
export type Note = NoteSummary & {
  body: string | null;
  created_at: string;
};

export type Result<T> = { data: T; error: null } | { data: null; error: string };

/** All notes, most recently updated first. */
export async function getNotes(): Promise<Result<NoteSummary[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notes")
    .select("id, title, updated_at")
    .order("updated_at", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }
  return { data, error: null };
}

/** One note by id, or null if there is no note with that id. */
export async function getNote(id: number): Promise<Result<Note | null>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notes")
    .select("id, title, body, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }
  return { data, error: null };
}

/**
 * Creates an empty note (blank title and body) and returns its id. The title
 * column is NOT NULL but may be blank; the editor requires a title to save.
 */
export async function createNote(): Promise<Result<{ id: number }>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notes")
    .insert({ title: "", body: "" })
    .select("id")
    .single();

  if (error) {
    return { data: null, error: error.message };
  }
  return { data, error: null };
}

/**
 * Saves a note's title and body. updated_at is set by the database trigger
 * notes_set_updated_at, so it is not sent from here.
 */
export async function updateNote(
  id: number,
  changes: { title: string; body: string },
): Promise<Result<null>> {
  const supabase = await createClient();
  // .select() returns the changed rows, so we can tell "saved" apart from
  // "no such note" (RLS or a missing row makes an update silently match 0 rows).
  const { data, error } = await supabase
    .from("notes")
    .update(changes)
    .eq("id", id)
    .select("id");

  if (error) {
    return { data: null, error: error.message };
  }
  if (data.length === 0) {
    return { data: null, error: "This note no longer exists." };
  }
  return { data: null, error: null };
}

/** Deletes a note. Its tag links are removed by the database (ON DELETE CASCADE). */
export async function deleteNote(id: number): Promise<Result<null>> {
  const supabase = await createClient();
  const { error } = await supabase.from("notes").delete().eq("id", id);

  if (error) {
    return { data: null, error: error.message };
  }
  return { data: null, error: null };
}

/**
 * Deletes a note only if it was never saved, i.e. its title is still blank
 * (saving always requires a title). Used when "Cancel" is pressed on a new
 * note. A note that has been saved is left untouched.
 */
export async function deleteNoteIfNeverSaved(id: number): Promise<Result<null>> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notes")
    .delete()
    .eq("id", id)
    .eq("title", "");

  if (error) {
    return { data: null, error: error.message };
  }
  return { data: null, error: null };
}

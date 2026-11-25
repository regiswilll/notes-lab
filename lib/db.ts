// The single module for database access. Components and pages import from
// here (or from Server Actions that import from here) and never call Supabase
// directly. Server-only: it reads the request's cookies through the server
// Supabase client, so never import it from a "use client" component.
import { createClient } from "@/lib/supabase/server";

/** A tag. Names are unique; the app also treats "Work" and "work" as the same tag. */
export type Tag = {
  id: number;
  name: string;
};

/** What the sidebar needs for each note. */
export type NoteSummary = {
  id: number;
  title: string;
  updated_at: string;
  /** The collection this note is in, or null for no collection. */
  collection_id: number | null;
  /** The note's tags, sorted by name. */
  tags: Tag[];
};

/** A collection: a named group that holds notes. */
export type Collection = {
  id: number;
  name: string;
};

/** A full note, for the editor. */
export type Note = NoteSummary & {
  body: string | null;
  created_at: string;
};

export type Result<T> = { data: T; error: null } | { data: null; error: string };

/**
 * Notes, most recently updated first, each with its tags.
 * - tagIds: only notes that have EVERY one of those tags (not any of them).
 * - search: only notes whose title OR body contains the text, ignoring
 *   upper/lower case. Combined with tagIds, it searches inside the notes
 *   that have all those tags.
 */
export async function getNotes({
  tagIds = [],
  search = "",
}: { tagIds?: number[]; search?: string } = {}): Promise<Result<NoteSummary[]>> {
  const supabase = await createClient();

  let onlyIds: number[] | null = null;
  if (tagIds.length > 0) {
    const wanted = [...new Set(tagIds)];
    const { data: links, error } = await supabase
      .from("note_tags")
      .select("note_id, tag_id")
      .in("tag_id", wanted);

    if (error) {
      return { data: null, error: error.message };
    }
    // note_tags has one row per note-tag pair (its primary key), so a note
    // that has all the wanted tags appears exactly wanted.length times.
    const hits = new Map<number, number>();
    for (const link of links) {
      hits.set(link.note_id, (hits.get(link.note_id) ?? 0) + 1);
    }
    onlyIds = [...hits].filter(([, n]) => n === wanted.length).map(([id]) => id);
    if (onlyIds.length === 0) {
      return { data: [], error: null };
    }
  }

  const term = search.trim();

  // tags (id, name): PostgREST follows the note_tags join table to tags.
  // The body is needed to double-check search matches below; it is not
  // passed on to the sidebar.
  let query = supabase
    .from("notes")
    .select("id, title, body, updated_at, collection_id, tags (id, name)");
  if (onlyIds !== null) {
    query = query.in("id", onlyIds);
  }
  if (term !== "") {
    // title ILIKE '%term%' OR body ILIKE '%term%' (ILIKE = not case-sensitive).
    const pattern = quoteFilterValue(`%${escapeLike(term)}%`);
    query = query.or(`title.ilike.${pattern},body.ilike.${pattern}`);
  }
  const { data, error } = await query
    .order("updated_at", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  // PostgREST also treats "*" in a pattern as a wildcard, so a search
  // containing "*" could match too much: keep only real matches.
  const needle = term.toLowerCase();
  const matches =
    term === ""
      ? data
      : data.filter(
          (note) =>
            note.title.toLowerCase().includes(needle) ||
            (note.body ?? "").toLowerCase().includes(needle),
        );

  return {
    data: matches.map((note) => ({
      id: note.id,
      title: note.title,
      updated_at: note.updated_at,
      collection_id: note.collection_id,
      tags: sortTags(note.tags ?? []),
    })),
    error: null,
  };
}

/** Makes %, _ and \ in user text match literally in a LIKE/ILIKE pattern. */
function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, "\\$&");
}

/**
 * Wraps a value in double quotes for a PostgREST filter such as .or(), so
 * commas, dots, colons and brackets in user text are not read as syntax.
 */
function quoteFilterValue(value: string): string {
  return `"${value.replace(/[\\"]/g, "\\$&")}"`;
}

/** One note by id, or null if there is no note with that id. */
export async function getNote(id: number): Promise<Result<Note | null>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notes")
    .select("id, title, body, collection_id, created_at, updated_at, tags (id, name)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }
  return {
    data: data && { ...data, tags: sortTags(data.tags ?? []) },
    error: null,
  };
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
 * Saves a note's title, body and collection (null = no collection).
 * updated_at is set by the database trigger notes_set_updated_at, so it is
 * not sent from here.
 */
export async function updateNote(
  id: number,
  changes: { title: string; body: string; collection_id: number | null },
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
    // 23503 = foreign key violation: the chosen collection was deleted meanwhile.
    if (error.code === "23503") {
      return { data: null, error: "That collection no longer exists." };
    }
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

/** All collections, sorted by name. */
export async function getCollections(): Promise<Result<Collection[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collections")
    .select("id, name")
    .order("name", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    return { data: null, error: error.message };
  }
  return { data, error: null };
}

/**
 * Creates a collection and returns it. The database rejects a blank name
 * (check constraint), so callers should trim and check the name first.
 */
export async function createCollection(name: string): Promise<Result<Collection>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collections")
    .insert({ name })
    .select("id, name")
    .single();

  if (error) {
    return { data: null, error: error.message };
  }
  return { data, error: null };
}

/** Renames a collection. */
export async function renameCollection(id: number, name: string): Promise<Result<null>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collections")
    .update({ name })
    .eq("id", id)
    .select("id");

  if (error) {
    return { data: null, error: error.message };
  }
  if (data.length === 0) {
    return { data: null, error: "This collection no longer exists." };
  }
  return { data: null, error: null };
}

/**
 * Deletes a collection. Its notes are kept: the database sets their
 * collection_id to null (ON DELETE SET NULL), so they become uncollected.
 */
export async function deleteCollection(id: number): Promise<Result<null>> {
  const supabase = await createClient();
  const { error } = await supabase.from("collections").delete().eq("id", id);

  if (error) {
    return { data: null, error: error.message };
  }
  return { data: null, error: null };
}

/** A tag with the number of notes it is on (for the tags list). */
export type TagWithCount = Tag & { noteCount: number };

/** All tags, sorted by name, each with how many notes have it. */
export async function getTags(): Promise<Result<TagWithCount[]>> {
  const supabase = await createClient();
  // note_tags(count): the number of note_tags rows for each tag.
  const { data, error } = await supabase
    .from("tags")
    .select("id, name, note_tags(count)")
    .order("name", { ascending: true });

  if (error) {
    return { data: null, error: error.message };
  }
  const tags = data.map((tag) => ({
    id: tag.id as number,
    name: tag.name as string,
    noteCount: (tag.note_tags as { count: number }[] | null)?.[0]?.count ?? 0,
  }));
  return { data: sortTags(tags), error: null };
}

/**
 * Renames a tag. Refuses a name another tag already has, ignoring upper/lower
 * case (the app treats "Work" and "work" as the same tag).
 */
export async function renameTag(id: number, name: string): Promise<Result<null>> {
  const supabase = await createClient();
  const { data: existing, error: readError } = await supabase.from("tags").select("id, name");
  if (readError) {
    return { data: null, error: readError.message };
  }
  const clash = existing.find((tag) => tag.id !== id && tag.name.toLowerCase() === name.toLowerCase());
  if (clash) {
    return { data: null, error: `There is already a tag called "${clash.name}".` };
  }

  const { data, error } = await supabase
    .from("tags")
    .update({ name })
    .eq("id", id)
    .select("id");

  if (error) {
    // 23505 = unique violation: another tag got this name at the same moment.
    return {
      data: null,
      error: error.code === "23505" ? `There is already a tag called "${name}".` : error.message,
    };
  }
  if (data.length === 0) {
    return { data: null, error: "This tag no longer exists." };
  }
  return { data: null, error: null };
}

/**
 * Deletes a tag. The database also removes it from every note
 * (note_tags rows go with it: ON DELETE CASCADE). The notes themselves stay.
 */
export async function deleteTag(id: number): Promise<Result<null>> {
  const supabase = await createClient();
  const { error } = await supabase.from("tags").delete().eq("id", id);

  if (error) {
    return { data: null, error: error.message };
  }
  return { data: null, error: null };
}

/**
 * Makes a note's tags exactly the given names:
 * 1. each name reuses an existing tag (ignoring upper/lower case) or creates it;
 * 2. note_tags rows are added for new pairs and removed for dropped ones.
 * Tags that end up on no note are kept, so they can be reused.
 */
export async function setNoteTags(noteId: number, names: string[]): Promise<Result<null>> {
  const supabase = await createClient();

  // Drop duplicates that differ only in case ("Work", "work").
  const wanted = new Map<string, string>();
  for (const name of names) {
    if (!wanted.has(name.toLowerCase())) wanted.set(name.toLowerCase(), name);
  }

  // 1. Find or create the tags.
  const { data: existing, error: readError } = await supabase.from("tags").select("id, name");
  if (readError) {
    return { data: null, error: readError.message };
  }
  const byName = new Map(existing.map((tag) => [tag.name.toLowerCase(), tag.id]));
  const missing = [...wanted].filter(([key]) => !byName.has(key)).map(([, name]) => ({ name }));
  if (missing.length > 0) {
    const { data: created, error } = await supabase.from("tags").insert(missing).select("id, name");
    if (error) {
      // 23505 = unique violation: the same tag was created at the same moment.
      return {
        data: null,
        error: error.code === "23505" ? "A tag was just created elsewhere; please save again." : error.message,
      };
    }
    for (const tag of created) byName.set(tag.name.toLowerCase(), tag.id);
  }
  const tagIds = [...wanted.keys()].map((key) => byName.get(key)!);

  // 2. Link and unlink.
  const { data: links, error: linkError } = await supabase
    .from("note_tags")
    .select("tag_id")
    .eq("note_id", noteId);
  if (linkError) {
    return { data: null, error: linkError.message };
  }
  const current = new Set(links.map((link) => link.tag_id as number));
  const toRemove = [...current].filter((id) => !tagIds.includes(id));
  const toAdd = tagIds.filter((id) => !current.has(id));

  if (toRemove.length > 0) {
    const { error } = await supabase
      .from("note_tags")
      .delete()
      .eq("note_id", noteId)
      .in("tag_id", toRemove);
    if (error) {
      return { data: null, error: error.message };
    }
  }
  if (toAdd.length > 0) {
    const { error } = await supabase
      .from("note_tags")
      .insert(toAdd.map((tag_id) => ({ note_id: noteId, tag_id })));
    if (error) {
      return { data: null, error: error.message };
    }
  }
  return { data: null, error: null };
}

function sortTags<T extends Tag>(tags: T[]): T[] {
  return [...tags].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

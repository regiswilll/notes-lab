// The single module for database access. Components and pages import from
// here and never call Supabase directly. Server-side only: it reads the
// request's cookies through the server Supabase client.
import { createClient } from "@/lib/supabase/server";

export type Note = {
  id: number;
  title: string;
  body: string | null;
};

type Result<T> = { data: T; error: null } | { data: null; error: string };

/** True when the current request belongs to a signed-in user. */
export async function isSignedIn(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return Boolean(data?.claims);
}

/** All notes, newest first. */
export async function getNotes(): Promise<Result<Note[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notes")
    .select("id, title, body")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }
  return { data, error: null };
}

import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";

async function NotesList() {
  const supabase = await createClient();

  // The notes table only lets signed-in users read it, so send everyone else to log in.
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) {
    redirect("/auth/login");
  }

  const { data: notes, error } = await supabase
    .from("notes")
    .select("id, title, body")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    return <p>Could not load notes: {error.message}</p>;
  }

  if (!notes.length) {
    return <p>No notes yet.</p>;
  }

  return (
    <ul>
      {notes.map((note) => (
        <li key={note.id}>
          <strong>{note.title}</strong>
          {note.body && `: ${note.body}`}
        </li>
      ))}
    </ul>
  );
}

export default function NotesPage() {
  return (
    <main>
      <h1>Notes</h1>
      <Suspense fallback={<p>Loading notes…</p>}>
        <NotesList />
      </Suspense>
    </main>
  );
}

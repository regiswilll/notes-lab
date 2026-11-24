import { redirect } from "next/navigation";
import { Suspense } from "react";

import { getNotes, isSignedIn } from "@/lib/db";

async function NotesList() {
  // The notes table only lets signed-in users read it, so send everyone else to log in.
  if (!(await isSignedIn())) {
    redirect("/auth/login");
  }

  const { data: notes, error } = await getNotes();

  if (error !== null) {
    return <p>Could not load notes: {error}</p>;
  }

  if (!notes.length) {
    return <p>No notes yet. Create your first note to see it here.</p>;
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

import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import {
  getCollections,
  getNote,
  getNotes,
  type Collection,
  type NoteSummary,
} from "@/lib/db";
import { cn } from "@/lib/utils";
import { NewCollectionButton } from "./_components/new-collection-button";
import { NewNoteButton } from "./_components/new-note-button";
import { NoteEditor } from "./_components/note-editor";
import { NoteGroup } from "./_components/note-group";

export const metadata: Metadata = { title: "Notes" };

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

// The selected note lives in the URL (/notes?id=5), so a reload keeps it open.
// With Cache Components, the URL and the database are request-time data, so
// they are read inside <Suspense> below rather than in the page itself.
export default function NotesPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    // Narrow screens: sidebar on top, whole page scrolls (no height cap, so no
    // note is hidden). From md up: side-by-side, each column scrolls on its own.
    <div className="flex min-h-dvh flex-col md:h-dvh md:flex-row">
      <Suspense fallback={<Shell sidebar={<Muted>Loading notes…</Muted>} main={null} />}>
        <NotesWorkspace searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function NotesWorkspace({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const selectedId = parseId(params.id);
  const savedId = parseId(params.saved);

  const [list, collections, selected] = await Promise.all([
    getNotes(),
    getCollections(),
    selectedId === null ? null : getNote(selectedId),
  ]);

  return (
    <Shell
      sidebar={
        list.error !== null ? (
          <ErrorText>Could not load notes: {list.error}</ErrorText>
        ) : collections.error !== null ? (
          <ErrorText>Could not load collections: {collections.error}</ErrorText>
        ) : list.data.length === 0 && collections.data.length === 0 ? (
          <Muted>No notes yet. Click “New note” to write your first one.</Muted>
        ) : (
          <GroupedNotes
            notes={list.data}
            collections={collections.data}
            selectedId={selectedId}
          />
        )
      }
      main={
        selected === null ? (
          <Centered>
            {savedTitle(list.data, savedId) && (
              <p role="status" className="mb-2 font-medium text-foreground">
                “{savedTitle(list.data, savedId)}” saved.
              </p>
            )}
            <p>
              {list.data?.length
                ? "Pick a note from the list, or create a new one."
                : "Your notes will appear here. Create one to get started."}
            </p>
          </Centered>
        ) : selected.error !== null ? (
          <Centered>
            <ErrorText>Could not load this note: {selected.error}</ErrorText>
          </Centered>
        ) : selected.data === null ? (
          <Centered>
            This note doesn’t exist any more. It may have been deleted.
          </Centered>
        ) : (
          // key: a different note gets a fresh editor with its own unsaved state.
          <NoteEditor
            key={selected.data.id}
            note={selected.data}
            collections={collections.data ?? []}
            lastSavedLabel={formatDate(selected.data.updated_at)}
          />
        )
      }
    />
  );
}

function Shell({ sidebar, main }: { sidebar: React.ReactNode; main: React.ReactNode }) {
  return (
    <>
      <aside className="flex shrink-0 flex-col border-b bg-muted/40 md:w-72 md:border-b-0 md:border-r">
        <div className="space-y-3 border-b p-4">
          <h1 className="text-lg font-semibold">Notes</h1>
          <NewNoteButton />
          <NewCollectionButton />
        </div>
        <div className="min-h-0 flex-1 p-2 md:overflow-y-auto">{sidebar}</div>
      </aside>
      <main className="flex min-h-[60dvh] min-w-0 flex-1 flex-col p-4 md:min-h-0 md:overflow-y-auto md:p-6">{main}</main>
    </>
  );
}

/**
 * One expandable group per collection (sorted by name), then "Uncollected"
 * for notes in no collection. Inside each group, notes stay newest-updated first.
 */
function GroupedNotes({
  notes,
  collections,
  selectedId,
}: {
  notes: NoteSummary[];
  collections: Collection[];
  selectedId: number | null;
}) {
  const byCollection = new Map<number, NoteSummary[]>(collections.map((c) => [c.id, []]));
  const uncollected: NoteSummary[] = [];
  for (const note of notes) {
    const group = note.collection_id === null ? undefined : byCollection.get(note.collection_id);
    if (group) group.push(note);
    else uncollected.push(note);
  }

  return (
    <div className="space-y-1">
      {collections.map((collection) => {
        const groupNotes = byCollection.get(collection.id) ?? [];
        return (
          <NoteGroup
            key={collection.id}
            collectionId={collection.id}
            name={collection.name}
            noteCount={groupNotes.length}
          >
            <GroupNotes
              notes={groupNotes}
              selectedId={selectedId}
              emptyText="No notes in this collection yet."
            />
          </NoteGroup>
        );
      })}
      <NoteGroup name="Uncollected" noteCount={uncollected.length}>
        <GroupNotes
          notes={uncollected}
          selectedId={selectedId}
          emptyText="Every note is in a collection."
        />
      </NoteGroup>
    </div>
  );
}

function GroupNotes({
  notes,
  selectedId,
  emptyText,
}: {
  notes: NoteSummary[];
  selectedId: number | null;
  emptyText: string;
}) {
  return notes.length === 0 ? (
    <Muted>{emptyText}</Muted>
  ) : (
    <NoteList notes={notes} selectedId={selectedId} />
  );
}

function NoteList({ notes, selectedId }: { notes: NoteSummary[]; selectedId: number | null }) {
  return (
    <ul className="space-y-1">
      {notes.map((note) => {
        const active = note.id === selectedId;
        return (
          <li
            key={note.id}
            className={cn(
              "flex items-center rounded-md transition-colors hover:bg-accent",
              active && "bg-accent",
            )}
          >
            <Link
              href={`/notes?id=${note.id}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "min-w-0 flex-1 rounded-md px-3 py-2 text-sm",
                active && "font-medium",
              )}
            >
              <span className={cn("block truncate", !note.title.trim() && "italic text-muted-foreground")}>
                {note.title.trim() || "No title yet"}
              </span>
              <span className="block text-xs text-muted-foreground">
                {formatDate(note.updated_at)}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <p className="px-3 py-2 text-sm text-muted-foreground">{children}</p>;
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="px-3 py-2 text-sm text-destructive">
      {children}
    </p>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

/** Title of the note that was just saved, if it is still in the list. */
function savedTitle(notes: NoteSummary[] | null, savedId: number | null) {
  return notes?.find((n) => n.id === savedId)?.title ?? null;
}

function parseId(value: string | string[] | undefined): number | null {
  const id = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

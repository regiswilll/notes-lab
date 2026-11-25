import { Check, Tags } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import {
  getCollections,
  getNote,
  getNotes,
  getTags,
  type Collection,
  type NoteSummary,
  type Tag,
} from "@/lib/db";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NewCollectionButton } from "./_components/new-collection-button";
import { NewNoteButton } from "./_components/new-note-button";
import { NoteEditor } from "./_components/note-editor";
import { NoteGroup } from "./_components/note-group";
import { TagManager } from "./_components/tag-manager";

export const metadata: Metadata = { title: "Notes" };

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

// The selected note, the tag filter and the tags list live in the URL
// (/notes?id=5&tags=1,3, /notes?view=tags), so a reload keeps them.
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
  // "Tags" in the sidebar shows the tags list where the editor normally is.
  const showTags = params.view === "tags";

  const [collections, tags, selected] = await Promise.all([
    getCollections(),
    getTags(),
    selectedId === null ? null : getNote(selectedId),
  ]);
  // Tags picked in the filter; ids of tags that no longer exist are ignored.
  const filterIds = parseIdList(params.tags).filter((id) =>
    tags.data?.some((tag) => tag.id === id),
  );
  const filter = filterIds.join(",");
  const list = await getNotes(filterIds);

  const saved = savedId === null ? null : savedTitle(list.data, savedId);

  return (
    <Shell
      filterIds={filterIds}
      showTags={showTags}
      sidebar={
        <div className="space-y-3">
          {tags.error !== null ? (
            <ErrorText>Could not load tags: {tags.error}</ErrorText>
          ) : (
            <TagFilter
              tags={tags.data}
              selectedIds={filterIds}
              openId={selectedId}
              view={showTags ? "tags" : undefined}
            />
          )}
          {list.error !== null ? (
            <ErrorText>Could not load notes: {list.error}</ErrorText>
          ) : collections.error !== null ? (
            <ErrorText>Could not load collections: {collections.error}</ErrorText>
          ) : filterIds.length > 0 && list.data.length === 0 ? (
            <Muted>No notes have all of these tags.</Muted>
          ) : list.data.length === 0 && collections.data.length === 0 ? (
            <Muted>No notes yet. Click “New note” to write your first one.</Muted>
          ) : (
            <GroupedNotes
              notes={list.data}
              collections={collections.data}
              selectedId={selectedId}
              filterIds={filterIds}
            />
          )}
        </div>
      }
      main={
        showTags ? (
          tags.error !== null ? (
            <Centered>
              <ErrorText>Could not load tags: {tags.error}</ErrorText>
            </Centered>
          ) : (
            <TagManager tags={tags.data} closeHref={notesHref(null, filterIds)} />
          )
        ) : selected === null ? (
          <Centered>
            {saved && (
              <p role="status" className="mb-2 font-medium text-foreground">
                “{saved}” saved.
              </p>
            )}
            {savedId !== null && !saved && filterIds.length > 0 && (
              <p role="status" className="mb-2 font-medium text-foreground">
                Note saved. It doesn’t have all the selected tags, so the filter hides it.
              </p>
            )}
            <p>
              {list.data?.length
                ? "Pick a note from the list, or create a new one."
                : filterIds.length > 0
                  ? "Change or clear the tag filter to see more notes."
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
            allTags={tags.data ?? []}
            filter={filter}
            lastSavedLabel={formatDate(selected.data.updated_at)}
          />
        )
      }
    />
  );
}

function Shell({
  sidebar,
  main,
  filterIds = [],
  showTags = false,
}: {
  sidebar: React.ReactNode;
  main: React.ReactNode;
  filterIds?: number[];
  /** The tags list is open in the main area. */
  showTags?: boolean;
}) {
  return (
    <>
      <aside className="flex shrink-0 flex-col border-b bg-muted/40 md:w-72 md:border-b-0 md:border-r">
        <div className="space-y-3 border-b p-4">
          <h1 className="text-lg font-semibold">Notes</h1>
          <NewNoteButton filter={filterIds.join(",")} />
          <NewCollectionButton />
          {/* Opens the tags list in the main area; clicking again closes it. */}
          <Link
            href={showTags ? notesHref(null, filterIds) : notesHref(null, filterIds, "tags")}
            aria-current={showTags ? "page" : undefined}
            className={cn(buttonVariants({ variant: showTags ? "secondary" : "outline" }), "w-full")}
          >
            <Tags />
            Tags
          </Link>
        </div>
        <div className="min-h-0 flex-1 p-2 md:overflow-y-auto">{sidebar}</div>
      </aside>
      <main className="flex min-h-[60dvh] min-w-0 flex-1 flex-col p-4 md:min-h-0 md:overflow-y-auto md:p-6">{main}</main>
    </>
  );
}

/**
 * Tag filter: every tag as a pill; click to add it to or remove it from the
 * filter. Each pill is a link to the filtered URL, so it works without JS.
 * With several tags selected, only notes that have ALL of them are shown.
 */
function TagFilter({
  tags,
  selectedIds,
  openId,
  view,
}: {
  tags: Tag[];
  selectedIds: number[];
  openId: number | null;
  /** Keep the tags list open while changing the filter. */
  view?: "tags";
}) {
  return (
    <section aria-labelledby="tag-filter-heading" className="px-2 pt-1">
      <div className="flex items-center justify-between gap-2">
        <h2
          id="tag-filter-heading"
          className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          Filter by tags
        </h2>
        {selectedIds.length > 0 && (
          <Link
            href={notesHref(openId, [], view)}
            className="rounded text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Clear
          </Link>
        )}
      </div>
      {tags.length === 0 ? (
        <p className="py-1 text-xs text-muted-foreground">
          No tags yet. Add tags to a note in the editor.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-1.5 pt-2">
          {tags.map((tag) => {
            const on = selectedIds.includes(tag.id);
            const next = on
              ? selectedIds.filter((id) => id !== tag.id)
              : [...selectedIds, tag.id];
            return (
              <li key={tag.id}>
                <Link
                  href={notesHref(openId, next, view)}
                  title={on ? "Remove from filter" : "Add to filter"}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                    on
                      ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {on && <Check className="h-3 w-3" aria-hidden />}
                  {tag.name}
                  {on && <span className="sr-only"> (selected)</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {selectedIds.length > 1 && (
        <p className="pt-1.5 text-xs text-muted-foreground">
          Showing notes that have all {selectedIds.length} tags.
        </p>
      )}
    </section>
  );
}

/**
 * One expandable group per collection (sorted by name), then "Uncollected"
 * for notes in no collection. Inside each group, notes stay newest-updated first.
 * While filtering by tags, groups with no matching notes are left out.
 */
function GroupedNotes({
  notes,
  collections,
  selectedId,
  filterIds,
}: {
  notes: NoteSummary[];
  collections: Collection[];
  selectedId: number | null;
  filterIds: number[];
}) {
  const filtering = filterIds.length > 0;
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
        if (filtering && groupNotes.length === 0) return null;
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
              filterIds={filterIds}
              emptyText="No notes in this collection yet."
            />
          </NoteGroup>
        );
      })}
      {!(filtering && uncollected.length === 0) && (
        <NoteGroup name="Uncollected" noteCount={uncollected.length}>
          <GroupNotes
            notes={uncollected}
            selectedId={selectedId}
            filterIds={filterIds}
            emptyText="Every note is in a collection."
          />
        </NoteGroup>
      )}
    </div>
  );
}

function GroupNotes({
  notes,
  selectedId,
  filterIds,
  emptyText,
}: {
  notes: NoteSummary[];
  selectedId: number | null;
  filterIds: number[];
  emptyText: string;
}) {
  return notes.length === 0 ? (
    <Muted>{emptyText}</Muted>
  ) : (
    <NoteList notes={notes} selectedId={selectedId} filterIds={filterIds} />
  );
}

function NoteList({
  notes,
  selectedId,
  filterIds,
}: {
  notes: NoteSummary[];
  selectedId: number | null;
  filterIds: number[];
}) {
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
              href={notesHref(note.id, filterIds)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-w-0 flex-1 items-center gap-2 rounded-md px-3 py-2 text-sm",
                active && "font-medium",
              )}
            >
              <span className="min-w-0 flex-1">
                <span className={cn("block truncate", !note.title.trim() && "italic text-muted-foreground")}>
                  {note.title.trim() || "No title yet"}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {formatDate(note.updated_at)}
                </span>
              </span>
              {/* Tags on the right of the card, wrapping if there are many. */}
              {note.tags.length > 0 && (
                <span
                  className="flex max-w-[50%] shrink-0 flex-wrap justify-end gap-1"
                  aria-label="Tags"
                >
                  {note.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="rounded-full bg-secondary px-2 py-px text-[11px] font-normal text-secondary-foreground"
                    >
                      {tag.name}
                    </span>
                  ))}
                </span>
              )}
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

/** "1,3" -> [1, 3]; anything that isn't an id is skipped. */
function parseIdList(value: string | string[] | undefined): number[] {
  const text = Array.isArray(value) ? value[0] : value;
  const ids = (text ?? "")
    .split(",")
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0);
  return [...new Set(ids)];
}

/** Link to /notes with an open note, a tag filter and/or the tags list. */
function notesHref(id: number | null, tagIds: number[], view?: "tags") {
  const parts: string[] = [];
  if (id !== null) parts.push(`id=${id}`);
  if (tagIds.length > 0) parts.push(`tags=${[...tagIds].sort((a, b) => a - b).join(",")}`);
  if (view) parts.push(`view=${view}`);
  return parts.length ? `/notes?${parts.join("&")}` : "/notes";
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

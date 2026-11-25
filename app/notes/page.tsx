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
import { SearchBox } from "./_components/search-box";
import { TagManager } from "./_components/tag-manager";
import { notesHref, parseSearch, parseTagIds, type ListState } from "./list-state";

export const metadata: Metadata = { title: "Notes" };

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

// The selected note, the tag filter, the search and the tags list live in the
// URL (/notes?id=5&tags=1,3&q=plan, /notes?view=tags), so a reload keeps them.
// With Cache Components, the URL and the database are request-time data, so
// they are read inside <Suspense> below rather than in the page itself.
export default function NotesPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    // Narrow screens: sidebar on top, whole page scrolls (no height cap, so no
    // note is hidden). From md up: side-by-side, each column scrolls on its own.
    <div className="flex min-h-dvh flex-col md:h-dvh md:flex-row">
      <Suspense
        fallback={
          <Shell sidebar={<Muted>Loading notes…</Muted>} main={<Centered>Loading…</Centered>} />
        }
      >
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
  const filterIds = parseTagIds(params.tags).filter((id) =>
    tags.data?.some((tag) => tag.id === id),
  );
  const search = parseSearch(params.q);
  const listState: ListState = { tags: filterIds, q: search };
  // Search runs inside the tag filter: notes with all selected tags AND the text.
  const list = await getNotes({ tagIds: filterIds, search });
  const narrowed = filterIds.length > 0 || search !== "";

  const saved = savedId === null ? null : savedTitle(list.data, savedId);

  const pickNote = (
    <p>
      {list.data?.length
        ? "Pick a note from the list, or create a new one."
        : narrowed
          ? "Change or clear the search or tag filter to see more notes."
          : "Your notes will appear here. Create one to get started."}
    </p>
  );
  const tagList = (headingId: string) =>
    tags.error !== null ? (
      <ErrorText>Could not load tags: {tags.error}</ErrorText>
    ) : (
      <TagManager tags={tags.data} closeHref={notesHref(listState)} headingId={headingId} />
    );

  return (
    <Shell
      listState={listState}
      openId={selectedId}
      showTags={showTags}
      // Small screens: the tags list goes just below the Tags button, above
      // the notes (the main area is below all the notes there).
      tagsBelowButton={showTags ? tagList("tags-heading-small") : null}
      // Small screens: an open note's editor goes above the notes too.
      editorOpen={!showTags && selected !== null}
      sidebar={
        <div className="space-y-3">
          {tags.error !== null ? (
            <ErrorText>Could not load tags: {tags.error}</ErrorText>
          ) : (
            <TagFilter
              tags={tags.data}
              listState={listState}
              openId={selectedId}
              view={showTags ? "tags" : undefined}
            />
          )}
          {list.error !== null ? (
            <ErrorText>Could not load notes: {list.error}</ErrorText>
          ) : collections.error !== null ? (
            <ErrorText>Could not load collections: {collections.error}</ErrorText>
          ) : search !== "" && list.data.length === 0 ? (
            <Muted>
              No notes match your search.
              {filterIds.length > 0 && (
                <span className="mt-1 block text-xs">
                  Only notes with all the selected tags are searched.
                </span>
              )}
            </Muted>
          ) : filterIds.length > 0 && list.data.length === 0 ? (
            <Muted>No notes have all of these tags.</Muted>
          ) : list.data.length === 0 && collections.data.length === 0 ? (
            <Muted>No notes yet. Click “New note” to write your first one.</Muted>
          ) : (
            <GroupedNotes
              notes={list.data}
              collections={collections.data}
              selectedId={selectedId}
              listState={listState}
            />
          )}
        </div>
      }
      main={
        showTags ? (
          <>
            {/* Wide screens: the tags list on the right, as before. */}
            <div className="hidden md:flex md:flex-1 md:flex-col">{tagList("tags-heading")}</div>
            {/* Small screens: the list is in the sidebar, so show the usual message here. */}
            <div className="flex flex-1 flex-col md:hidden">
              <Centered>{pickNote}</Centered>
            </div>
          </>
        ) : selected === null ? (
          <Centered>
            {saved && (
              <p role="status" className="mb-2 font-medium text-foreground">
                “{saved}” saved.
              </p>
            )}
            {savedId !== null && !saved && narrowed && (
              <p role="status" className="mb-2 font-medium text-foreground">
                Note saved. It doesn’t match the current search or tag filter, so it’s hidden.
              </p>
            )}
            {pickNote}
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
            listState={listState}
            lastSavedLabel={formatDate(selected.data.updated_at)}
          />
        )
      }
    />
  );
}

const noFilter: ListState = { tags: [], q: "" };

function Shell({
  sidebar,
  main,
  listState,
  openId = null,
  showTags = false,
  tagsBelowButton = null,
  editorOpen = false,
}: {
  sidebar: React.ReactNode;
  main: React.ReactNode;
  /** Tag filter and search; left out while the page is loading. */
  listState?: ListState;
  openId?: number | null;
  /** The tags list is open. */
  showTags?: boolean;
  /** The tags list, shown under the Tags button on small screens only. */
  tagsBelowButton?: React.ReactNode;
  /** A note is open: on small screens the main area moves above the notes. */
  editorOpen?: boolean;
}) {
  const state = listState ?? noFilter;
  return (
    <>
      {/*
        Small screens: <aside> is "display: contents", so its two parts (the
        header and the notes list) and <main> are stacked by the page and can
        be reordered with "order": header, then the open note's editor, then
        the notes. Wide screens (md+): sidebar on the left, main on the right,
        exactly as before.
      */}
      <aside className="contents md:flex md:w-72 md:shrink-0 md:flex-col md:border-r md:bg-muted/40">
        <div className="order-1 space-y-3 border-b bg-muted/40 p-4 md:bg-transparent">
          <h1 className="text-lg font-semibold">Notes</h1>
          <SearchBox
            q={state.q}
            openId={openId}
            tags={state.tags}
            view={showTags ? "tags" : undefined}
            disabled={!listState}
          />
          <NewNoteButton listState={state} />
          <NewCollectionButton />
          {/* Opens the tags list (on the right; under this button on small
              screens); clicking again closes it. */}
          <Link
            href={showTags ? notesHref(state) : notesHref({ ...state, view: "tags" })}
            aria-current={showTags ? "page" : undefined}
            className={cn(buttonVariants({ variant: showTags ? "secondary" : "outline" }), "w-full")}
          >
            <Tags />
            Tags
          </Link>
          {tagsBelowButton && <div className="pt-2 md:hidden">{tagsBelowButton}</div>}
        </div>
        <div className="order-3 border-b bg-muted/40 p-2 md:min-h-0 md:flex-1 md:overflow-y-auto md:border-b-0 md:bg-transparent">
          {sidebar}
        </div>
      </aside>
      <main
        className={cn(
          "flex min-h-[60dvh] min-w-0 flex-1 flex-col p-4 md:order-none md:min-h-0 md:overflow-y-auto md:border-b-0 md:p-6",
          editorOpen ? "order-2 border-b" : "order-4",
        )}
      >
        {main}
      </main>
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
  listState,
  openId,
  view,
}: {
  tags: Tag[];
  /** Current tag filter and search (the search is kept when tags change). */
  listState: ListState;
  openId: number | null;
  /** Keep the tags list open while changing the filter. */
  view?: "tags";
}) {
  const selectedIds = listState.tags;
  const href = (tagIds: number[]) =>
    notesHref({ id: openId, tags: tagIds, q: listState.q, view });
  return (
    <section aria-labelledby="tag-filter-heading" className="px-2 pt-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
          <h2
            id="tag-filter-heading"
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Filter by tags
          </h2>
          {/* Hint: new tags are created from the note editor, not here. */}
          <span className="text-[11px] text-muted-foreground">add new tag in the note</span>
        </div>
        {selectedIds.length > 0 && (
          <Link
            href={href([])}
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
                  href={href(next)}
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
 * While searching or filtering by tags, groups with no matching notes are left out.
 */
function GroupedNotes({
  notes,
  collections,
  selectedId,
  listState,
}: {
  notes: NoteSummary[];
  collections: Collection[];
  selectedId: number | null;
  listState: ListState;
}) {
  const filtering = listState.tags.length > 0 || listState.q !== "";
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
              listState={listState}
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
            listState={listState}
            emptyText={
              notes.length === 0
                ? "No notes yet. Click “New note” to write your first one."
                : "Every note is in a collection."
            }
          />
        </NoteGroup>
      )}
    </div>
  );
}

function GroupNotes({
  notes,
  selectedId,
  listState,
  emptyText,
}: {
  notes: NoteSummary[];
  selectedId: number | null;
  listState: ListState;
  emptyText: string;
}) {
  return notes.length === 0 ? (
    <Muted>{emptyText}</Muted>
  ) : (
    <NoteList notes={notes} selectedId={selectedId} listState={listState} />
  );
}

function NoteList({
  notes,
  selectedId,
  listState,
}: {
  notes: NoteSummary[];
  selectedId: number | null;
  listState: ListState;
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
              href={notesHref({ id: note.id, ...listState })}
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

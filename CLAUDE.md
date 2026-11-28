@AGENTS.md

# notes-lab

## What the app is
A personal notes app with collections, tags and search. It runs locally with `npm run dev`.

Every signed-in-only page must verify the user's session with the Supabase Auth server before it loads, and redirect to the sign-in page if the user is not signed in. Do not rely on the browser-side session alone.

## Stack
- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase via the `supabase-js` client

## Database work
- Do NOT use the Supabase MCP server. Use the Supabase CLI (`npx supabase`) for all database work.
- Tables: `notes`, `collections`, `tags`, `note_tags`. The schema is described in `docs/supabase-schema.md`.
- Every schema change goes in a migration file (`npx supabase migration new <name>`), never edited directly in the Supabase dashboard.

## Credentials
- Credentials come only from `.env.local`: `NEXT_PUBLIC_SUPABASE_URL` and the publishable/anon key.
- Never hard-code them.

## Auth & per-user data rules
- Every table holding user data (notes, collections, tags, note_tags) has a user_id column (uuid, references auth.users, default auth.uid()) and RLS enabled.
- All schema changes are made as migration files in supabase/migrations and applied with the Supabase CLI (supabase db push). Never edit the schema by hand in the dashboard.
- All data access still goes through app/lib/db.ts, using the @supabase/ssr client so requests carry the signed-in user's session.
- Never store user data in localStorage or sessionStorage.
- Every page under /workspace checks the user on the server and redirects to the sign-in page if there is no user.

## Data access
- Every database table read and write goes through ONE helper module: `lib/db.ts`. Components and pages never query tables with Supabase directly.
- `lib/db.ts` currently has:
  - Notes: `getNotes({ tagIds, search })` (only notes with ALL the given tags; `search` matches title OR body, not case-sensitive), `getNote(id)`, `createNote()`, `updateNote(id, { title, body, collection_id })`, `deleteNote(id)` and `deleteNoteIfNeverSaved(id)`
  - Collections: `getCollections()`, `createCollection(name)`, `renameCollection(id, name)` and `deleteCollection(id)`
  - Tags: `getTags()` (with each tag's note count), `setNoteTags(noteId, names)` (reuses or creates tags, then links/unlinks them in `note_tags`), `renameTag(id, name)`, `setTagColor(id, color)` and `deleteTag(id)`

  Each returns `{ data, error }`.
- Client Components change data through Server Actions (e.g. `app/workspace/actions.ts`), which call `lib/db.ts`.
- `lib/db.ts` is server-only: it uses the server Supabase client and request cookies. Import it only from Server Components, Server Actions (`"use server"` files) and Route Handlers, never from a `"use client"` component.
- Auth is not in `lib/db.ts` yet. These files still call Supabase auth directly, through the clients in `lib/supabase/`:
  - Client Components: `login-form`, `sign-up-form`, `forgot-password-form`, `update-password-form`, `logout-button` (in `components/`)
  - Server code: `components/auth-button.tsx`, `app/auth/confirm/route.ts`
  - `proxy.ts` (via `lib/supabase/proxy.ts`) refreshes the session on each request, and sends logged-out visitors to the login page except on `/` and `/auth/*`
  - `/` is only a landing page: on the server it sends signed-in users to `/workspace` and everyone else to `/auth/login`.
  - `/workspace` is the notes app, signed-in only: sign-in and sign-up land there, and sign-out goes back to `/auth/login`. Every page under it calls `requireUser()` (`lib/supabase/require-user.ts`, which uses `getClaims()`) inside `<Suspense>` before rendering, and so does every Server Action in `app/workspace/actions.ts`. This is the real check; `proxy.ts` redirecting signed-out visitors is only a first layer, and the layout is not a check (it isn't re-run on every navigation). Never use `getSession()` for this on the server.
  - `/notes` (the old address) redirects to `/workspace`, keeping the query (`next.config.ts`).
  Leave them as they are unless a task is about auth.

## Notes app (`app/workspace/`)
- `page.tsx` is a Server Component: it reads the URL, loads data through `lib/db.ts` and renders the sidebar and the main area. `layout.tsx` adds the header (the user's e-mail and Sign out). Client pieces live in `app/workspace/_components/`; data changes go through `app/workspace/actions.ts`.
- `cacheComponents` is on (`next.config.ts`): request-time data (URL search params, cookies, database reads) is read inside `<Suspense>`.
- Page state lives in the URL, so a reload keeps it:
  - `?id=5`: the open note
  - `?saved=5`: the "saved" message
  - `?tags=1,3`: the tag filter
  - `?q=text`: the search
  - `?view=tags`: the tags list
- Build these URLs with `notesHref()` from `app/workspace/list-state.ts`. Forms send the tag filter and search as hidden fields (`ListStateFields`), so Server Action redirects keep them.
- Sidebar layout, top to bottom:
  - The search box
  - The New note, New collection and Tags buttons
  - The tag filter
  - The notes, grouped by collection, then "Uncollected"
- Small screens (below the `md` breakpoint): the tags list and an open note's editor appear just below the Tags button, above the notes. Wide screens: they appear in the main area on the right.

## Behaviour to keep
- **New notes:**
  - "New note" creates a note with a blank title straight away.
  - Saving requires a title.
  - Cancel on a never-saved note deletes it.
- **Saving:** Save stores the title, body, collection and tags together; the tags are written after the note, in a separate step.
- **Tag filter:** shows only notes that have ALL the selected tags, not any of them.
- **Search:** matches title OR body, not case-sensitive, and only within the tag filter. User text is matched literally (`%`, `_`, `*`, quotes, commas).
- **Tag names:** unique ignoring upper/lower case, so typing "work" reuses "Work". New tags are only created when a note is saved.
- **Deleting:**
  - Deleting a collection moves its notes to "Uncollected".
  - Deleting a tag removes it from its notes.
  - Neither deletes notes.
- **Tag colours:**
  - Each tag has one of 8 palette colours (`tags.color`).
  - The palette and its Tailwind classes live in `lib/tag-colors.ts`. (The SQL comment in migration `20261125091038_tags_color.sql` says `app/notes/tag-colors.ts`; that path is wrong. Migration `20261125094658_tags_color_comment.sql` puts the right path in the column comment.)
  - `lib/tag-colors.ts` is used by the browser too (the editor and the Tags list), so it must not import server-only code (`lib/db.ts`, `lib/supabase/server`, `next/headers`). Keep it to constants and pure functions.
  - The 8 colour names are listed in 5 places, which must always match:
    - `TAG_COLORS` in `lib/tag-colors.ts`
    - the database check `tags_color_check`
    - the comment on the `tags.color` column
    - the `tags` table in `docs/supabase-schema.md`
    - the backfill list in migration `20261125091038`, which has already run and is never edited
  - To add, remove or rename a colour, change all of these together:
    - Make a new migration (`npx supabase migration new <name>`). It drops and re-adds `tags_color_check` with the new list, and updates the column comment.
    - Before removing or renaming a colour, the migration first moves tags that use it to a colour that stays.
    - Update `TAG_COLORS` and the colour classes in `TAG_COLOR_CLASSES`, written out in full so Tailwind finds them.
    - Update `docs/supabase-schema.md`.
  - If the lists drift apart: a colour only in the app is rejected by the database, and a colour only in the database is shown as blue.
  - New tags get the least-used colour. The colour can be changed in the Tags list.
  - Colours show on note cards, in the tag filter (soft when not selected, strong when selected), in the editor chips and in the Tags list.
- **Length limits:** collection name 100 characters, tag name 50, 20 tags per note, search 100.

## Workflow
- Build one feature at a time, on its own git branch.
- Do not add new libraries without asking first.
- Before committing, run `npx tsc --noEmit -p .` and `npx eslint app lib`. There is no automated test suite yet; check changes in the browser with `npm run dev`.

## UI
- No screen is ever blank: every empty list, empty collection, search or filter with no results, and loading state shows a friendly message.
- Note editor: ANY change in the editor (title, body, collection, tags, even text typed in the tag box) must enable the Save button, and Save must store it. Cancel discards it. Keep this for every field added later.

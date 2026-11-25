@AGENTS.md

# notes-lab

## What the app is
A personal notes app with collections, tags and search. It runs locally with `npm run dev`.

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

## Data access
- Every database table read and write goes through ONE helper module: `lib/db.ts`. Components and pages never query tables with Supabase directly.
- `lib/db.ts` currently has:
  - Notes: `getNotes(tagIds?)` (only notes with ALL the given tags), `getNote(id)`, `createNote()`, `updateNote(id, { title, body, collection_id })`, `deleteNote(id)` and `deleteNoteIfNeverSaved(id)`
  - Collections: `getCollections()`, `createCollection(name)`, `renameCollection(id, name)` and `deleteCollection(id)`
  - Tags: `getTags()` (with each tag's note count), `setNoteTags(noteId, names)` (reuses or creates tags, then links/unlinks them in `note_tags`), `renameTag(id, name)` and `deleteTag(id)`

  Each returns `{ data, error }`.
- Client Components change data through Server Actions (e.g. `app/notes/actions.ts`), which call `lib/db.ts`.
- `lib/db.ts` is server-only: it uses the server Supabase client and request cookies. Import it only from Server Components, Server Actions (`"use server"` files) and Route Handlers, never from a `"use client"` component.
- Auth is not in `lib/db.ts` yet. These files still call Supabase auth directly, through the clients in `lib/supabase/`:
  - Client Components: `login-form`, `sign-up-form`, `forgot-password-form`, `update-password-form`, `logout-button` (in `components/`)
  - Server code: `components/auth-button.tsx`, `app/protected/page.tsx`, `app/auth/confirm/route.ts`
  - `proxy.ts` (via `lib/supabase/proxy.ts`) refreshes the session on each request, and sends logged-out visitors to the login page except on `/`, `/auth/*` and `/notes` (open for now, no login needed)
  Leave them as they are unless a task is about auth.

## Workflow
- Build one feature at a time, on its own git branch.
- Do not add new libraries without asking first.

## UI
- Whenever a list is empty, show a friendly message instead of a blank screen.
- Note editor: ANY change in the editor (title, body, collection, tags, even text typed in the tag box) must enable the Save button, and Save must store it. Cancel discards it. Keep this for every field added later.

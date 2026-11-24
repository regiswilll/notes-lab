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

## Credentials
- Credentials come only from `.env.local`: `NEXT_PUBLIC_SUPABASE_URL` and the publishable/anon key.
- Never hard-code them.

## Data access
- Every database read and write goes through ONE helper module: `lib/db.ts`.
- Components never call Supabase directly.

## Workflow
- Build one feature at a time, on its own git branch.
- Do not add new libraries without asking first.

## UI
- Whenever a list is empty, show a friendly message instead of a blank screen.

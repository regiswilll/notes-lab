-- Open access to notes, collections, tags and note_tags for the app,
-- and keep notes.updated_at current with a trigger.
--
-- TEMPORARY: OPEN ACCESS. There is no login-based ownership yet, so every
-- policy below allows any visitor (anon) or signed-in user (authenticated)
-- to read and change ALL rows. This will be tightened when we add
-- authentication: add a user_id column to the tables and replace these
-- policies with ones that check (select auth.uid()) = user_id.

-- ---------------------------------------------------------------------------
-- 1. Row Level Security stays ON (already enabled; repeated here to be safe)
-- ---------------------------------------------------------------------------
alter table public.notes       enable row level security;
alter table public.collections enable row level security;
alter table public.tags        enable row level security;
alter table public.note_tags   enable row level security;

-- ---------------------------------------------------------------------------
-- 2. Data API grants: let the anon and authenticated roles reach the tables.
--    (RLS policies below then decide which rows they may touch.)
-- ---------------------------------------------------------------------------
grant select, insert, update, delete
  on table public.notes, public.collections, public.tags, public.note_tags
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Remove the old collections policies. They were named after "notes"
--    and only let signed-in users write; the open policies replace them.
-- ---------------------------------------------------------------------------
drop policy if exists "Anyone can read notes"            on public.collections;
drop policy if exists "Signed-in users can view notes"   on public.collections;
drop policy if exists "Signed-in users can create notes" on public.collections;
drop policy if exists "Signed-in users can update notes" on public.collections;
drop policy if exists "Signed-in users can delete notes" on public.collections;

-- ---------------------------------------------------------------------------
-- 4. Open policies (TEMPORARY, see note at top): one per action per table.
-- ---------------------------------------------------------------------------

-- notes
create policy "notes: open select (temporary)" on public.notes
  for select to anon, authenticated using (true);
create policy "notes: open insert (temporary)" on public.notes
  for insert to anon, authenticated with check (true);
create policy "notes: open update (temporary)" on public.notes
  for update to anon, authenticated using (true) with check (true);
create policy "notes: open delete (temporary)" on public.notes
  for delete to anon, authenticated using (true);

-- collections
create policy "collections: open select (temporary)" on public.collections
  for select to anon, authenticated using (true);
create policy "collections: open insert (temporary)" on public.collections
  for insert to anon, authenticated with check (true);
create policy "collections: open update (temporary)" on public.collections
  for update to anon, authenticated using (true) with check (true);
create policy "collections: open delete (temporary)" on public.collections
  for delete to anon, authenticated using (true);

-- tags
create policy "tags: open select (temporary)" on public.tags
  for select to anon, authenticated using (true);
create policy "tags: open insert (temporary)" on public.tags
  for insert to anon, authenticated with check (true);
create policy "tags: open update (temporary)" on public.tags
  for update to anon, authenticated using (true) with check (true);
create policy "tags: open delete (temporary)" on public.tags
  for delete to anon, authenticated using (true);

-- note_tags
create policy "note_tags: open select (temporary)" on public.note_tags
  for select to anon, authenticated using (true);
create policy "note_tags: open insert (temporary)" on public.note_tags
  for insert to anon, authenticated with check (true);
create policy "note_tags: open update (temporary)" on public.note_tags
  for update to anon, authenticated using (true) with check (true);
create policy "note_tags: open delete (temporary)" on public.note_tags
  for delete to anon, authenticated using (true);

-- ---------------------------------------------------------------------------
-- 5. Keep notes.updated_at current on every update.
--    SECURITY INVOKER (the default) and an empty search_path; now() lives in
--    pg_catalog, which is always searched.
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists notes_set_updated_at on public.notes;
create trigger notes_set_updated_at
  before update on public.notes
  for each row
  execute function public.set_updated_at();

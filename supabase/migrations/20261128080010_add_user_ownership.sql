-- Tie every row of user data to a user, and let each signed-in user see and
-- change only their own rows.
--
-- Tables: notes, collections, tags, note_tags.
-- Existing rows are given to the first test user (tongjw@live.com).

-- ---------------------------------------------------------------------------
-- 1) user_id column: points to auth.users, deleted with the user.
--    Added without a default first, so existing rows start empty and are
--    filled in step 2.
-- ---------------------------------------------------------------------------
alter table public.notes       add column user_id uuid references auth.users (id) on delete cascade;
alter table public.collections add column user_id uuid references auth.users (id) on delete cascade;
alter table public.tags        add column user_id uuid references auth.users (id) on delete cascade;
alter table public.note_tags   add column user_id uuid references auth.users (id) on delete cascade;

-- ---------------------------------------------------------------------------
-- 2) Give all existing rows to the first test user.
-- ---------------------------------------------------------------------------
update public.notes       set user_id = 'a18f6a1b-deb3-4805-9c1f-7ae0a37feb58' where user_id is null;
update public.collections set user_id = 'a18f6a1b-deb3-4805-9c1f-7ae0a37feb58' where user_id is null;
update public.tags        set user_id = 'a18f6a1b-deb3-4805-9c1f-7ae0a37feb58' where user_id is null;
update public.note_tags   set user_id = 'a18f6a1b-deb3-4805-9c1f-7ae0a37feb58' where user_id is null;

-- ---------------------------------------------------------------------------
-- 3) Make user_id required, and fill it with the signed-in user's ID on insert.
-- ---------------------------------------------------------------------------
alter table public.notes       alter column user_id set not null, alter column user_id set default auth.uid();
alter table public.collections alter column user_id set not null, alter column user_id set default auth.uid();
alter table public.tags        alter column user_id set not null, alter column user_id set default auth.uid();
alter table public.note_tags   alter column user_id set not null, alter column user_id set default auth.uid();

-- Indexes for the policies below (tags is covered by its unique index in step 5).
create index notes_user_id_idx       on public.notes (user_id);
create index collections_user_id_idx on public.collections (user_id);
create index note_tags_user_id_idx   on public.note_tags (user_id);

-- ---------------------------------------------------------------------------
-- 4) Row Level Security: own rows only.
--    Drop the temporary open policies (anyone, even signed out, could read
--    and change every row), then add per-user policies for signed-in users.
-- ---------------------------------------------------------------------------
alter table public.notes       enable row level security;
alter table public.collections enable row level security;
alter table public.tags        enable row level security;
alter table public.note_tags   enable row level security;

drop policy "notes: open select (temporary)" on public.notes;
drop policy "notes: open insert (temporary)" on public.notes;
drop policy "notes: open update (temporary)" on public.notes;
drop policy "notes: open delete (temporary)" on public.notes;
drop policy "collections: open select (temporary)" on public.collections;
drop policy "collections: open insert (temporary)" on public.collections;
drop policy "collections: open update (temporary)" on public.collections;
drop policy "collections: open delete (temporary)" on public.collections;
drop policy "tags: open select (temporary)" on public.tags;
drop policy "tags: open insert (temporary)" on public.tags;
drop policy "tags: open update (temporary)" on public.tags;
drop policy "tags: open delete (temporary)" on public.tags;
drop policy "note_tags: open select (temporary)" on public.note_tags;
drop policy "note_tags: open insert (temporary)" on public.note_tags;
drop policy "note_tags: open update (temporary)" on public.note_tags;
drop policy "note_tags: open delete (temporary)" on public.note_tags;

create policy "notes: select own" on public.notes for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "notes: insert own" on public.notes for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "notes: update own" on public.notes for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "notes: delete own" on public.notes for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "collections: select own" on public.collections for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "collections: insert own" on public.collections for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "collections: update own" on public.collections for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "collections: delete own" on public.collections for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "tags: select own" on public.tags for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "tags: insert own" on public.tags for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "tags: update own" on public.tags for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "tags: delete own" on public.tags for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "note_tags: select own" on public.note_tags for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "note_tags: insert own" on public.note_tags for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "note_tags: update own" on public.note_tags for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "note_tags: delete own" on public.note_tags for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- 5) Tag names: unique per user instead of across the whole table, so two
--    users can each have a tag called "work".
-- ---------------------------------------------------------------------------
alter table public.tags drop constraint tags_name_key;
alter table public.tags add constraint tags_user_id_name_key unique (user_id, name);

-- ---------------------------------------------------------------------------
-- 6) Links between rows must stay within one user. The policies above only
--    check each row's own user_id, so without this a user could point their
--    note at someone else's collection, or link someone else's note or tag in
--    note_tags (IDs are guessable numbers). Composite foreign keys make the
--    database reject that.
-- ---------------------------------------------------------------------------
alter table public.collections add constraint collections_id_user_id_key unique (id, user_id);
alter table public.notes       add constraint notes_id_user_id_key       unique (id, user_id);
alter table public.tags        add constraint tags_id_user_id_key        unique (id, user_id);

-- A note's collection must belong to the same user. Deleting the collection
-- still keeps the note (only collection_id is cleared, not user_id).
alter table public.notes drop constraint notes_collection_id_fkey;
alter table public.notes add constraint notes_collection_id_fkey
  foreign key (collection_id, user_id) references public.collections (id, user_id)
  on delete set null (collection_id);

-- A note_tags row must link a note and a tag of the same user.
alter table public.note_tags drop constraint note_tags_note_id_fkey;
alter table public.note_tags add constraint note_tags_note_id_fkey
  foreign key (note_id, user_id) references public.notes (id, user_id) on delete cascade;
alter table public.note_tags drop constraint note_tags_tag_id_fkey;
alter table public.note_tags add constraint note_tags_tag_id_fkey
  foreign key (tag_id, user_id) references public.tags (id, user_id) on delete cascade;

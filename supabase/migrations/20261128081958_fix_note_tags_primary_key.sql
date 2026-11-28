-- Fix: notes stopped loading after 20261128080010_add_user_ownership.sql.
--
-- That migration changed note_tags' foreign keys to (note_id, user_id) and
-- (tag_id, user_id). The Supabase Data API (PostgREST) only treats a table as
-- a many-to-many join table when all its foreign key columns are part of its
-- primary key, and user_id was not. So queries like
--   notes?select=id,tags(id,name,color)
-- failed with PGRST200 "Could not find a relationship between 'notes' and 'tags'".

-- Put user_id in note_tags' primary key, so the API sees note_tags as the
-- join table between notes and tags again.
alter table public.note_tags drop constraint note_tags_pkey;
alter table public.note_tags add constraint note_tags_pkey primary key (user_id, note_id, tag_id);

-- Keep "each tag only once per note" (the app's tag filter relies on it).
alter table public.note_tags add constraint note_tags_note_id_tag_id_key unique (note_id, tag_id);

-- The new primary key starts with user_id, so this index is no longer needed.
drop index public.note_tags_user_id_idx;

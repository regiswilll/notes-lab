-- Give each tag a colour from a small fixed palette.
--
-- The app shows the colour on note cards, in the tag filter, in the editor
-- and in the tags list. The palette lives in app/notes/tag-colors.ts; keep
-- the list below in step with it.

-- 1. New column. Adding it with a constant default is a quick metadata-only
--    change in Postgres 11+; existing rows get 'blue' until step 2.
alter table public.tags
  add column color text not null default 'blue';

-- 2. Only palette colours are allowed.
alter table public.tags
  add constraint tags_color_check
  check (color in ('red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'pink'));

-- 3. Spread the existing tags over the palette (in id order) so they don't
--    all start out the same colour.
update public.tags
set color = (array['red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'pink'])[(id % 8) + 1];

comment on column public.tags.color is
  'Display colour, one of: red, orange, yellow, green, teal, blue, purple, pink.';

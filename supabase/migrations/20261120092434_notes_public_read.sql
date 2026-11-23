-- Let anyone, signed in or not, read every note.

-- Table permission: without it Postgres refuses the query before any policy is checked.
-- Read-only: no insert, update or delete is granted here.
grant select on table public.notes to anon, authenticated;

-- Row Level Security policy: every row is visible to both roles.
create policy "Anyone can read notes"
  on public.notes for select
  to anon, authenticated
  using (true);

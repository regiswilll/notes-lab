-- Notes: a required title, an optional body, and an automatic creation time.
create table public.notes (
  id         uuid primary key default gen_random_uuid(),
  title      text not null check (char_length(trim(title)) > 0),
  body       text,
  created_at timestamptz not null default now()
);

-- Row Level Security: only signed-in users can use notes through the app's API.
-- Notes have no owner column, so every signed-in user can see and edit every note.
alter table public.notes enable row level security;

create policy "Signed-in users can view notes"
  on public.notes for select
  to authenticated
  using (true);

create policy "Signed-in users can create notes"
  on public.notes for insert
  to authenticated
  with check (true);

create policy "Signed-in users can update notes"
  on public.notes for update
  to authenticated
  using (true)
  with check (true);

create policy "Signed-in users can delete notes"
  on public.notes for delete
  to authenticated
  using (true);

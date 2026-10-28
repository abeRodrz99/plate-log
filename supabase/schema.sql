-- Plate Log cloud schema. Run once in the Supabase SQL editor.
-- Each row keeps the full record as JSON (`data`) next to the columns you'd filter or sort by,
-- so the app's types can evolve without migrations. Row level security limits every row to its owner.

create table if not exists public.workouts (
  user_id    uuid   not null default auth.uid() references auth.users on delete cascade,
  id         text   not null,
  started_at bigint not null,
  data       jsonb  not null,
  primary key (user_id, id)
);

create table if not exists public.templates (
  user_id    uuid   not null default auth.uid() references auth.users on delete cascade,
  id         text   not null,
  updated_at bigint not null,
  data       jsonb  not null,
  primary key (user_id, id)
);

create table if not exists public.activities (
  user_id    uuid   not null default auth.uid() references auth.users on delete cascade,
  id         text   not null,
  started_at bigint not null,
  data       jsonb  not null,
  primary key (user_id, id)
);

create index if not exists workouts_by_date   on public.workouts   (user_id, started_at desc);
create index if not exists activities_by_date on public.activities (user_id, started_at desc);

alter table public.workouts   enable row level security;
alter table public.templates  enable row level security;
alter table public.activities enable row level security;

create policy "own workouts"   on public.workouts   for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own templates"  on public.templates  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own activities" on public.activities for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

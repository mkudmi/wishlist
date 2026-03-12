create table if not exists public.wishlists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'My Wishlist',
  celebration_type text not null default 'birthday',
  custom_celebration text,
  event_date date,
  share_token text unique default encode(gen_random_bytes(12), 'hex'),
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.wishlists add column if not exists share_token text;
alter table public.wishlists add column if not exists is_public boolean not null default true;
alter table public.wishlists add column if not exists celebration_type text not null default 'birthday';
alter table public.wishlists add column if not exists custom_celebration text;
alter table public.wishlists add column if not exists event_date date;
alter table public.wishlists alter column share_token set default encode(gen_random_bytes(12), 'hex');
update public.wishlists
set share_token = encode(gen_random_bytes(12), 'hex')
where share_token is null or share_token = '';
alter table public.wishlists alter column share_token set not null;
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'wishlists_share_token_key'
  ) then
    alter table public.wishlists add constraint wishlists_share_token_key unique (share_token);
  end if;
end
$$;

create table if not exists public.wishes (
  id text primary key,
  wishlist_id uuid not null references public.wishlists(id) on delete cascade,
  title text not null,
  note text not null,
  tag text not null default 'Без категории',
  price text not null default '',
  url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wish_reservations (
  id uuid primary key default gen_random_uuid(),
  wish_id text not null references public.wishes(id) on delete cascade,
  wishlist_id uuid not null references public.wishlists(id) on delete cascade,
  contributor_name text not null,
  contributor_user_id uuid references auth.users(id) on delete set null,
  amount numeric(12, 2) not null check (amount > 0),
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_wishlists_updated_at on public.wishlists;
create trigger set_wishlists_updated_at
before update on public.wishlists
for each row execute procedure public.set_updated_at();

drop trigger if exists set_wishes_updated_at on public.wishes;
create trigger set_wishes_updated_at
before update on public.wishes
for each row execute procedure public.set_updated_at();

alter table public.wishlists enable row level security;
alter table public.wishes enable row level security;
alter table public.wish_reservations enable row level security;

drop policy if exists "wishlists_select_own" on public.wishlists;
create policy "wishlists_select_own"
on public.wishlists
for select
to authenticated
using (owner_id = auth.uid());

drop policy if exists "wishlists_insert_own" on public.wishlists;
create policy "wishlists_insert_own"
on public.wishlists
for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "wishlists_update_own" on public.wishlists;
create policy "wishlists_update_own"
on public.wishlists
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "wishlists_delete_own" on public.wishlists;
create policy "wishlists_delete_own"
on public.wishlists
for delete
to authenticated
using (owner_id = auth.uid());

drop policy if exists "wishes_select_owned_wishlist" on public.wishes;
create policy "wishes_select_owned_wishlist"
on public.wishes
for select
to authenticated
using (
  exists (
    select 1
    from public.wishlists
    where wishlists.id = wishes.wishlist_id
      and wishlists.owner_id = auth.uid()
  )
);

drop policy if exists "wishes_insert_owned_wishlist" on public.wishes;
create policy "wishes_insert_owned_wishlist"
on public.wishes
for insert
to authenticated
with check (
  exists (
    select 1
    from public.wishlists
    where wishlists.id = wishes.wishlist_id
      and wishlists.owner_id = auth.uid()
  )
);

drop policy if exists "wishes_update_owned_wishlist" on public.wishes;
create policy "wishes_update_owned_wishlist"
on public.wishes
for update
to authenticated
using (
  exists (
    select 1
    from public.wishlists
    where wishlists.id = wishes.wishlist_id
      and wishlists.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.wishlists
    where wishlists.id = wishes.wishlist_id
      and wishlists.owner_id = auth.uid()
  )
);

drop policy if exists "wishes_delete_owned_wishlist" on public.wishes;
create policy "wishes_delete_owned_wishlist"
on public.wishes
for delete
to authenticated
using (
  exists (
    select 1
    from public.wishlists
    where wishlists.id = wishes.wishlist_id
      and wishlists.owner_id = auth.uid()
  )
);

drop policy if exists "wish_reservations_select_owned_wishlist" on public.wish_reservations;
create policy "wish_reservations_select_owned_wishlist"
on public.wish_reservations
for select
to authenticated
using (
  exists (
    select 1
    from public.wishlists wl
    where wl.id = wish_reservations.wishlist_id
      and wl.owner_id = auth.uid()
  )
);

drop policy if exists "wish_reservations_select_public_wishlist" on public.wish_reservations;
create policy "wish_reservations_select_public_wishlist"
on public.wish_reservations
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.wishlists wl
    where wl.id = wish_reservations.wishlist_id
      and wl.is_public = true
  )
);

drop policy if exists "wish_reservations_insert_public_wishlist" on public.wish_reservations;
create policy "wish_reservations_insert_public_wishlist"
on public.wish_reservations
for insert
to anon, authenticated
with check (
  exists (
    select 1
    from public.wishes w
    join public.wishlists wl on wl.id = w.wishlist_id
    where w.id = wish_reservations.wish_id
      and wl.id = wish_reservations.wishlist_id
      and wl.is_public = true
  )
  and (
    contributor_user_id is null
    or contributor_user_id = auth.uid()
  )
);

drop policy if exists "wish_reservations_delete_own_entry" on public.wish_reservations;
create policy "wish_reservations_delete_own_entry"
on public.wish_reservations
for delete
to authenticated
using (contributor_user_id = auth.uid());

create or replace function public.get_shared_wishlist(p_share_token text)
returns table (
  id text,
  wishlist_id uuid,
  title text,
  note text,
  tag text,
  price text,
  url text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    w.id,
    w.wishlist_id,
    w.title,
    w.note,
    w.tag,
    w.price,
    w.url,
    w.created_at
  from public.wishes w
  join public.wishlists wl on wl.id = w.wishlist_id
  where wl.share_token = p_share_token
    and wl.is_public = true
  order by w.created_at desc;
$$;

grant execute on function public.get_shared_wishlist(text) to anon, authenticated;

create or replace function public.get_shared_wishlist_reservations(p_share_token text)
returns table (
  id uuid,
  wish_id text,
  wishlist_id uuid,
  contributor_name text,
  contributor_user_id uuid,
  amount numeric,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    wr.id,
    wr.wish_id,
    wr.wishlist_id,
    wr.contributor_name,
    wr.contributor_user_id,
    wr.amount,
    wr.created_at
  from public.wish_reservations wr
  join public.wishlists wl on wl.id = wr.wishlist_id
  where wl.share_token = p_share_token
    and wl.is_public = true
  order by wr.created_at asc;
$$;

grant execute on function public.get_shared_wishlist_reservations(text) to anon, authenticated;

create or replace function public.get_shared_wishlist_meta(p_share_token text)
returns table (
  id uuid,
  title text,
  celebration_type text,
  custom_celebration text,
  event_date date,
  owner_first_name text,
  owner_birthday date
)
language sql
security definer
set search_path = public
as $$
  select
    wl.id,
    wl.title,
    wl.celebration_type,
    wl.custom_celebration,
    wl.event_date,
    u.first_name,
    u.birthday
  from public.wishlists wl
  join public.users u on u.id = wl.owner_id
  where wl.share_token = p_share_token
    and wl.is_public = true
  limit 1;
$$;

grant execute on function public.get_shared_wishlist_meta(text) to anon, authenticated;

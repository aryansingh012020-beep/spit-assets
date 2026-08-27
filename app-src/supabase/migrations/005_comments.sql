-- ============================================================
-- SPIT Asset Management System — Migration 005: Asset Comments
-- ============================================================

create or replace function public.current_user_role()
returns text language sql stable security definer as $$
  select role from public.profiles where id = auth.uid();
$$;

create table if not exists public.asset_comments (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(trim(content)) > 0),
  is_admin_only boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_asset_comments_asset_id on public.asset_comments(asset_id);
create index if not exists idx_asset_comments_created_at on public.asset_comments(created_at desc);

alter table public.asset_comments enable row level security;

drop policy if exists "asset_comments_select" on public.asset_comments;
drop policy if exists "asset_comments_insert" on public.asset_comments;
drop policy if exists "asset_comments_delete" on public.asset_comments;

create policy "asset_comments_select"
  on public.asset_comments for select
  using (
    auth.role() = 'authenticated'
    and (
      not is_admin_only
      or public.current_user_role() = 'approver'
    )
  );

create policy "asset_comments_insert"
  on public.asset_comments for insert
  with check (
    auth.uid() = author_id
    and (
      not is_admin_only
      or public.current_user_role() = 'approver'
    )
  );

create policy "asset_comments_delete"
  on public.asset_comments for delete
  using (
    auth.uid() = author_id
    or public.current_user_role() = 'approver'
  );

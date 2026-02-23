-- admin_users must exist before submissions policies that reference it
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

drop policy if exists "Users can read own admin row" on public.admin_users;
create policy "Users can read own admin row"
  on public.admin_users for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Service role full access admin_users" on public.admin_users;
create policy "Service role full access admin_users"
  on public.admin_users for all
  to service_role
  using (true)
  with check (true);

-- submissions: all guest photo submissions
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null check (status in ('pending', 'approved', 'rejected', 'deleted')),
  caption text not null,
  image_path text not null,
  thumb_path text not null,
  mime text,
  size_bytes int,
  width int,
  height int,
  ip_hash text,
  device_id text,
  fingerprint_hash text,
  user_agent text,
  approved_at timestamptz,
  approved_by uuid references auth.users(id),
  rejected_at timestamptz,
  rejected_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id)
);

create index if not exists idx_submissions_status_created
  on public.submissions (status, created_at desc);
create index if not exists idx_submissions_created
  on public.submissions (created_at desc);
create index if not exists idx_submissions_ip_created
  on public.submissions (ip_hash, created_at desc);

alter table public.submissions enable row level security;

-- Public: only approved rows
drop policy if exists "Public can view approved submissions" on public.submissions;
create policy "Public can view approved submissions"
  on public.submissions for select
  to anon
  using (status = 'approved');

-- Service role can do everything (used by Netlify Functions)
drop policy if exists "Service role full access" on public.submissions;
create policy "Service role full access"
  on public.submissions for all
  to service_role
  using (true)
  with check (true);

-- Authenticated admin: full read + update (no insert/delete from client)
drop policy if exists "Admins can view all submissions" on public.submissions;
create policy "Admins can view all submissions"
  on public.submissions for select
  to authenticated
  using (
    exists (select 1 from public.admin_users au where au.user_id = auth.uid())
  );

drop policy if exists "Admins can update submissions" on public.submissions;
create policy "Admins can update submissions"
  on public.submissions for update
  to authenticated
  using (
    exists (select 1 from public.admin_users au where au.user_id = auth.uid())
  );

comment on table public.submissions is 'Guest photo submissions; status pending|approved|rejected|deleted';
comment on table public.admin_users is 'Users allowed to access admin moderation';

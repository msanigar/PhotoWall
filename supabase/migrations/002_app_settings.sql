-- App-level settings (e.g. approvals enabled). Only service role / backend may write.
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

-- No public or authenticated access; Netlify uses service_role
drop policy if exists "Service role full access app_settings" on public.app_settings;
create policy "Service role full access app_settings"
  on public.app_settings for all
  to service_role
  using (true)
  with check (true);

insert into public.app_settings (key, value)
values ('approvals_enabled', '{"enabled": true}'::jsonb)
on conflict (key) do nothing;

comment on table public.app_settings is 'App settings (e.g. approvals on/off). Backend only.';

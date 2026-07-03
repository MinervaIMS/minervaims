-- PayoffLab pricing-engine: per-IP sliding-window rate limiting.
-- The edge function calls pricing_rate_check(key, limit, window) with the
-- service role; the table is not exposed to clients.

create table if not exists public.pricing_rate_limits (
  key text not null,
  requested_at timestamptz not null default now()
);

create index if not exists pricing_rate_limits_key_time_idx
  on public.pricing_rate_limits (key, requested_at desc);

alter table public.pricing_rate_limits enable row level security;
-- No policies: only the service role (which bypasses RLS) touches this table.

-- Returns TRUE when the caller is within the limit (and records the hit),
-- FALSE when the sliding window is already full. Old rows are pruned
-- opportunistically so the table stays small without a scheduled job.
create or replace function public.pricing_rate_check(
  p_key text,
  p_limit integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  delete from public.pricing_rate_limits
   where requested_at < now() - make_interval(secs => p_window_seconds * 4);

  select count(*) into v_count
    from public.pricing_rate_limits
   where key = p_key
     and requested_at > now() - make_interval(secs => p_window_seconds);

  if v_count >= p_limit then
    return false;
  end if;

  insert into public.pricing_rate_limits (key) values (p_key);
  return true;
end;
$$;

revoke all on function public.pricing_rate_check(text, integer, integer) from public, anon, authenticated;

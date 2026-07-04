create extension if not exists pgcrypto;

create table if not exists public.travel_ledgers (
  id uuid primary key default gen_random_uuid(),
  share_token text not null unique default encode(gen_random_bytes(18), 'hex'),
  name text not null default '三家庭旅游账本',
  families jsonb not null default '[{"id":"family-a","name":"乐家"},{"id":"family-b","name":"祺家"},{"id":"family-c","name":"旦家"}]'::jsonb,
  family_members jsonb not null default '{"family-a":1,"family-b":1,"family-c":1}'::jsonb,
  categories text[] not null default array['交通','住宿','餐饮','门票','购物','其他'],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.travel_expenses (
  id uuid primary key default gen_random_uuid(),
  ledger_id uuid not null references public.travel_ledgers(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  payer_id text not null,
  category text not null,
  note text not null default '',
  expense_date date not null default current_date,
  split_mode text not null default 'all' check (split_mode in ('all', 'families', 'custom')),
  split_family_ids text[] not null default array[]::text[],
  split_amounts jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.travel_expenses
  add column if not exists split_mode text not null default 'all',
  add column if not exists split_family_ids text[] not null default array[]::text[],
  add column if not exists split_amounts jsonb not null default '{}'::jsonb,
  add column if not exists created_by jsonb,
  add column if not exists updated_by jsonb;

create index if not exists travel_expenses_ledger_date_idx
  on public.travel_expenses (ledger_id, expense_date desc, created_at desc);

alter table public.travel_ledgers enable row level security;
alter table public.travel_expenses enable row level security;

revoke all on public.travel_ledgers from anon, authenticated;
revoke all on public.travel_expenses from anon, authenticated;

drop function if exists public.create_travel_ledger();
create function public.create_travel_ledger()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  ledger_row public.travel_ledgers%rowtype;
begin
  insert into public.travel_ledgers default values returning * into ledger_row;
  return jsonb_build_object('ledger', to_jsonb(ledger_row), 'expenses', '[]'::jsonb);
end;
$$;

drop function if exists public.get_travel_ledger(text);
create function public.get_travel_ledger(p_share_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  ledger_row public.travel_ledgers%rowtype;
  expense_rows jsonb;
begin
  select * into ledger_row from public.travel_ledgers where share_token = p_share_token;
  if not found then
    raise exception 'Ledger not found' using errcode = 'P0002';
  end if;

  select coalesce(jsonb_agg(to_jsonb(e) order by e.expense_date desc, e.created_at desc), '[]'::jsonb)
  into expense_rows
  from public.travel_expenses e
  where e.ledger_id = ledger_row.id;

  return jsonb_build_object('ledger', to_jsonb(ledger_row), 'expenses', expense_rows);
end;
$$;

drop function if exists public.update_travel_ledger_settings(text, text[], jsonb);
drop function if exists public.update_travel_ledger_settings(text, text[], jsonb, text);
create function public.update_travel_ledger_settings(
  p_share_token text,
  p_categories text[],
  p_family_members jsonb,
  p_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  ledger_row public.travel_ledgers%rowtype;
begin
  update public.travel_ledgers
  set
    name = coalesce(nullif(trim(p_name), ''), name),
    categories = p_categories,
    family_members = p_family_members,
    updated_at = now()
  where share_token = p_share_token
  returning * into ledger_row;

  if not found then
    raise exception 'Ledger not found' using errcode = 'P0002';
  end if;

  return to_jsonb(ledger_row);
end;
$$;

create function public.update_travel_ledger_settings(
  p_share_token text,
  p_categories text[],
  p_family_members jsonb
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.update_travel_ledger_settings(
    p_share_token,
    p_categories,
    p_family_members,
    null
  );
$$;

drop function if exists public.save_travel_expense(text, uuid, numeric, text, text, text, date);
drop function if exists public.save_travel_expense(text, uuid, numeric, text, text, text, date, text, text[], jsonb);
drop function if exists public.save_travel_expense(text, uuid, numeric, text, text, text, date, text, text[], jsonb, jsonb, jsonb);
create function public.save_travel_expense(
  p_share_token text,
  p_id uuid,
  p_amount numeric,
  p_payer_id text,
  p_category text,
  p_note text,
  p_expense_date date,
  p_split_mode text,
  p_split_family_ids text[],
  p_split_amounts jsonb,
  p_created_by jsonb,
  p_updated_by jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  ledger_row public.travel_ledgers%rowtype;
  expense_row public.travel_expenses%rowtype;
begin
  select * into ledger_row from public.travel_ledgers where share_token = p_share_token;
  if not found then
    raise exception 'Ledger not found' using errcode = 'P0002';
  end if;

  if not (ledger_row.families @> jsonb_build_array(jsonb_build_object('id', p_payer_id))) then
    raise exception 'Unknown payer' using errcode = '23503';
  end if;

  if exists (
    select 1
    from unnest(coalesce(p_split_family_ids, array[]::text[])) as split_family(family_id)
    where not (ledger_row.families @> jsonb_build_array(jsonb_build_object('id', split_family.family_id)))
  ) then
    raise exception 'Unknown split family' using errcode = '23503';
  end if;

  insert into public.travel_expenses (
    id, ledger_id, amount, payer_id, category, note, expense_date, split_mode, split_family_ids, split_amounts, created_by, updated_by, updated_at
  ) values (
    p_id,
    ledger_row.id,
    round(p_amount, 2),
    p_payer_id,
    trim(p_category),
    coalesce(p_note, ''),
    p_expense_date,
    case when p_split_mode in ('all', 'families', 'custom') then p_split_mode else 'all' end,
    coalesce(p_split_family_ids, array[]::text[]),
    coalesce(p_split_amounts, '{}'::jsonb),
    p_created_by,
    p_updated_by,
    now()
  )
  on conflict (id) do update set
    amount = excluded.amount,
    payer_id = excluded.payer_id,
    category = excluded.category,
    note = excluded.note,
    expense_date = excluded.expense_date,
    split_mode = excluded.split_mode,
    split_family_ids = excluded.split_family_ids,
    split_amounts = excluded.split_amounts,
    created_by = coalesce(public.travel_expenses.created_by, excluded.created_by),
    updated_by = excluded.updated_by,
    updated_at = now()
  where public.travel_expenses.ledger_id = ledger_row.id
  returning * into expense_row;

  if expense_row.id is null then
    raise exception 'Expense id conflict' using errcode = '23505';
  end if;

  update public.travel_ledgers set updated_at = now() where id = ledger_row.id;

  return to_jsonb(expense_row);
end;
$$;

create function public.save_travel_expense(
  p_share_token text,
  p_id uuid,
  p_amount numeric,
  p_payer_id text,
  p_category text,
  p_note text,
  p_expense_date date,
  p_split_mode text,
  p_split_family_ids text[],
  p_split_amounts jsonb
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.save_travel_expense(
    p_share_token,
    p_id,
    p_amount,
    p_payer_id,
    p_category,
    p_note,
    p_expense_date,
    p_split_mode,
    p_split_family_ids,
    p_split_amounts,
    null,
    null
  );
$$;

create function public.save_travel_expense(
  p_share_token text,
  p_id uuid,
  p_amount numeric,
  p_payer_id text,
  p_category text,
  p_note text,
  p_expense_date date
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.save_travel_expense(
    p_share_token,
    p_id,
    p_amount,
    p_payer_id,
    p_category,
    p_note,
    p_expense_date,
    'all',
    array[]::text[],
    '{}'::jsonb,
    null,
    null
  );
$$;

drop function if exists public.delete_travel_expense(text, uuid);
create function public.delete_travel_expense(
  p_share_token text,
  p_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ledger_row public.travel_ledgers%rowtype;
begin
  select * into ledger_row from public.travel_ledgers where share_token = p_share_token;
  if not found then
    raise exception 'Ledger not found' using errcode = 'P0002';
  end if;

  delete from public.travel_expenses where id = p_id and ledger_id = ledger_row.id;
  update public.travel_ledgers set updated_at = now() where id = ledger_row.id;
end;
$$;

drop function if exists public.clear_travel_ledger(text);
create function public.clear_travel_ledger(p_share_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ledger_row public.travel_ledgers%rowtype;
begin
  select * into ledger_row from public.travel_ledgers where share_token = p_share_token;
  if not found then
    raise exception 'Ledger not found' using errcode = 'P0002';
  end if;

  delete from public.travel_expenses where ledger_id = ledger_row.id;
  update public.travel_ledgers set updated_at = now() where id = ledger_row.id;
end;
$$;

grant execute on function public.create_travel_ledger() to anon, authenticated;
grant execute on function public.get_travel_ledger(text) to anon, authenticated;
grant execute on function public.update_travel_ledger_settings(text, text[], jsonb) to anon, authenticated;
grant execute on function public.update_travel_ledger_settings(text, text[], jsonb, text) to anon, authenticated;
grant execute on function public.save_travel_expense(text, uuid, numeric, text, text, text, date) to anon, authenticated;
grant execute on function public.save_travel_expense(text, uuid, numeric, text, text, text, date, text, text[], jsonb) to anon, authenticated;
grant execute on function public.save_travel_expense(text, uuid, numeric, text, text, text, date, text, text[], jsonb, jsonb, jsonb) to anon, authenticated;
grant execute on function public.delete_travel_expense(text, uuid) to anon, authenticated;
grant execute on function public.clear_travel_ledger(text) to anon, authenticated;

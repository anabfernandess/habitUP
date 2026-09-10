-- HabitUP — migração inicial (corrigida)
-- Tabelas, GRANTs mínimos, RLS e funções seguras (SECURITY DEFINER).
-- Execute este arquivo no SQL Editor do Supabase ou via Supabase CLI.
--
-- Princípios aplicados:
--  * Escrita em completions, user_stats e user_rewards SÓ via funções RPC.
--  * Todo SELECT é limitado ao próprio usuário por RLS (auth.uid()).
--  * Funções SECURITY DEFINER validam auth.uid() internamente e usam
--    search_path fixo (sem acesso a pg_temp / schemas externos).
--  * sync_user_data serializa recalculos por usuário (advisory lock) para
--    que conclusões simultâneas nunca deixem estatísticas desatualizadas.
--  * Desfazer só vale para conclusões do dia atual no fuso do usuário.
--  * best_streak é recalculado do histórico VÁLIDO (desfazer recalcula;
--    perder um dia por inércia não muda nada).
--  * Peças de avatar não possuídas são removidas do avatar_config no banco.
--  * timezone é normalizado (só valores reconhecidos pelo Postgres).

create extension if not exists pgcrypto;

-- =====================================================================
-- Tabelas
-- =====================================================================
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  name          text not null default '',
  timezone      text not null default 'America/Sao_Paulo',
  avatar_config jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.habits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null check (char_length(trim(name)) between 1 and 60),
  description text not null default '',
  category    text not null default 'outros',
  icon        text not null default 'check',
  color       text not null default '#8b5cf6',
  archived    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists habits_user_idx on public.habits (user_id, archived);

-- completed_date é derivada no servidor a partir do fuso do usuário.
-- A unicidade (habit_id, completed_date) impede conclusões duplicadas,
-- mas a manutenção de estatísticas corretas é garantida pelo advisory
-- lock em sync_user_data (a unicidade sozinha não basta).
create table if not exists public.completions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  habit_id       uuid not null references public.habits (id) on delete cascade,
  completed_at   timestamptz not null default now(),
  completed_date date not null,
  constraint completions_unique_per_day unique (habit_id, completed_date)
);

create index if not exists completions_user_date_idx
  on public.completions (user_id, completed_date);

-- user_stats (derivadas e materializadas por sync_user_data)
create table if not exists public.user_stats (
  user_id           uuid primary key references auth.users (id) on delete cascade,
  total_completions integer not null default 0,
  total_xp          integer not null default 0,
  level             integer not null default 1,
  best_streak       integer not null default 0,
  updated_at        timestamptz not null default now()
);

-- user_rewards (itens desbloqueados — concedidos uma única vez)
create table if not exists public.user_rewards (
  user_id    uuid not null references auth.users (id) on delete cascade,
  reward_id  text not null,
  granted_at timestamptz not null default now(),
  primary key (user_id, reward_id)
);

-- =====================================================================
-- RLS (idempotente)
-- =====================================================================
alter table public.profiles      enable row level security;
alter table public.habits        enable row level security;
alter table public.completions   enable row level security;
alter table public.user_stats    enable row level security;
alter table public.user_rewards  enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists habits_select_own on public.habits;
create policy "habits_select_own" on public.habits
  for select using (auth.uid() = user_id);

drop policy if exists habits_insert_own on public.habits;
create policy "habits_insert_own" on public.habits
  for insert with check (auth.uid() = user_id);

drop policy if exists habits_update_own on public.habits;
create policy "habits_update_own" on public.habits
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists habits_delete_own on public.habits;
create policy "habits_delete_own" on public.habits
  for delete using (auth.uid() = user_id);

-- completions: somente leitura própria. Inserção/exclusão passam
-- exclusivamente por complete_habit / undo_completion.
drop policy if exists completions_select_own on public.completions;
create policy "completions_select_own" on public.completions
  for select using (auth.uid() = user_id);

-- user_stats / user_rewards: leitura própria; escrita apenas via função segura.
-- Não há política de insert/update/delete aqui de propósito.
drop policy if exists user_stats_select_own on public.user_stats;
create policy "user_stats_select_own" on public.user_stats
  for select using (auth.uid() = user_id);

drop policy if exists user_rewards_select_own on public.user_rewards;
create policy "user_rewards_select_own" on public.user_rewards
  for select using (auth.uid() = user_id);

-- =====================================================================
-- GRANTs mínimos (defesa em profundidade além do RLS)
-- Nota: em projetos Supabase, o padrão concede ALL a anon/authenticated
-- para tabelas novas; estes revogues explicitam o MÍNIMO necessário.
-- =====================================================================
grant usage on schema public to anon, authenticated;

revoke all on table public.profiles     from anon, authenticated;
revoke all on table public.habits       from anon, authenticated;
revoke all on table public.completions  from anon, authenticated;
revoke all on table public.user_stats   from anon, authenticated;
revoke all on table public.user_rewards from anon, authenticated;

-- authenticated:
--  * profiles: SELECT (leitura própria) e UPDATE (atualização via app);
--    nada de INSERT (perfil é criado pelo trigger handle_new_user).
--  * habits: CRUD completo dos próprios hábitos.
--  * completions / user_stats / user_rewards: SOMENTE SELECT.
--    Nenhuma escrita direta em XP, estatísticas ou recompensas.
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.habits to authenticated;
grant select on public.completions to authenticated;
grant select on public.user_stats    to authenticated;
grant select on public.user_rewards  to authenticated;

-- anon: zero acesso a tabelas.
revoke all on table public.profiles     from anon;
revoke all on table public.habits       from anon;
revoke all on table public.completions  from anon;
revoke all on table public.user_stats   from anon;
revoke all on table public.user_rewards from anon;

-- =====================================================================
-- Funções
-- =====================================================================

-- Trigger de updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists habits_set_updated_at on public.habits;
create trigger habits_set_updated_at before update on public.habits
  for each row execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- profiles_normalize_timezone: garante que o fuso salvo é reconhecido
-- pelo Postgres (usa pg_timezone_names/abbrevs) para que o cálculo de
-- completed_date (at time zone) nunca falhe.
-- ---------------------------------------------------------------------
create or replace function public.profiles_normalize_timezone()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.timezone is null or btrim(new.timezone) = '' then
    new.timezone := 'America/Sao_Paulo';
  else
    new.timezone := btrim(new.timezone);
    if not exists (
      select 1 from pg_timezone_names where name = new.timezone
    ) and not exists (
      select 1 from pg_timezone_abbrevs where abbrev = new.timezone
    ) then
      new.timezone := 'America/Sao_Paulo';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_tz_check on public.profiles;
create trigger profiles_tz_check before insert or update of timezone on public.profiles
  for each row execute function public.profiles_normalize_timezone();

-- ---------------------------------------------------------------------
-- profiles_validate_avatar: impede equipar peças não possuídas via
-- chamada direta à API (itens com rewardId precisam estar em user_rewards).
-- Espelha os ids do catálogo em src/lib/items.ts.
-- ---------------------------------------------------------------------
create or replace function public.profiles_validate_avatar()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_slot text;
  v_item text;
begin
  for v_slot in select key from jsonb_object_keys(new.avatar_config) as t(key) loop
    v_item := new.avatar_config ->> v_slot;
    if v_item is null or v_item = '' then
      continue;
    end if;
    if v_item in (
      'skin_light', 'skin_tan', 'skin_brown', 'skin_deep',
      'hair_short', 'hair_mohawk',
      'tee_default', 'bg_default'
    ) then
      continue;
    end if;
    if exists (
      select 1 from public.user_rewards r
      where r.user_id = new.id and r.reward_id = v_item
    ) then
      continue;
    end if;
    raise exception 'item-bloqueado';
  end loop;
  return new;
end;
$$;

drop trigger if exists profiles_avatar_check on public.profiles;
create trigger profiles_avatar_check before insert or update of avatar_config on public.profiles
  for each row execute function public.profiles_validate_avatar();

-- Cria o perfil automaticamente no cadastro (avatar consistente com o catálogo)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_tz   text;
begin
  v_name := coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), 'Viajante');
  v_tz   := coalesce(nullif(trim(new.raw_user_meta_data->>'timezone'), ''), 'America/Sao_Paulo');
  insert into public.profiles (id, name, timezone, avatar_config)
  values (
    new.id,
    v_name,
    v_tz,
    '{"skin":"skin_light","hair":"hair_short","top":"tee_default","headwear":null,"accessory":null,"background":"bg_default","effect":null}'::jsonb
  )
  on conflict (id) do nothing;
  insert into public.user_stats (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Data da conclusão no fuso do usuário
create or replace function public.user_completed_date(p_user_id uuid, p_at timestamptz default now())
returns date
language sql
stable
security invoker
set search_path = public
as $$
  select (p_at at time zone coalesce(
    (select timezone from public.profiles where id = p_user_id),
    'America/Sao_Paulo'
  ))::date;
$$;

-- ---------------------------------------------------------------------
-- sync_user_data: recalcula estatísticas e concilia recompensas.
-- Só pode ser executado (via RPC ou internamente) quando auth.uid()
-- corresponde ao usuário recalculado. Serializa recalculos concorrentes
-- do MESMO usuário para que o valor final seja sempre consistente.
-- ---------------------------------------------------------------------
create or replace function public.sync_user_data(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count     integer;
  v_xp        integer;
  v_level     integer;
  v_best_run  integer;
  v_earned    text[];
  v_cfg       jsonb;
  v_slot      text;
  v_item      text;
begin
  -- Identidade e autorização: nunca recalcule os dados de outro usuário.
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'nao-autorizado';
  end if;

  -- Serializa recalculos por usuário (advisory lock transacional):
  -- a unicidade (habit_id, completed_date) NÃO basta para garantir que a
  -- atualização das estatísticas esteja correta sob concorrência.
  perform pg_advisory_xact_lock(hashtext('habitup:stats:' || p_user_id::text)::bigint);

  select count(*) into v_count
    from public.completions where user_id = p_user_id;

  v_xp    := v_count * 20;                        -- 20 XP por conclusão válida
  v_level := floor(v_xp / 100)::integer + 1;      -- nível 1 + 1 nível a cada 100 XP

  -- Maior sequência do HISTÓRICO VÁLIDO atual (dias consecutivos com ≥1
  -- conclusão). Desfazer recalcula o recorde; perder um dia por inércia
  -- não altera nada porque as conclusões continuam no histórico.
  select coalesce(max(c), 0) into v_best_run
  from (
    select grp, count(*) c
    from (
      select d - (row_number() over (order by d))::int as grp, d
      from (
        select distinct completed_date as d
        from public.completions
        where user_id = p_user_id
      ) x
    ) y
    group by grp
  ) z;

  insert into public.user_stats (user_id, total_completions, total_xp, level, best_streak, updated_at)
  values (p_user_id, v_count, v_xp, v_level, v_best_run, now())
  on conflict (user_id) do update set
    total_completions = excluded.total_completions,
    total_xp          = excluded.total_xp,
    level             = excluded.level,
    best_streak       = excluded.best_streak,
    updated_at        = excluded.updated_at;

  -- Recompensas elegíveis (regras espelhadas em src/lib/gamification.ts)
  v_earned := '{}'::text[];
  if v_count >= 1        then v_earned := v_earned || 'shirt_first_step'; end if;
  if v_count >= 10       then v_earned := v_earned || 'cap_10';           end if;
  if v_count >= 50       then v_earned := v_earned || 'headphones_50';    end if;
  if v_level >= 5        then v_earned := v_earned || 'outfit_level5';    end if;
  if v_level >= 10       then v_earned := v_earned || 'bg_level10';       end if;
  if v_best_run >= 3     then v_earned := v_earned || 'headband_streak3'; end if;
  if v_best_run >= 7     then v_earned := v_earned || 'jacket_streak7';   end if;
  if v_best_run >= 30    then v_earned := v_earned || 'aura_30';          end if;

  -- Revoga apenas o que não é mais elegível (dependia exclusivamente da
  -- conclusão removida).
  delete from public.user_rewards
    where user_id = p_user_id
      and reward_id <> all (v_earned);

  insert into public.user_rewards (user_id, reward_id)
  select p_user_id, r
    from unnest(v_earned) as r
    on conflict (user_id, reward_id) do nothing;

  -- Remove do avatar qualquer peça que deixou de ser possuída (ex.: a
  -- conclusão que sustentava a recompensa foi desfeita). Espelha os ids de
  -- itens gratuitos em src/lib/items.ts.
  select avatar_config into v_cfg from public.profiles where id = p_user_id;
  if v_cfg is not null then
    for v_slot in select key from jsonb_object_keys(v_cfg) as t(key) loop
      v_item := v_cfg ->> v_slot;
      if v_item is not null and v_item <> '' then
        if v_item in (
          'skin_light', 'skin_tan', 'skin_brown', 'skin_deep',
          'hair_short', 'hair_mohawk',
          'tee_default', 'bg_default'
        ) or v_item = any (v_earned) then
          continue;
        end if;
        case v_slot
          when 'skin'       then v_cfg := v_cfg || '{"skin":"skin_light"}'::jsonb;
          when 'hair'       then v_cfg := v_cfg || '{"hair":"hair_short"}'::jsonb;
          when 'top'        then v_cfg := v_cfg || '{"top":"tee_default"}'::jsonb;
          when 'background' then v_cfg := v_cfg || '{"background":"bg_default"}'::jsonb;
          else                   v_cfg := jsonb_set(v_cfg, array[v_slot], 'null'::jsonb);
        end case;
      end if;
    end loop;
    update public.profiles set avatar_config = v_cfg where id = p_user_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- complete_habit: única porta de entrada para concluir um hábito.
-- ---------------------------------------------------------------------
create or replace function public.complete_habit(p_habit_id uuid)
returns public.completions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user   uuid := auth.uid();
  v_date   date;
  v_row    public.completions;
begin
  if v_user is null then
    raise exception 'nao-autenticado';
  end if;

  if not exists (
    select 1 from public.habits
    where id = p_habit_id and user_id = v_user and archived = false
  ) then
    raise exception 'habito-nao-encontrado';
  end if;

  v_date := public.user_completed_date(v_user);

  insert into public.completions (user_id, habit_id, completed_at, completed_date)
  values (v_user, p_habit_id, now(), v_date)
  on conflict (habit_id, completed_date) do nothing
  returning * into v_row;

  if v_row is null then
    raise exception 'ja-concluido';
  end if;

  perform public.sync_user_data(v_user);
  return v_row;
end;
$$;

-- ---------------------------------------------------------------------
-- undo_completion: desfaz UMA conclusão do DIA ATUAL (fuso do usuário).
-- Corrige XP, streaks, recompensas e remove a peça do avatar se o item
-- dependia apenas daquela conclusão.
-- ---------------------------------------------------------------------
create or replace function public.undo_completion(p_completion_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_row  public.completions;
begin
  if v_user is null then
    raise exception 'nao-autenticado';
  end if;

  select * into v_row
    from public.completions
    where id = p_completion_id and user_id = v_user;

  if v_row is null then
    raise exception 'conclusao-nao-encontrada';
  end if;

  -- Somente conclusões de hoje (no fuso do usuário) podem ser desfeitas.
  if v_row.completed_date <> public.user_completed_date(v_user) then
    raise exception 'conclusao-antiga';
  end if;

  delete from public.completions
    where id = p_completion_id and user_id = v_user;

  perform public.sync_user_data(v_user);
end;
$$;

-- =====================================================================
-- Acesso às funções: somente usuários autenticados, nunca anon.
-- As funções de trigger não são executáveis via API (revoga o default PUBLIC).
-- =====================================================================
revoke all on function public.complete_habit(uuid) from public, anon;
revoke all on function public.undo_completion(uuid) from public, anon;
revoke all on function public.sync_user_data(uuid) from public, anon;
revoke all on function public.user_completed_date(uuid, timestamptz) from public, anon;
revoke all on function public.handle_new_user() from public, anon;
revoke all on function public.set_updated_at() from public, anon;
revoke all on function public.profiles_normalize_timezone() from public, anon;
revoke all on function public.profiles_validate_avatar() from public, anon;

grant execute on function public.complete_habit(uuid) to authenticated;
grant execute on function public.undo_completion(uuid) to authenticated;
grant execute on function public.sync_user_data(uuid) to authenticated;
grant execute on function public.user_completed_date(uuid, timestamptz) to authenticated;
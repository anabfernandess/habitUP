-- HabitUP — integridade da gamificação (correções A1 + A2) — 2026-09-14
--
-- A1) completed_date passa a usar um timezone CANÔNICO fixo
--     (America/Sao_Paulo), imune à troca de profiles.timezone pelo usuário.
--     profiles.timezone continua existindo apenas para a UI; ele NUNCA mais
--     decide a data de uma conclusão. Alternar o fuso do perfil (ex.:
--     UTC-12 → UTC+14) não fabrica dias de conclusão.
--
-- A2) Exclusão de hábito nunca destrói histórico:
--   * completions.habit_id muda de ON DELETE CASCADE para ON DELETE RESTRICT;
--   * DELETE direto em habits é revogado de anon/authenticated;
--   * nova RPC delete_habit só exclui hábito SEM nenhuma conclusão;
--   * hábito com histórico deve ser arquivado (preserva completions, XP e
--     recompensas válidas).
--
-- Idempotente: pode ser reexecutado no SQL Editor. Atômico: tudo ou nada.

begin;

-- =====================================================================
-- A1 — Timezone canônico das regras de gamificação
-- =====================================================================

create or replace function public.gamification_tz()
returns text
language sql
stable
security invoker
set search_path = public
as $$
  select 'America/Sao_Paulo'::text;
$$;

create or replace function public.user_completed_date(p_user_id uuid, p_at timestamptz default now())
returns date
language sql
stable
security invoker
set search_path = public
as $$
  select (p_at at time zone public.gamification_tz())::date;
$$;

revoke all on function public.gamification_tz() from public, anon;
grant execute on function public.gamification_tz() to authenticated;

-- =====================================================================
-- A2 — Proteção do histórico de completions
-- =====================================================================

-- 1) FK RESTRICT: impedir que DELETE de hábito arraste o histórico por cascade.
alter table public.completions
  drop constraint if exists completions_habit_id_fkey;

alter table public.completions
  add constraint completions_habit_id_fkey
  foreign key (habit_id) references public.habits (id) on delete restrict;

-- 2) DELETE direto em habits sai do conjunto mínimo de privilégios
--    (exclusão passa exclusivamente pela RPC delete_habit).
revoke delete on table public.habits from anon, authenticated;

-- 3) RPC segura de exclusão — somente hábito com ZERO conclusões.
create or replace function public.delete_habit(p_habit_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'nao-autenticado';
  end if;

  if not exists (
    select 1 from public.habits
    where id = p_habit_id and user_id = v_user
  ) then
    raise exception 'habito-nao-encontrado';
  end if;

  if exists (
    select 1 from public.completions
    where habit_id = p_habit_id
  ) then
    raise exception 'habito-com-historico';
  end if;

  delete from public.habits
  where id = p_habit_id and user_id = v_user;

  -- Sem conclusões as estatísticas não mudam, mas garante consistência.
  perform public.sync_user_data(v_user);
end;
$$;

revoke all on function public.delete_habit(uuid) from public, anon;
grant execute on function public.delete_habit(uuid) to authenticated;

commit;
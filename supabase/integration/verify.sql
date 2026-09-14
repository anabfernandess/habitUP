-- =====================================================================
-- HabitUP — verify.sql
-- Verificação pós-migração para rodar NO SQL EDITOR do Supabase
-- (conecta como postgres/superuser). Idempotente.
--
-- O que faz:
--   * Cria 2 usuários de teste e verifica o perfil/estatística iniciais.
--   * Simula usuários autenticados com
--       set role authenticated + request.jwt.claims
--     para testar RLS, GRANTs e o comportamento das RPCs.
--   * Falha levantando exceção ('VERIFY FAIL: ...'). No fim imprime
--     'HABITUP VERIFY OK'.
--
-- Premissa: o servidor do Supabase está em UTC (padrão).
-- =====================================================================
-- ---------------------------------------------------------------
-- 0. Setup
-- ---------------------------------------------------------------
delete from auth.users
where email in ('u1-habitup-verify@test', 'u2-habitup-verify@test');
create temp table _habitup_verify (
  tag   text primary key,
  uid   uuid,
  habit uuid
);
grant select on _habitup_verify to authenticated, anon;
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
)
values
  (
    gen_random_uuid(), '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'u1-habitup-verify@test',
    crypt('senha-teste', gen_salt('bf')), now(),
    '{}'::jsonb, '{"name":"Verifica 1","timezone":"UTC"}'::jsonb,
    now(), now()
  ),
  (
    gen_random_uuid(), '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'u2-habitup-verify@test',
    crypt('senha-teste', gen_salt('bf')), now(),
    '{}'::jsonb, '{"name":"Verifica 2","timezone":"UTC"}'::jsonb,
    now(), now()
  );
insert into _habitup_verify (tag, uid)
select 'u1', id from auth.users where email = 'u1-habitup-verify@test'
union all
select 'u2', id from auth.users where email = 'u2-habitup-verify@test';
-- o trigger handle_new_user deve ter criado profile + stats
do $$
declare
  v_missing int;
begin
  select count(*) into v_missing
  from _habitup_verify v
  where not exists (select 1 from public.profiles p where p.id = v.uid)
     or not exists (select 1 from public.user_stats s where s.user_id = v.uid);
  if v_missing <> 0 then
    raise exception 'VERIFY FAIL: handle_new_user não criou profile/stats';
  end if;
end $$;
-- ---------------------------------------------------------------------
-- 1. GRANTs mínimos
-- ---------------------------------------------------------------------
do $$
begin
  if has_table_privilege('authenticated', 'public.user_stats', 'UPDATE') then
    raise exception 'VERIFY FAIL: authenticated pode atualizar user_stats';
  end if;
  if has_table_privilege('authenticated', 'public.completions', 'INSERT') then
    raise exception 'VERIFY FAIL: authenticated pode inserir em completions';
  end if;
  if has_table_privilege('authenticated', 'public.user_rewards', 'DELETE') then
    raise exception 'VERIFY FAIL: authenticated pode apagar user_rewards';
  end if;
  if not has_table_privilege('authenticated', 'public.user_stats', 'SELECT') then
    raise exception 'VERIFY FAIL: authenticated sem SELECT em user_stats';
  end if;
  if not has_table_privilege('authenticated', 'public.habits', 'INSERT') then
    raise exception 'VERIFY FAIL: authenticated sem INSERT em habits';
  end if;
  if has_table_privilege('anon', 'public.habits', 'SELECT') then
    raise exception 'VERIFY FAIL: anon com SELECT em habits';
  end if;
  if has_function_privilege('anon', 'public.complete_habit(uuid)', 'EXECUTE') then
    raise exception 'VERIFY FAIL: anon pode executar complete_habit';
  end if;
  if not has_function_privilege('authenticated', 'public.complete_habit(uuid)', 'EXECUTE') then
    raise exception 'VERIFY FAIL: authenticated sem execute em complete_habit';
  end if;
  if not has_schema_privilege('anon', 'public', 'USAGE') then
    raise exception 'VERIFY FAIL: anon sem USAGE no schema public';
  end if;
end $$;
-- ---------------------------------------------------------------------
-- 2. sync_user_data valida identidade (sem claims => negado)
-- ---------------------------------------------------------------------
select set_config('request.jwt.claims', '', false);
do $$
declare
  v_uid uuid;
  v_ok  boolean := false;
  v_msg text;
begin
  select uid into v_uid from _habitup_verify where tag = 'u1';
  begin
    perform public.sync_user_data(v_uid);
    exception when others then
      v_msg := sqlerrm;
      v_ok  := v_msg like '%nao-autorizado%';
  end;
  if not v_ok then
    raise exception 'VERIFY FAIL: sync_user_data sem identidade não foi negado (%)', v_msg;
  end if;
end $$;
-- ---------------------------------------------------------------------
-- 3. Aura 30 (30 dias consecutivos) + recompensas + avatar
--    Como postgres, semeia 29 dias consecutivos ANTES de hoje e conclui hoje
--    via complete_habit como autenticado u1 (request.jwt.claims).
-- ---------------------------------------------------------------------
do $$
declare
  v_uid uuid;
  v_hid uuid;
  v_cid uuid;
  v_count int;
  v_best  int;
  v_msg   text;
  v_ok    boolean;
begin
  select uid into v_uid from _habitup_verify where tag = 'u1';
  insert into public.habits (user_id, name, category, icon, color)
  values (v_uid, 'Hábito A', 'outros', 'check', '#8b5cf6')
  returning id into v_hid;
  update _habitup_verify set habit = v_hid where tag = 'u1';
  insert into public.completions (user_id, habit_id, completed_at, completed_date)
  select v_uid, v_hid, ((current_date - s) + time '12:00') at time zone 'UTC', current_date - s
  from generate_series(1, 29) s;
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', v_uid, 'role', 'authenticated')::text,
    false
  );
  -- conclui HOJE -> streak de 30 dias consecutivos
  perform public.complete_habit(v_hid);
  select count(*) into v_count from public.user_rewards where user_id = v_uid;
  if v_count <> 6 then
    raise exception 'VERIFY FAIL: esperava exatamente 6 recompensas no 30º dia, veio %', v_count;
  end if;
  -- as 6 válidas: 20/40/100/3/7/30 -> shirt, cap, outfit, faixa, jaqueta, aura
  select count(*) into v_count
  from public.user_rewards
  where user_id = v_uid and reward_id in (
    'shirt_first_step', 'cap_10', 'outfit_level5',
    'headband_streak3', 'jacket_streak7', 'aura_30'
  );
  if v_count <> 6 then
    raise exception 'VERIFY FAIL: conjunto de recompensas diverge do esperado (veio %)', v_count;
  end if;
  -- thresholds de 50/10 ainda NÃO concedidos neste estágio
  select count(*) into v_count
  from public.user_rewards
  where user_id = v_uid and reward_id in ('headphones_50', 'bg_level10');
  if v_count <> 0 then
    raise exception 'VERIFY FAIL: headphones_50/bg_level10 não deveriam existir no 30º dia (%)', v_count;
  end if;
  select count(*) into v_count
  from public.user_rewards where user_id = v_uid and reward_id = 'aura_30';
  if v_count <> 1 then
    raise exception 'VERIFY FAIL: aura_30 exige 30 dias consecutivos (não concedida)';
  end if;
  select best_streak into v_best from public.user_stats where user_id = v_uid;
  if v_best <> 30 then
    raise exception 'VERIFY FAIL: best_streak deveria ser 30, veio %', v_best;
  end if;
  -- equipa a aura (possui a recompensa => trigger de avatar aceita)
  update public.profiles
  set avatar_config = jsonb_set(avatar_config, '{effect}', '"aura_30"')
  where id = v_uid;
  -- desfazer a conclusão de hoje -> o apoio do 30º dia sai
  select id into v_cid
  from public.completions
  where user_id = v_uid and habit_id = v_hid and completed_date = current_date;
  perform public.undo_completion(v_cid);
  select count(*) into v_count
  from public.user_rewards where user_id = v_uid and reward_id = 'aura_30';
  if v_count <> 0 then
    raise exception 'VERIFY FAIL: aura_30 deveria ter sido revogada ao desfazer';
  end if;
  select best_streak into v_best from public.user_stats where user_id = v_uid;
  if v_best <> 29 then
    raise exception 'VERIFY FAIL: best_streak deveria recalcular para 29, veio %', v_best;
  end if;
  select count(*) into v_count
  from public.profiles
  where id = v_uid and coalesce(avatar_config->>'effect', '') <> '';
  if v_count <> 0 then
    raise exception 'VERIFY FAIL: avatar ainda está com a aura revogada';
  end if;
  -- ainda valem as conquistas de 29 dias (3 e 7 dias de streak)
  select count(*) into v_count
  from public.user_rewards
  where user_id = v_uid and reward_id in ('headband_streak3', 'jacket_streak7');
  if v_count <> 2 then
    raise exception 'VERIFY FAIL: streaks menores deveriam continuar válidas (%)', v_count;
  end if;
  v_ok := false;
  begin
    -- desfazer dia ANTERIOR deve ser bloqueado
    select id into v_cid
    from public.completions
    where user_id = v_uid and habit_id = v_hid and completed_date = current_date - 1;
    perform public.undo_completion(v_cid);
    exception when others then
      v_msg := sqlerrm;
      v_ok  := v_msg like '%conclusao-antiga%';
  end;
  if not v_ok then
    raise exception 'VERIFY FAIL: desfazer dia anterior não foi bloqueado (%)', v_msg;
  end if;
end $$;
-- ---------------------------------------------------------------------
-- 4. Phantom record: 0 conclusões => best_streak 0 (sem red trágico de 1)
--    e conclusão hoje/desfazer hoje/refazer sem duplicar XP (u2).
-- ---------------------------------------------------------------------
do $$
declare
  v_uid uuid;
  v_hid uuid;
  v_cid uuid;
  v_best int;
  v_total int;
  v_xp int;
begin
  select uid into v_uid from _habitup_verify where tag = 'u2';
  insert into public.habits (user_id, name, category, icon, color)
  values (v_uid, 'Hábito B', 'outros', 'check', '#10b981')
  returning id into v_hid;
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', v_uid, 'role', 'authenticated')::text,
    false
  );
  perform public.complete_habit(v_hid);
  select best_streak into v_best from public.user_stats where user_id = v_uid;
  if v_best <> 1 then
    raise exception 'VERIFY FAIL: best_streak deveria ser 1 após concluir hoje, veio %', v_best;
  end if;
  select id into v_cid from public.completions
  where user_id = v_uid and habit_id = v_hid and completed_date = current_date;
  perform public.undo_completion(v_cid);
  select best_streak, total_completions, total_xp into v_best, v_total, v_xp
  from public.user_stats where user_id = v_uid;
  if v_best <> 0 or v_total <> 0 or v_xp <> 0 then
    raise exception 'VERIFY FAIL: após desfazer tudo esperava 0/0/0 (veio %/%/%)', v_best, v_total, v_xp;
  end if;
  -- refaz hoje: sem duplicar XP
  perform public.complete_habit(v_hid);
  select total_completions, total_xp into v_total, v_xp
  from public.user_stats where user_id = v_uid;
  if v_total <> 1 or v_xp <> 20 then
    raise exception 'VERIFY FAIL: refazer duplicou XP (veio %/%)', v_total, v_xp;
  end if;
end $$;
-- ---------------------------------------------------------------------
-- 5. RLS / isolamento entre usuários (u2 autenticado vs dados do u1)
-- ---------------------------------------------------------------------
select set_config('request.jwt.claims', '', false);
set role authenticated;
select set_config(
  'request.jwt.claims',
  jsonb_build_object('sub', (select uid from _habitup_verify where tag = 'u2'),
                     'role', 'authenticated')::text,
  false
);
do $$
declare
  v_u1 uuid;
  v_n  int;
  v_msg text;
  v_ok boolean;
begin
  select uid into v_u1 from _habitup_verify where tag = 'u1';
  -- u2 não vê hábitos de u1
  select count(*) into v_n from public.habits where user_id = v_u1;
  if v_n <> 0 then raise exception 'VERIFY FAIL: u2 enxerga hábitos de u1 (%)', v_n; end if;
  -- u2 não vê stats/recompensas/conclusões de u1
  select count(*) into v_n from public.user_stats where user_id = v_u1;
  if v_n <> 0 then raise exception 'VERIFY FAIL: u2 enxerga stats de u1 (%)', v_n; end if;
  select count(*) into v_n from public.user_rewards where user_id = v_u1;
  if v_n <> 0 then raise exception 'VERIFY FAIL: u2 enxerga rewards de u1 (%)', v_n; end if;
  select count(*) into v_n from public.completions where user_id = v_u1;
  if v_n <> 0 then raise exception 'VERIFY FAIL: u2 enxerga conclusões de u1 (%)', v_n; end if;
  -- escrita direta em XP/estatísticas bloqueada (RLS sem política de update)
  v_ok := false;
  begin
    update public.user_stats set total_xp = 99999 where user_id = v_u1;
    exception when others then v_ok := true;
  end;
  if not v_ok then
    raise exception 'VERIFY FAIL: escrita direta em user_stats não foi bloqueada';
  end if;
  -- não pode alterar o próprio XP em user_stats (é só SELECT)
  v_ok := false;
  begin
    update public.user_stats set total_xp = 777
    where user_id = (select uid from _habitup_verify where tag = 'u2');
    exception when others then v_ok := true;
  end;
  if not v_ok then
    raise exception 'VERIFY FAIL: usuário conseguiu alterar o próprio XP';
  end if;
  -- equipar item bloqueado (aura sem possuir) bloqueado pela trigger
  v_ok := false;
  begin
    update public.profiles
    set avatar_config = jsonb_set(avatar_config, '{effect}', '"aura_30"')
    where id = (select uid from _habitup_verify where tag = 'u2');
    exception when others then
      v_msg := sqlerrm;
      v_ok  := v_msg like '%item-bloqueado%';
  end;
  if not v_ok then
    raise exception 'VERIFY FAIL: equipar item bloqueado não foi barrado (%)', v_msg;
  end if;
  -- u2 não consegue desfazer conclusão de u1 (não existe para ele)
  v_ok := false;
  begin
    perform public.undo_completion(gen_random_uuid());
    exception when others then v_ok := true;
  end;
  if not v_ok then
    raise exception 'VERIFY FAIL: op. não encontrada deveria falhar';
  end if;
end $$;
reset role;
select set_config('request.jwt.claims', '', false);
-- ---------------------------------------------------------------------
-- 6. Usuario autenticado pode executar as RPCs e ler o próprio perfil
-- ---------------------------------------------------------------------
set role authenticated;
select set_config(
  'request.jwt.claims',
  jsonb_build_object('sub', (select uid from _habitup_verify where tag = 'u1'),
                     'role', 'authenticated')::text,
  false
);
do $$
declare v_n int;
begin
  select count(*) into v_n from public.profiles
  where id = (select uid from _habitup_verify where tag = 'u1');
  if v_n <> 1 then raise exception 'VERIFY FAIL: u1 não lê o próprio perfil'; end if;
end $$;
reset role;
select set_config('request.jwt.claims', '', false);
-- ---------------------------------------------------------------------
-- 7. Timezone canônico: trocar profiles.timezone NÃO fabrica dias (A1)
-- ---------------------------------------------------------------------
do $$
declare
  v_uid uuid;
  v_hid uuid;
  v_date date;
  v_expected date;
  v_count int;
  v_msg text;
  v_ok boolean;
begin
  select uid into v_uid from _habitup_verify where tag = 'u1';
  insert into public.habits (user_id, name, category, icon, color)
  values (v_uid, 'TZ Teste A', 'outros', 'check', '#8b5cf6')
  returning id into v_hid;
  -- UTC-12 (POSIX invertido => Etc/GMT+12)
  update public.profiles set timezone = 'Etc/GMT+12' where id = v_uid;
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', v_uid, 'role', 'authenticated')::text,
    false
  );
  -- now() é estável dentro da transação do bloco => data determinística.
  select public.user_completed_date(v_uid) into v_expected;
  select completed_date into v_date from public.complete_habit(v_hid);
  if v_date <> v_expected then
    raise exception 'VERIFY FAIL: completed_date diverge do canônico SP (% <> %)',
      v_date, v_expected;
  end if;
  -- UTC+14 (Pacific/Kiritimati): o MESMO hábito não pode ser concluído de novo.
  update public.profiles set timezone = 'Pacific/Kiritimati' where id = v_uid;
  v_ok := false;
  begin
    perform public.complete_habit(v_hid);
    exception when others then
      v_msg := sqlerrm;
      v_ok := v_msg like '%ja-concluido%';
  end;
  if not v_ok then
    raise exception 'VERIFY FAIL: troca de timezone permitiu duplicar conclusão (%)', v_msg;
  end if;
  select count(*) into v_count from public.completions where habit_id = v_hid;
  if v_count <> 1 then
    raise exception 'VERIFY FAIL: era esperada 1 conclusão, veio %', v_count;
  end if;
  -- OUTRO hábito no MESMO dia canônico continua permitido.
  insert into public.habits (user_id, name, category, icon, color)
  values (v_uid, 'TZ Teste B', 'outros', 'check', '#10b981')
  returning id into v_hid;
  perform public.complete_habit(v_hid);
  select count(*) into v_count
  from public.completions
  where user_id = v_uid and completed_date = v_date;
  if v_count <> 2 then
    raise exception 'VERIFY FAIL: vários hábitos no mesmo dia deveriam contar 2, veio %', v_count;
  end if;
end $$;
select set_config('request.jwt.claims', '', false);
-- ---------------------------------------------------------------------
-- 8. Delete de hábito não destrói histórico (A2)
-- ---------------------------------------------------------------------
do $$
declare
  v_uid uuid;
  v_hid uuid;
  v_count int;
  v_xp int;
  v_bcount int;
  v_bxp int;
  v_rewards text;
  v_rew_after text;
  v_msg text;
  v_ok boolean;
begin
  select uid into v_uid from _habitup_verify where tag = 'u2';
  -- 8.1 hábito SEM histórico pode ser apagado via delete_habit
  insert into public.habits (user_id, name, category, icon, color)
  values (v_uid, 'SemHist', 'outros', 'check', '#8b5cf6')
  returning id into v_hid;
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', v_uid, 'role', 'authenticated')::text,
    false
  );
  perform public.delete_habit(v_hid);
  select count(*) into v_count from public.habits where id = v_hid;
  if v_count <> 0 then
    raise exception 'VERIFY FAIL: delete_habit sem histórico não apagou o hábito';
  end if;
  -- 8.2 hábito COM histórico NÃO pode ser apagado; arquivar preserva tudo
  insert into public.habits (user_id, name, category, icon, color)
  values (v_uid, 'ComHist', 'outros', 'check', '#8b5cf6')
  returning id into v_hid;
  insert into _habitup_verify (tag, uid)
  values ('u2-comhist', v_uid)
  on conflict (tag) do update set uid = excluded.uid, habit = excluded.habit;
  update _habitup_verify set habit = v_hid where tag = 'u2-comhist';
  select total_completions, total_xp into v_bcount, v_bxp
  from public.user_stats where user_id = v_uid;
  perform public.complete_habit(v_hid);
  v_ok := false;
  begin
    perform public.delete_habit(v_hid);
    exception when others then
      v_msg := sqlerrm;
      v_ok := v_msg like '%habito-com-historico%';
  end;
  if not v_ok then
    raise exception 'VERIFY FAIL: delete_habit permitiu apagar histórico (%)', v_msg;
  end if;
  select count(*) into v_count from public.completions where habit_id = v_hid;
  if v_count <> 1 then
    raise exception 'VERIFY FAIL: histórico foi perdido (completions=%)', v_count;
  end if;
  -- conjunto de recompensas APÓS a conclusão (antes de arquivar)
  select string_agg(reward_id, ',' order by reward_id) into v_rewards
  from public.user_rewards where user_id = v_uid;
  -- arquivar: completions, XP e recompensas válidas permanecem
  update public.habits set archived = true where id = v_hid;
  select total_completions, total_xp into v_count, v_xp
  from public.user_stats where user_id = v_uid;
  if v_count - v_bcount <> 1 or v_xp - v_bxp <> 20 then
    raise exception 'VERIFY FAIL: arquivar alterou estatísticas (%/%)', v_count, v_xp;
  end if;
  -- arquivar não pode adicionar nem remover recompensa alguma
  select string_agg(reward_id, ',' order by reward_id) into v_rew_after
  from public.user_rewards where user_id = v_uid;
  if v_rewards is distinct from v_rew_after then
    raise exception 'VERIFY FAIL: arquivar mudou o conjunto de recompensas (% <> %)',
      v_rewards, v_rew_after;
  end if;
end $$;
-- 8.3 DELETE direto em habits é bloqueado (grant revogado + FK RESTRICT)
set role authenticated;
select set_config(
  'request.jwt.claims',
  jsonb_build_object('sub', (select uid from _habitup_verify where tag = 'u2'),
                     'role', 'authenticated')::text,
  false
);
do $$
declare
  v_hid uuid;
  v_ok boolean;
begin
  select habit into v_hid from _habitup_verify where tag = 'u2-comhist';
  v_ok := false;
  begin
    delete from public.habits where id = v_hid;
    exception when others then
      v_ok := true;
  end;
  if not v_ok then
    raise exception 'VERIFY FAIL: DELETE direto em habits com histórico foi permitido';
  end if;
end $$;
reset role;
select set_config('request.jwt.claims', '', false);
-- 8.4 usuário não consegue apagar hábito de outro usuário
set role authenticated;
select set_config(
  'request.jwt.claims',
  jsonb_build_object('sub', (select uid from _habitup_verify where tag = 'u1'),
                     'role', 'authenticated')::text,
  false
);
do $$
declare
  v_hid uuid;
  v_msg text;
  v_ok boolean;
begin
  select habit into v_hid from _habitup_verify where tag = 'u2-comhist';
  v_ok := false;
  begin
    perform public.delete_habit(v_hid);
    exception when others then
      v_msg := sqlerrm;
      v_ok := v_msg like '%habito-nao-encontrado%';
  end;
  if not v_ok then
    raise exception 'VERIFY FAIL: delete_habit de outro usuário não foi bloqueado (%)', v_msg;
  end if;
end $$;
reset role;
select set_config('request.jwt.claims', '', false);
-- ---------------------------------------------------------------------
-- Fim
-- ---------------------------------------------------------------------
drop table _habitup_verify;
select 'HABITUP VERIFY OK' as resultado;

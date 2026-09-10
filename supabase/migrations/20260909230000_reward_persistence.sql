-- HabitUP
-- Consolida recompensas de dias anteriores.
-- Recompensas conquistadas no dia atual ainda podem ser revogadas
-- caso a conclusão que sustentou a conquista seja desfeita.

create or replace function public.sync_user_data(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_xp integer;
  v_level integer;
  v_best_run integer;
  v_earned text[];
  v_cfg jsonb;
  v_slot text;
  v_item text;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'nao-autorizado';
  end if;

  perform pg_advisory_xact_lock(
    hashtext('habitup:stats:' || p_user_id::text)::bigint
  );

  -- Recalcula conclusões, XP e nível
  select count(*) into v_count
  from public.completions
  where user_id = p_user_id;

  v_xp := v_count * 20;
  v_level := floor(v_xp / 100)::integer + 1;

  -- Recalcula a maior sequência válida
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

  -- Atualiza as estatísticas
  insert into public.user_stats
    (user_id, total_completions, total_xp, level, best_streak, updated_at)
  values
    (p_user_id, v_count, v_xp, v_level, v_best_run, now())
  on conflict (user_id) do update set
    total_completions = excluded.total_completions,
    total_xp = excluded.total_xp,
    level = excluded.level,
    best_streak = excluded.best_streak,
    updated_at = excluded.updated_at;

  -- Recompensas que o usuário atende neste momento
  v_earned := '{}'::text[];

  if v_count >= 1 then
    v_earned := array_append(v_earned, 'shirt_first_step'::text);
  end if;

  if v_count >= 10 then
    v_earned := array_append(v_earned, 'cap_10'::text);
  end if;

  if v_count >= 50 then
    v_earned := array_append(v_earned, 'headphones_50'::text);
  end if;

  if v_level >= 5 then
    v_earned := array_append(v_earned, 'outfit_level5'::text);
  end if;

  if v_level >= 10 then
    v_earned := array_append(v_earned, 'bg_level10'::text);
  end if;

  if v_best_run >= 3 then
    v_earned := array_append(v_earned, 'headband_streak3'::text);
  end if;

  if v_best_run >= 7 then
    v_earned := array_append(v_earned, 'jacket_streak7'::text);
  end if;

  if v_best_run >= 30 then
    v_earned := array_append(v_earned, 'aura_30'::text);
  end if;

  -- Só revoga recompensa não mais válida se ela foi conquistada HOJE.
  -- Recompensas de dias anteriores já são conquistas consolidadas.
  delete from public.user_rewards r
  where r.user_id = p_user_id
    and not (r.reward_id = any(v_earned))
    and public.user_completed_date(p_user_id, r.granted_at)
        = public.user_completed_date(p_user_id);

  -- Concede novas recompensas
  insert into public.user_rewards (user_id, reward_id)
  select p_user_id, r
  from unnest(v_earned) as r
  on conflict (user_id, reward_id) do nothing;

  -- Valida o avatar usando o inventário real do usuário
  select avatar_config
  into v_cfg
  from public.profiles
  where id = p_user_id;

  if v_cfg is not null then
    for v_slot in
      select key
      from jsonb_object_keys(v_cfg) as t(key)
    loop
      v_item := v_cfg ->> v_slot;

      if v_item is not null and v_item <> '' then

        if v_item in (
          'skin_light',
          'skin_tan',
          'skin_brown',
          'skin_deep',
          'hair_short',
          'hair_mohawk',
          'tee_default',
          'bg_default'
        ) or exists (
          select 1
          from public.user_rewards r
          where r.user_id = p_user_id
            and r.reward_id = v_item
        ) then
          continue;
        end if;

        case v_slot
          when 'skin' then
            v_cfg := v_cfg || '{"skin":"skin_light"}'::jsonb;

          when 'hair' then
            v_cfg := v_cfg || '{"hair":"hair_short"}'::jsonb;

          when 'top' then
            v_cfg := v_cfg || '{"top":"tee_default"}'::jsonb;

          when 'background' then
            v_cfg := v_cfg || '{"background":"bg_default"}'::jsonb;

          else
            v_cfg := jsonb_set(
              v_cfg,
              array[v_slot],
              'null'::jsonb
            );
        end case;

      end if;
    end loop;

    update public.profiles
    set avatar_config = v_cfg
    where id = p_user_id;
  end if;

end;
$$;
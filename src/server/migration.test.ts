import { describe, expect, it } from "vitest";
import migrationSql from "../../supabase/migrations/20260909_habitu_init.sql?raw";

/**
 * Contrato de segurança da migração — teste ESTÁTICO (sem banco).
 * Lê o arquivo SQL e valida as garantias que o Supabase DEVE oferecer ao
 * projeto: RLS em todas as tabelas, políticas somente-próprio, GRANTs
 * mínimos (sem escrita em estatísticas/recompensas/conclusões), funções
 * SECURITY DEFINER com search_path fixo, validação de identidade em
 * sync_user_data, desfazer somente hoje, advisory lock, trigger anti
 * item-bloqueado e normalização de timezone.
 *
 * Corre a cada `npm test`; a execução real no Postgres é feita por
 * `src/server/supabase.integration.test.ts` (opt-in) e
 * `supabase/integration/verify.sql`.
 */

// Normaliza espaços de alinhamento dos DDLs sem desfazer a quebra de linhas.
const sql = migrationSql.replace(/[ \t]+/g, " ");

const TABLES = ["profiles", "habits", "completions", "user_stats", "user_rewards"];

describe("Migração HabitUP (contrato de segurança)", () => {
  it("arquivo da migração existe e tem conteúdo", () => {
    expect(sql.length).toBeGreaterThan(1000);
  });

  it("ativa RLS em todas as tabelas", () => {
    for (const t of TABLES) {
      expect(sql).toContain(`alter table public.${t} enable row level security;`);
    }
  });

  it("políticas são somente-próprio e não permitem escrita direta em dados derivados", () => {
    for (const t of ["completions", "user_stats", "user_rewards"]) {
      expect(sql).toContain(`"${t}_select_own"`);
      // nenhuma política de insert/update/delete pode existir
      expect(sql).not.toContain(`"${t}_insert"`);
      expect(sql).not.toContain(`"${t}_update"`);
      expect(sql).not.toContain(`"${t}_delete"`);
    }
    for (const t of ["profiles", "habits"]) {
      expect(sql).toContain(`"${t}_select_own"`);
    }
  });

  it("declara GRANTs mínimos: anon sem tabelas e autenticado sem escrita em XP/estatísticas", () => {
    for (const t of TABLES) {
      expect(sql).toContain(`revoke all on table public.${t} from anon, authenticated;`);
      expect(sql).toContain(`revoke all on table public.${t} from anon;`);
    }
    // escrita permitida apenas em profiles (update) e habits (crud)
    expect(sql).toContain("grant select, update on public.profiles to authenticated;");
    expect(sql).toContain("grant select, insert, update, delete on public.habits to authenticated;");
    // somente leitura nos derivados
    for (const t of ["completions", "user_stats", "user_rewards"]) {
      expect(sql).toContain(`grant select on public.${t} to authenticated;`);
      expect(sql).not.toContain(`grant insert on public.${t}`);
      expect(sql).not.toContain(`grant update on public.${t}`);
      expect(sql).not.toContain(`grant delete on public.${t}`);
    }
  });

  it("funções críticas são SECURITY DEFINER com search_path fixo", () => {
    for (const fn of ["complete_habit", "undo_completion", "sync_user_data", "handle_new_user"]) {
      const pos = sql.indexOf(`create or replace function public.${fn}(`);
      expect(pos).toBeGreaterThan(-1);
      const slice = sql.slice(pos, pos + 180);
      expect(slice).toContain("security definer");
      expect(slice).toContain("set search_path = public");
    }
  });

  it("sync_user_data valida identidade e autorização (auth.uid() = p_user_id)", () => {
    expect(sql).toContain("nao-autorizado");
    expect(sql).toMatch(/auth\.uid\(\).*<>.*p_user_id/s);
  });

  it("sync_user_data serializa recálculos concorrentes por advisory lock", () => {
    expect(sql).toContain("pg_advisory_xact_lock");
    expect(sql).toContain("hashtext");
  });

  it("sync_user_data recalcula best_streak do histórico (sem greatest monotônico)", () => {
    expect(sql).toContain("best_streak");
    expect(sql).not.toContain("greatest(");
    expect(sql).not.toContain("v_prev_best");
  });

  it("undo_completion só permite desfazer o dia atual no fuso do usuário", () => {
    const pos = sql.indexOf("create or replace function public.undo_completion(");
    const slice = sql.slice(pos, sql.length);
    expect(slice).toContain("conclusao-antiga");
    expect(slice).toContain("user_completed_date");
  });

  it("revoga recompensas e limpa o avatar quando o apoio é removido", () => {
    expect(sql).toContain("delete from public.user_rewards");
    expect(sql).toContain("reward_id <> all (v_earned)");
    expect(sql).toContain("update public.profiles set avatar_config");
    expect(sql).toContain("skin_light");
  });

  it("equipar item não possuído é bloqueado por trigger (item-bloqueado)", () => {
    expect(sql).toContain("profiles_validate_avatar");
    expect(sql).toContain("item-bloqueado");
    expect(sql).toContain("profiles_avatar_check");
  });

  it("normaliza timezone para valores válidos do Postgres", () => {
    expect(sql).toContain("profiles_normalize_timezone");
    expect(sql).toContain("pg_timezone_names");
    expect(sql).toContain("profiles_tz_check");
  });

  it("Aura 30 exige 30 dias consecutivos (streak) e não 30 conclusões", () => {
    expect(sql).toContain("v_best_run >= 30 then v_earned := v_earned || 'aura_30'");
    expect(sql).not.toContain("v_count >= 30");
  });

  it("nenhuma função fica exposta a anon e funções de trigger são retidas", () => {
    for (const fn of [
      "complete_habit(uuid)",
      "undo_completion(uuid)",
      "sync_user_data(uuid)",
      "user_completed_date(uuid, timestamptz)",
      "handle_new_user()",
      "set_updated_at()",
    ]) {
      expect(sql).toContain(`revoke all on function public.${fn} from public, anon;`);
    }
    expect(sql).toContain("grant execute on function public.complete_habit(uuid) to authenticated;");
    expect(sql).toContain("grant execute on function public.undo_completion(uuid) to authenticated;");
    expect(sql).not.toContain("grant execute on function public.handle_new_user(");
  });
});
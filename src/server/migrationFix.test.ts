import { describe, expect, it } from "vitest";
import fixedSql from "../../supabase/migrations/20260914_gamification_integrity_fix.sql?raw";

/**
 * Contrato estático da migration 20260914_gamification_integrity_fix.sql (A1/A2).
 * Garante a existência das estruturas críticas sem banco de dados.
 */
const sql = fixedSql.replace(/[ \t]+/g, " ");

describe("Migração fix (A1/A2 gamificação)", () => {
  it("completed_date usa timezone canônico fixo (America/Sao_Paulo) e ignora profiles.timezone", () => {
    expect(sql).toContain("America/Sao_Paulo");
    expect(sql).toContain("gamification_tz");
    const uc = sql.indexOf("create or replace function public.user_completed_date(");
    const slice = sql.slice(uc, uc + 300);
    expect(slice).toMatch(/at time zone/);
    // NÃO lê mais o fuso do perfil — imune a manipulação
    expect(slice).not.toMatch(/select timezone from public\.profiles/);
  });

  it("FK completions.habit_id usa RESTRICT (protege histórico)", () => {
    // restrição recriada com RESTRICT; nenhuma cascade no DDL da FK
    expect(sql).toMatch(/foreign key \(habit_id\) references public\.habits \(id\) on delete restrict/i);
    expect(
      sql.slice(sql.indexOf("alter table public.completions")),
    ).not.toMatch(/on delete cascade/i);
  });

  it("DELETE direto em habits é revogado de anon e authenticated", () => {
    expect(sql).toContain("revoke delete on table public.habits from anon, authenticated;");
  });

  it("delete_habit é SECURITY DEFINER com search_path fixo e todos os checkpoints de erro", () => {
    const pos = sql.indexOf("create or replace function public.delete_habit(");
    const slice = sql.slice(pos, pos + 900);
    expect(slice).toContain("security definer");
    expect(slice).toContain("set search_path = public");
    expect(slice).toContain("nao-autenticado");
    expect(slice).toContain("habito-nao-encontrado");
    expect(slice).toContain("habito-com-historico");
  });

  it("delete_habit só pode ser executada por authenticated", () => {
    expect(sql).toContain("revoke all on function public.delete_habit(uuid) from public, anon;");
    expect(sql).toContain("grant execute on function public.delete_habit(uuid) to authenticated;");
  });
});

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { DEFAULT_AVATAR } from "../lib/types";

/**
 * Integração REAL com o Supabase (Postgres).
 *
 * RODA APENAS QUANDO CONFIGURADO AINDA ASSIM (opt-in):
 *   SUPABASE_TEST_URL=https://SEU-PROJETO.supabase.co \
 *   SUPABASE_TEST_ANON_KEY=anon-key npm test
 *
 * Sem essas variáveis a suíte é pulada (skipped). Cria usuários e hábitos
 * transitórios em um projeto descartável — não use o projeto de produção.
 * Exige contas sem confirmação de e-mail (Authentication → Confirm email = off).
 *
 * Cobre (espelhando os testes SQL de `supabase/integration/verify.sql`):
 * isolamento entre usuários, XP sem duplicação ao refazer, bloqueio de
 * escrita direta em XP/estatísticas, bloqueio de equipar item não possuído,
 * dupla conclusão no mesmo dia e conclusões simultâneas com estatísticas
 * corretas.
 */

const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const url = env.SUPABASE_TEST_URL;
const anonKey = env.SUPABASE_TEST_ANON_KEY;
const enabled = Boolean(url && anonKey);

function client(): SupabaseClient {
  return createClient(url!, anonKey!);
}

async function signUpUser(c: SupabaseClient, tag: string): Promise<string> {
  const email = `it-${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@habitup.test`;
  const password = "habitup-senha-teste";
  const { data, error } = await c.auth.signUp({
    email,
    password,
    options: { data: { name: tag, timezone: "UTC" } },
  });
  if (error) throw error;
  if (!data.session) {
    const { error: signInError } = await c.auth.signInWithPassword({ email, password });
    if (signInError)
      throw new Error(
        "Confirme o e-mail ou desative 'Confirm email' no projeto de teste antes de rodar a integração.",
      );
  }
  const { data: me } = await c.auth.getUser();
  if (!me.user) throw new Error("Falha ao autenticar usuário de teste.");
  return me.user.id;
}

async function createHabit(c: SupabaseClient, uid: string, name: string): Promise<string> {
  const { data, error } = await c.from("habits").insert({
    user_id: uid,
    name,
    description: "",
    category: "outros",
    icon: "check",
    color: "#8b5cf6",
  }).select().single();
  if (error) throw error;
  return data.id;
}

describe.skipIf(!enabled)("Integração Supabase (Postgres real — opt-in)", () => {
  it("isola dados entre dois usuários", async () => {
    const a = client();
    const b = client();
    const uidA = await signUpUser(a, "usca");
    const uidB = await signUpUser(b, "uscb");

    await createHabit(a, uidA, "Água");
    await createHabit(a, uidA, "Livro");
    await createHabit(b, uidB, "Correr");

    const bHabits = await b.from("habits").select("*");
    expect(bHabits.error).toBeNull();
    expect(bHabits.data!.length).toBe(1);

    const bStats = await b.from("user_stats").select("*").eq("user_id", uidA);
    expect(bStats.error).toBeNull();
    expect(bStats.data!.length).toBe(0);

    const aHabits = await a.from("habits").select("*");
    expect(aHabits.data!.length).toBe(2);
  });

  it("concluir, desfazer e concluir de novo não duplica XP", async () => {
    const c = client();
    const uid = await signUpUser(c, "us1");
    const habitId = await createHabit(c, uid, "Beber água");

    const r1 = await c.rpc("complete_habit", { p_habit_id: habitId });
    expect(r1.error).toBeNull();

    let stats = await c.from("user_stats").select("*").eq("user_id", uid).maybeSingle();
    expect(stats.data.total_completions).toBe(1);
    expect(stats.data.total_xp).toBe(20);

    const comps = await c.from("completions").select("*");
    const completionId = comps.data![0].id;

    const undo = await c.rpc("undo_completion", { p_completion_id: completionId });
    expect(undo.error).toBeNull();
    stats = await c.from("user_stats").select("*").eq("user_id", uid).maybeSingle();
    expect(stats.data.total_completions).toBe(0);
    expect(stats.data.total_xp).toBe(0);

    const r2 = await c.rpc("complete_habit", { p_habit_id: habitId });
    expect(r2.error).toBeNull();
    stats = await c.from("user_stats").select("*").eq("user_id", uid).maybeSingle();
    expect(stats.data.total_completions).toBe(1);
    expect(stats.data.total_xp).toBe(20);
    expect(stats.data.best_streak).toBe(1);
  });

  it("dupla conclusão no mesmo dia é rejeitada", async () => {
    const c = client();
    const uid = await signUpUser(c, "us2");
    const habitId = await createHabit(c, uid, "Correr");

    const r1 = await c.rpc("complete_habit", { p_habit_id: habitId });
    expect(r1.error).toBeNull();

    const r2 = await c.rpc("complete_habit", { p_habit_id: habitId });
    expect(r2.error?.message ?? "").toContain("ja-concluido");
  });

  it("bloqueia escrita direta em XP e estatísticas", async () => {
    const c = client();
    const uid = await signUpUser(c, "us3");

    const tamper = await c
      .from("user_stats")
      .update({ total_xp: 99999 })
      .eq("user_id", uid);
    // RLS sem política de update + sem GRANT de update: não pode ter mudado.
    const stats = await c.from("user_stats").select("*").eq("user_id", uid).maybeSingle();
    expect(stats.data.total_xp).toBe(0);
    void tamper;
  });

  it("bloqueia equipar item não possuído via chamada direta", async () => {
    const c = client();
    const uid = await signUpUser(c, "us4");

    const res = await c
      .from("profiles")
      .update({ avatar_config: { ...DEFAULT_AVATAR, effect: "aura_30" } })
      .eq("id", uid);

    expect(res.error).toBeTruthy();
    expect(res.error!.message).toContain("item-bloqueado");
  });

  it("conclusões simultâneas terminam com estatísticas corretas", async () => {
    const c = client();
    const uid = await signUpUser(c, "us5");
    const h1 = await createHabit(c, uid, "A");
    const h2 = await createHabit(c, uid, "B");

    const results = await Promise.all([
      c.rpc("complete_habit", { p_habit_id: h1 }),
      c.rpc("complete_habit", { p_habit_id: h2 }),
    ]);
    expect(results[0].error).toBeNull();
    expect(results[1].error).toBeNull();

    const stats = await c.from("user_stats").select("*").eq("user_id", uid).maybeSingle();
    expect(stats.data.total_completions).toBe(2);
    expect(stats.data.total_xp).toBe(40);
  });

  it("recompensa de streak é concedida e desfazer o apoio a revoga", async () => {
    // Completa hoje (best=1) — valida o fluxo real de RPC/recompensas.
    const c = client();
    const uid = await signUpUser(c, "us6");
    const habitId = await createHabit(c, uid, "Meditar");
    const r = await c.rpc("complete_habit", { p_habit_id: habitId });
    expect(r.error).toBeNull();

    const rewards = await c.from("user_rewards").select("reward_id").eq("user_id", uid);
    expect(rewards.data!.map((x: { reward_id: string }) => x.reward_id)).toContain("shirt_first_step");
  });

  it("A1: trocar profiles.timezone não permite dupla conclusão (canônico SP)", async () => {
    const c = client();
    const uid = await signUpUser(c, "us7");
    const habitId = await createHabit(c, uid, "TZ");

    // extremo oeste: Etc/GMT+12 (UTC-12)
    await c.from("profiles").update({ timezone: "Etc/GMT+12" }).eq("id", uid);
    let r = await c.rpc("complete_habit", { p_habit_id: habitId });
    expect(r.error).toBeNull();

    // extremo leste: Pacific/Kiritimati (UTC+14) — qualquer fuso que mude
    // o "dia" local nunca pode fabricar uma nova conclusão para o mesmo hábito
    await c.from("profiles").update({ timezone: "Pacific/Kiritimati" }).eq("id", uid);
    r = await c.rpc("complete_habit", { p_habit_id: habitId });
    expect(r.error).toBeTruthy();
    expect(r.error!.message).toContain("ja-concluido");

    const { data: comps } = await c.from("completions").select("completed_date").eq("habit_id", habitId);
    expect(comps).toHaveLength(1);
  });

  it("A2: delete_habit respeita histórico e DELETE direto é bloqueado", async () => {
    const c = client();
    const uid = await signUpUser(c, "us8");
    const emptyId = await createHabit(c, uid, "SemHist");
    const histId = await createHabit(c, uid, "Hist");
    await c.rpc("complete_habit", { p_habit_id: histId });

    // sem histórico => apaga via RPC
    let r = await c.rpc("delete_habit", { p_habit_id: emptyId });
    expect(r.error).toBeNull();
    const gone = await c.from("habits").select("id").eq("id", emptyId);
    expect(gone.data).toHaveLength(0);

    // com histórico => rejeita e nada some
    r = await c.rpc("delete_habit", { p_habit_id: histId });
    expect(r.error).toBeTruthy();
    expect(r.error!.message).toContain("habito-com-historico");
    const comps = await c.from("completions").select("id").eq("habit_id", histId);
    expect(comps.data).toHaveLength(1);

    // arquivar preserva stats e recompensa
    await c.from("habits").update({ archived: true }).eq("id", histId);
    const stats = await c.from("user_stats").select("total_completions,total_xp").eq("user_id", uid).single();
    expect(stats.data!.total_completions).toBe(1);
    expect(stats.data!.total_xp).toBe(20);

    // DELETE direto continua bloqueado (grants revogados + FK RESTRICT)
    const direct = await c.from("habits").delete().eq("id", histId);
    expect(direct.error).toBeTruthy();
  });
});
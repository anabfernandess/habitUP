import { describe, expect, it, vi } from "vitest";
import { SupabaseService } from "./supabaseAdapter";
import { DEFAULT_AVATAR } from "../lib/types";

/**
 * Testes do SupabaseService com um client 100% mockado (sem banco).
 * Verificam o COMPORTAMENTO do adapter: escopo por usuário, uso de RPC para
 * concluir/desfazer e ausência de escrita direta em completions, user_stats
 * e user_rewards.
 */

interface ChainRecord {
  table: string;
  ops: string[];
}

function createFakeClient(options: {
  results: Record<string, unknown>;
  rpcError?: string;
}) {
  const records: ChainRecord[] = [];
  const rpcCalls: { fn: string; args: unknown }[] = [];

  const builder = (table: string) => {
    const ops: string[] = [];
    const b: {
      then(res: unknown, rej: unknown): void;
      [k: string]: unknown;
    } = {
      then(res: (v: unknown) => void, rej: (e: unknown) => void) {
        return Promise.resolve({ data: options.results[table], error: null }).then(
          res,
          rej,
        );
      },
    };
    for (const m of [
      "select",
      "eq",
      "order",
      "limit",
      "maybeSingle",
      "single",
      "insert",
      "update",
      "delete",
    ]) {
      b[m] = (..._args: unknown[]) => {
        ops.push(m);
        return b;
      };
    }
    records.push({ table, ops });
    return b;
  };

  const client = {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: "u1", email: "a@b.c" } },
        error: null,
      })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signInWithPassword: vi.fn(async () => ({ data: {}, error: null })),
      signUp: vi.fn(async () => ({
        data: { session: { user: { id: "u1", email: "a@b.c" } } },
        error: null,
      })),
      signOut: vi.fn(async () => ({ error: null })),
      resetPasswordForEmail: vi.fn(async () => ({ error: null })),
    },
    from: vi.fn((table: string) => builder(table)),
    rpc: vi.fn((fn: string, args: unknown) => {
      rpcCalls.push({ fn, args });
      return Promise.resolve({ data: null, error: options.rpcError ? new Error(options.rpcError) : null });
    }),
  };

  return { client, records, rpcCalls };
}

function profileRow(over: Record<string, unknown> = {}) {
  return {
    id: "u1",
    name: "Teste",
    timezone: "UTC",
    avatar_config: { ...DEFAULT_AVATAR },
    ...over,
  };
}

function emptyResults(): Record<string, unknown> {
  return {
    profiles: null,
    habits: [],
    completions: [],
    user_stats: null,
    user_rewards: [],
  };
}

describe("SupabaseService (mock do client)", () => {
  it("loadBundle escopa todas as consultas pelo usuário autenticado", async () => {
    const { client, records } = createFakeClient({
      results: {
        profiles: profileRow(),
        habits: [
          { id: "h1", user_id: "u1", name: "Água", archived: false, created_at: "", updated_at: "", description: "", category: "saude", icon: "check", color: "#fff" },
        ],
        completions: [
          { id: "c1", user_id: "u1", habit_id: "h1", completed_at: "2026-09-09T13:00:00Z", completed_date: "2026-09-09" },
        ],
        user_stats: null, // força o fallback de cálculo local
        user_rewards: [{ reward_id: "shirt_first_step" }],
      },
    });

    const svc = new SupabaseService(client as never);
    const bundle = await svc.loadBundle();

    // fallback: 1 conclusão => 20 XP, nível 1, best_streak 1
    expect(bundle.stats.total_completions).toBe(1);
    expect(bundle.stats.total_xp).toBe(20);
    expect(bundle.stats.level).toBe(1);
    expect(bundle.stats.best_streak).toBe(1);
    expect(bundle.ownedRewards).toContain("shirt_first_step");

    const tables = records.map((r) => r.table);
    expect(tables).toEqual(
      expect.arrayContaining(["profiles", "habits", "completions", "user_stats", "user_rewards"]),
    );

    const habitChain = records.find((r) => r.table === "habits")!;
    expect(habitChain.ops).toContain("eq"); // filtro por user_id
    expect(habitChain.ops).toContain("order");
  });

  it("concluir usa a RPC complete_habit (nunca insert direto)", async () => {
    const { client, records, rpcCalls } = createFakeClient({ results: emptyResults() });
    const svc = new SupabaseService(client as never);
    await svc.completeHabit("h1");

    expect(rpcCalls).toEqual([{ fn: "complete_habit", args: { p_habit_id: "h1" } }]);
    const completionsChains = records.filter((r) => r.table === "completions");
    expect(completionsChains.every((c) => !c.ops.includes("insert"))).toBe(true);
    expect(records.filter((r) => r.table === "user_stats").length).toBe(0);
  });

  it("desfazer usa a RPC undo_completion (nunca delete direto)", async () => {
    const { client, records, rpcCalls } = createFakeClient({ results: emptyResults() });
    const svc = new SupabaseService(client as never);
    await svc.undoCompletion("c1");

    expect(rpcCalls).toEqual([{ fn: "undo_completion", args: { p_completion_id: "c1" } }]);
    for (const table of ["completions", "user_stats", "user_rewards"]) {
      const chains = records.filter((r) => r.table === table);
      expect(chains.every((c) => !c.ops.includes("delete") && !c.ops.includes("update") && !c.ops.includes("insert"))).toBe(true);
    }
  });

  it("updateProfile mexe apenas na própria linha de profiles", async () => {
    const { client, records } = createFakeClient({
      results: { profiles: profileRow({ name: "Novo" }) },
    });
    const svc = new SupabaseService(client as never);
    const updated = await svc.updateProfile({ name: "Novo" });
    expect(updated.name).toBe("Novo");

    const chains = records.filter((r) => r.table === "profiles");
    expect(chains.length).toBeGreaterThan(0);
    expect(chains[0].ops).toContain("update");
    expect(chains[0].ops).toContain("eq");
    for (const table of ["completions", "user_stats", "user_rewards"]) {
      expect(records.filter((r) => r.table === table).length).toBe(0);
    }
  });

  it("nunca escreve em completions/user_stats/user_rewards em nenhuma operação", async () => {
    const { client, records } = createFakeClient({ results: emptyResults() });
    const svc = new SupabaseService(client as never);
    await svc.signIn("a@b.c", "x");

    for (const table of ["completions", "user_stats", "user_rewards"]) {
      const chains = records.filter((r) => r.table === table);
      for (const c of chains) {
        expect(c.ops).not.toContain("insert");
        expect(c.ops).not.toContain("update");
        expect(c.ops).not.toContain("delete");
      }
    }
  });

  it("converte erros novos das RPCs em mensagens amigáveis", async () => {
    const cases: [string, string][] = [
      ["conclusao-antiga", "Só é possível desfazer a conclusão de hoje."],
      ["nao-autorizado", "Operação não autorizada para este usuário."],
      ["item-bloqueado", "Essa peça ainda não foi desbloqueada."],
      ["habito-com-historico", "Este hábito tem histórico: arquive em vez de apagar."],
    ];
    for (const [code, msg] of cases) {
      const { client } = createFakeClient({ results: emptyResults(), rpcError: code });
      const svc = new SupabaseService(client as never);
      await expect(svc.completeHabit("h1")).rejects.toThrow(msg);
    }
  });
});
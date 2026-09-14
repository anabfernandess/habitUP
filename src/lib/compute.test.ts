import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { activityHistory, todaySummary } from "./compute";
import type { Bundle, Profile } from "./types";
import { DEFAULT_AVATAR } from "./types";
import { mockNow, restoreRealTime } from "../test/setup";

beforeEach(() => mockNow("2026-09-09T13:00:00Z"));
afterEach(() => restoreRealTime());

function profile(over = {}): Profile {
  return {
    id: "u",
    name: "Teste",
    timezone: "UTC",
    avatar_config: DEFAULT_AVATAR,
    ...over,
  };
}

function bundle(over: Partial<Bundle> = {}): Bundle {
  return {
    profile: profile(),
    habits: [],
    completions: [],
    stats: {
      user_id: "u",
      total_completions: 0,
      total_xp: 0,
      level: 1,
      best_streak: 0,
    },
    ownedRewards: [],
    ...over,
  };
}

const iso = (id: string, habit_id: string, date: string) => ({
  id,
  user_id: "u",
  habit_id,
  completed_at: `${date}T12:00:00Z`,
  completed_date: date,
});

describe("todaySummary", () => {
  it("lista os hábitos ativos do dia com estado pendente/concluído", () => {
    const b = bundle({
      habits: [
        { id: "h1", user_id: "u", name: "Água", archived: false, created_at: "", updated_at: "", description: "", category: "saude", icon: "check", color: "#fff" },
        { id: "h2", user_id: "u", name: "Livro", archived: false, created_at: "", updated_at: "", description: "", category: "estudo", icon: "book", color: "#fff" },
      ],
      completions: [iso("c1", "h1", "2026-09-09")],
    });
    const s = todaySummary(b);
    expect(s.today).toBe("2026-09-09");
    expect(s.total).toBe(2);
    expect(s.done).toBe(1);
    expect(s.pct).toBe(50);
    expect(s.items[0].completion?.id).toBe("c1");
    expect(s.items[1].completion).toBeNull();
  });

  it("hábitos arquivados não aparecem no dia", () => {
    const b = bundle({
      habits: [
        { id: "h1", user_id: "u", name: "Antigo", archived: true, created_at: "", updated_at: "", description: "", category: "outros", icon: "check", color: "#fff" },
      ],
    });
    expect(todaySummary(b).total).toBe(0);
  });

  it("conta a sequência geral enquanto o dia está em aberto", () => {
    const b = bundle({
      habits: [
        { id: "h1", user_id: "u", name: "A", archived: false, created_at: "", updated_at: "", description: "", category: "outros", icon: "check", color: "#fff" },
      ],
      completions: [
        iso("c1", "h1", "2026-09-07"),
        iso("c2", "h1", "2026-09-08"),
      ],
    });
    const s = todaySummary(b);
    // hoje (09-09) ainda pendente, ontem concluído => sequência continua em 2
    expect(s.generalStreak).toBe(2);
  });

  it("hoje é o dia canônico (America/Sao_Paulo), não o fuso do perfil (A1)", () => {
    const habit = { id: "h1", user_id: "u", name: "A", archived: false, created_at: "", updated_at: "", description: "", category: "outros", icon: "check", color: "#fff" };
    // Kiritimati (UTC+14): em 09-09T13:00Z já é 09-10 lá, mas "hoje" da
    // gamificação é sempre o dia de São Paulo (09-09).
    const b = bundle({
      profile: profile({ timezone: "Pacific/Kiritimati" }),
      habits: [habit],
      completions: [iso("c1", "h1", "2026-09-09")],
    });
    const s = todaySummary(b);
    expect(s.today).toBe("2026-09-09");
    expect(s.done).toBe(1);
    expect(s.generalStreak).toBe(1);

    // UTC-12 (Etc/GMT+12): local ainda 09-09, mas hoje não pode "voltar"
    const b2 = bundle({
      profile: profile({ timezone: "Etc/GMT+12" }),
      habits: [habit],
      completions: [iso("c2", "h1", "2026-09-09")],
    });
    expect(todaySummary(b2).today).toBe("2026-09-09");
  });
});

describe("activityHistory", () => {
  it("gera os últimos dias com contagem", () => {
    const b = bundle({
      habits: [],
      completions: [iso("c1", "h1", "2026-09-09")],
    });
    const hist = activityHistory(b, 5);
    expect(hist).toHaveLength(5);
    expect(hist[4]).toEqual({ date: "2026-09-09", count: 1, done: true });
    expect(hist[3]).toEqual({ date: "2026-09-08", count: 0, done: false });
  });
});
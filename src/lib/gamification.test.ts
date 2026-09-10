import { describe, expect, it } from "vitest";
import {
  XP_PER_COMPLETION,
  levelFromXp,
  levelProgressFromXp,
  nextReward,
  rewardProgressPct,
  totalXp,
  unlockedRewardIds,
  REWARD_RULES,
} from "./gamification";
import type { UserStats } from "./types";

function stats(completions: number, bestStreak: number): UserStats {
  const xp = totalXp(completions);
  return {
    user_id: "u",
    total_completions: completions,
    total_xp: xp,
    level: levelFromXp(xp),
    best_streak: bestStreak,
  };
}

describe("XP e níveis", () => {
  it("cada conclusão vale 20 XP", () => {
    expect(totalXp(3)).toBe(60);
    expect(XP_PER_COMPLETION).toBe(20);
  });

  it("começa no nível 1", () => {
    expect(levelFromXp(0)).toBe(1);
  });

  it("a cada 100 XP sobe um nível (140 XP => nível 2)", () => {
    const p = levelProgressFromXp(140);
    expect(p.level).toBe(2);
    expect(p.current).toBe(40);
    expect(p.need).toBe(100);
    expect(p.next).toBe(3);
    expect(p.pct).toBe(40);
  });

  it("100 XP exatos => nível 2 com 0/100", () => {
    const p = levelProgressFromXp(100);
    expect(p.level).toBe(2);
    expect(p.current).toBe(0);
  });

  it("285 XP => nível 3 com 85/100", () => {
    const p = levelProgressFromXp(285);
    expect(p.level).toBe(3);
    expect(p.current).toBe(85);
  });
});

describe("conquistas", () => {
  it("primeira conclusão desbloqueia a camiseta Primeiro Passo", () => {
    const ids = unlockedRewardIds(stats(1, 0));
    expect(ids).toContain("shirt_first_step");
  });

  it("10 conclusões => boné", () => {
    expect(unlockedRewardIds(stats(10, 0))).toContain("cap_10");
  });

  it("5 conclusões ainda não liberam o boné", () => {
    expect(unlockedRewardIds(stats(5, 0))).not.toContain("cap_10");
  });

  it("50 conclusões => fones", () => {
    expect(unlockedRewardIds(stats(50, 5))).toContain("headphones_50");
  });

  it("sequência de 7 dias => jaqueta Consistência (e não é perdida)", () => {
    const ids = unlockedRewardIds(stats(0, 7));
    expect(ids).toContain("jacket_streak7");
    expect(ids).toContain("headband_streak3");
    // best_streak é monotônica: mesmo depois, se cai para 3, a jaqueta continua.
    expect(unlockedRewardIds(stats(0, 7))).toContain("jacket_streak7");
  });

  it("nível 5 => roupa especial; nível 10 => fundo excluisvo", () => {
    const s5 = stats(20, 0); // 20 * 20 = 400 XP => nível 5
    expect(s5.level).toBe(5);
    expect(unlockedRewardIds(s5)).toContain("outfit_level5");
    const s10 = stats(45, 0); // 900 XP => nível 10
    expect(s10.level).toBe(10);
    expect(unlockedRewardIds(s10)).toContain("bg_level10");
  });

  it("cada recompensa tem item, requisito e texto", () => {
    for (const r of REWARD_RULES) {
      expect(r.itemId).toBeTruthy();
      expect(r.requirementText.length).toBeGreaterThan(0);
      expect(r.value).toBeGreaterThan(0);
    }
  });

  it("nextReward aponta a mais próxima não desbloqueada", () => {
    const n = nextReward(stats(0, 0));
    expect(n?.id).toBe("shirt_first_step");
  });

  it("progresso fica limitado a 100%", () => {
    const r = REWARD_RULES.find((x) => x.value === 10)!;
    expect(rewardProgressPct(r, stats(99, 0))).toBe(100);
  });
});
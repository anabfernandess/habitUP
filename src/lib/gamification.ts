import type { UserStats } from "./types";

/**
 * Regras de gamificação (fonte única no frontend).
 *
 * - Cada conclusão válida de hábito concede 20 XP.
 * - O usuário começa no nível 1.
 * - A cada 100 XP acumulados, sobe-se um nível.
 *   Ex.: 140 XP → nível 2 com 40/100 para o nível 3.
 * - Perder um dia não remove o XP já conquistado.
 * - XP nunca vem do frontend: é derivado das conclusões no banco.
 */

export const XP_PER_COMPLETION = 20;
export const XP_PER_LEVEL = 100;

export function totalXp(totalCompletions: number): number {
  return totalCompletions * XP_PER_COMPLETION;
}

export function levelFromXp(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

export function xpForLevel(level: number): number {
  return (level - 1) * XP_PER_LEVEL;
}

export interface LevelProgress {
  level: number;
  current: number;
  need: number;
  next: number;
  pct: number;
}

export function levelProgressFromXp(xp: number): LevelProgress {
  const level = levelFromXp(xp);
  const current = xp - (level - 1) * XP_PER_LEVEL;
  const need = XP_PER_LEVEL;
  return { level, current, need, next: level + 1, pct: (current / need) * 100 };
}

export function statsLevelProgress(stats: UserStats): LevelProgress {
  return levelProgressFromXp(stats.total_xp);
}

export type RewardKind = "completions" | "streak";

export interface RewardRule {
  id: string;
  name: string;
  description: string;
  itemId: string;
  kind: RewardKind;
  value: number;
  /** Texto curto do requisito para exibir na interface. */
  requirementText: string;
}

export const REWARD_RULES: RewardRule[] = [
  {
    id: "shirt_first_step",
    name: "Primeiro Passo",
    description: "Camiseta para comemorar o primeiro hábito concluído.",
    itemId: "shirt_first_step",
    kind: "completions",
    value: 1,
    requirementText: "Conclua seu 1º hábito",
  },
  {
    id: "headband_streak3",
    name: "Faixa Esportiva",
    description: "3 dias seguidos de atividade. Continue no ritmo!",
    itemId: "headband_streak3",
    kind: "streak",
    value: 3,
    requirementText: "3 dias consecutivos de atividade",
  },
  {
    id: "jacket_streak7",
    name: "Jaqueta Consistência",
    description: "Uma semana inteira de dedicação. Impecável.",
    itemId: "jacket_streak7",
    kind: "streak",
    value: 7,
    requirementText: "7 dias consecutivos de atividade",
  },
  {
    id: "aura_30",
    name: "Aura de Mestre",
    description: "30 dias seguidos com pelo menos um hábito. Você irradia luz.",
    itemId: "aura_30",
    kind: "streak",
    value: 30,
    requirementText: "30 dias consecutivos de atividade",
  },
  {
    id: "cap_10",
    name: "Boné Veterano",
    description: "10 conclusões acumuladas. Rumo à insígnia!",
    itemId: "cap_10",
    kind: "completions",
    value: 10,
    requirementText: "10 hábitos concluídos no total",
  },
  {
    id: "headphones_50",
    name: "Fones de Foco",
    description: "50 conclusões acumuladas. Ninguém segura você.",
    itemId: "headphones_50",
    kind: "completions",
    value: 50,
    requirementText: "50 hábitos concluídos no total",
  },
  {
    id: "outfit_level5",
    name: "Aventureiro Nível 5",
    description: "Roupa especial desbloqueada ao alcançar o nível 5.",
    itemId: "outfit_level5",
    kind: "completions",
    value: 20,
    requirementText: "Alcance o nível 5 (20 hábitos concluídos)",
  },
  {
    id: "bg_level10",
    name: "Cenário Exclusivo",
    description: "Um fundo especial para quem chega ao nível 10.",
    itemId: "bg_level10",
    kind: "completions",
    value: 45,
    requirementText: "Alcance o nível 10 (45 hábitos concluídos)",
  },
];

export function rewardCurrentValue(rule: RewardRule, stats: UserStats): number {
  switch (rule.kind) {
    case "completions":
      return stats.total_completions;
    case "streak":
      return stats.best_streak;
  }
}

export function isRewardUnlocked(rule: RewardRule, stats: UserStats): boolean {
  return rewardCurrentValue(rule, stats) >= rule.value;
}

export function rewardProgressPct(rule: RewardRule, stats: UserStats): number {
  const current = rewardCurrentValue(rule, stats);
  return Math.min(100, Math.round((current / rule.value) * 100));
}

/** Conjunto de recompensas atualmente desbloqueadas, conforme as estatísticas. */
export function unlockedRewardIds(stats: UserStats): string[] {
  return REWARD_RULES.filter((r) => isRewardUnlocked(r, stats)).map((r) => r.id);
}

export function nextReward(stats: UserStats): RewardRule | null {
  const unlocked = new Set(unlockedRewardIds(stats));
  const locked = REWARD_RULES.filter((r) => !unlocked.has(r.id)).filter(
    (r) => rewardProgressPct(r, stats) < 100,
  );
  if (locked.length === 0) return null;
  locked.sort((a, b) => {
    const pa = rewardProgressPct(a, stats);
    const pb = rewardProgressPct(b, stats);
    if (pa !== pb) return pb - pa;
    return a.value - b.value;
  });
  return locked[0];
}
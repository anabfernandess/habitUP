export type Slot =
  | "skin"
  | "hair"
  | "top"
  | "headwear"
  | "accessory"
  | "background"
  | "effect";

export type AvatarConfig = {
  skin: string;
  hair: string;
  top: string;
  headwear: string | null;
  accessory: string | null;
  background: string | null;
  effect: string | null;
};

export const DEFAULT_AVATAR: AvatarConfig = {
  skin: "skin_light",
  hair: "hair_short",
  top: "tee_default",
  headwear: null,
  accessory: null,
  background: "bg_default",
  effect: null,
};

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface Completion {
  id: string;
  user_id: string;
  habit_id: string;
  completed_at: string;
  completed_date: string;
}

export interface UserStats {
  user_id: string;
  total_completions: number;
  total_xp: number;
  level: number;
  best_streak: number;
  updated_at?: string;
}

export interface Profile {
  id: string;
  name: string;
  timezone: string;
  avatar_config: AvatarConfig;
  created_at?: string;
  updated_at?: string;
}

export interface HabitInput {
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
}

export interface Bundle {
  profile: Profile;
  habits: Habit[];
  completions: Completion[];
  stats: UserStats;
  ownedRewards: string[];
}

export interface AuthUserInfo {
  id: string;
  email?: string;
  name?: string;
}

export type AuthMode = "supabase" | "demo";

export interface SessionInfo {
  mode: AuthMode;
  user: AuthUserInfo | null;
}

export const HABIT_CATEGORIES: { id: string; label: string }[] = [
  { id: "saude", label: "Saúde" },
  { id: "estudo", label: "Estudo" },
  { id: "trabalho", label: "Trabalho" },
  { id: "casa", label: "Casa" },
  { id: "bem-estar", label: "Bem-estar" },
  { id: "outros", label: "Outros" },
];

export const HABIT_ICONS: { id: string; glyph: string }[] = [
  { id: "check", glyph: "✔" },
  { id: "heart", glyph: "♥" },
  { id: "bolt", glyph: "⚡" },
  { id: "star", glyph: "★" },
  { id: "sun", glyph: "☀" },
  { id: "moon", glyph: "☾" },
  { id: "book", glyph: "📖" },
  { id: "dumbbell", glyph: "🏋" },
  { id: "water", glyph: "💧" },
  { id: "leaf", glyph: "🍃" },
];

export const PALETTE: string[] = [
  "#8b5cf6",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#ec4899",
  "#ef4444",
  "#14b8a6",
  "#a855f7",
];

export function iconGlyph(id: string): string {
  return HABIT_ICONS.find((i) => i.id === id)?.glyph ?? "✔";
}
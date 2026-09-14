import { nanoid } from "../lib/nanoid";
import {
  CANONICAL_GAMIFICATION_TZ,
  levelFromXp,
  totalXp,
  unlockedRewardIds,
} from "../lib/gamification";
import {
  DEFAULT_AVATAR,
  type AvatarConfig,
  type Bundle,
  type Completion,
  type Habit,
  type HabitInput,
  type Profile,
  type UserStats,
} from "../lib/types";
import { sanitizeAvatar, ownedItemIds } from "../lib/items";
import { bestStreak, todayKey } from "../lib/date";
import type {
  AppService,
  AuthUserInfo,
  HabitPatch,
  SignInResult,
  SignUpResult,
} from "../lib/service";

/**
 * MODO DEMONSTRATIVO
 * ------------------
 * Usado somente quando o Supabase não está configurado. Os dados ficam no
 * localStorage sob o prefixo `habitup:demo` e NUNCA se misturam com dados reais.
 * Não há senhas: é um usuário de teste fixo, claramente identificado na UI.
 */

const DB_KEY = "habitup:demo:db";
const SESSION_KEY = "habitup:demo:session";
const DEMO_USER_ID = "demo-user";

interface DemoDb {
  profile: Profile;
  habits: Habit[];
  completions: Completion[];
  stats: UserStats;
  ownedRewards: string[];
}

const demoUser: AuthUserInfo = {
  id: DEMO_USER_ID,
  email: "demo@habitup.app",
  name: "Viajante",
};

function tzOf(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Sao_Paulo";
  } catch {
    return "America/Sao_Paulo";
  }
}

function seedDb(): DemoDb {
  const now = new Date().toISOString();
  const profile: Profile = {
    id: DEMO_USER_ID,
    name: "Viajante",
    timezone: tzOf(),
    avatar_config: { ...DEFAULT_AVATAR },
    created_at: now,
    updated_at: now,
  };
  const db: DemoDb = {
    profile,
    habits: [],
    completions: [],
    stats: {
      user_id: DEMO_USER_ID,
      total_completions: 0,
      total_xp: 0,
      level: 1,
      best_streak: 0,
    },
    ownedRewards: [],
  };
  return db;
}

function readDb(): DemoDb {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw) as DemoDb;
  } catch {
    /* ignore */
  }
  const db = seedDb();
  persist(db);
  return db;
}

function persist(db: DemoDb) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function isSessionOpen(): boolean {
  return localStorage.getItem(SESSION_KEY) === "1";
}

/** Recalcula estatísticas e recompensas a partir das conclusões (igual ao backend real). */
function sync(db: DemoDb) {
  const count = db.completions.length;
  const xp = totalXp(count);
  const dates = db.completions.map((c) => c.completed_date);
  const best = bestStreak(dates);

  db.stats = {
    user_id: DEMO_USER_ID,
    total_completions: count,
    total_xp: xp,
    level: levelFromXp(xp),
    best_streak: best,
    updated_at: new Date().toISOString(),
  };
  db.ownedRewards = unlockedRewardIds(db.stats);

  // Igual ao backend real: remove do avatar peças que deixaram de ser
  // possuídas (ex.: recompensa revogada pela conclusão desfeita).
  db.profile.avatar_config = sanitizeAvatar(
    db.profile.avatar_config,
    ownedItemIds(db.ownedRewards),
  );
}

export class DemoService implements AppService {
  readonly mode = "demo" as const;
  readonly isRealAuth = false;

  getUser(): AuthUserInfo | null {
    return isSessionOpen() ? demoUser : null;
  }

  onAuthChange(cb: (user: AuthUserInfo | null) => void) {
    const notify = () => cb(isSessionOpen() ? demoUser : null);
    window.addEventListener("storage", notify);
    queueMicrotask(notify);
    return () => window.removeEventListener("storage", notify);
  }

  async signIn(_email: string, _password: string): Promise<SignInResult> {
    localStorage.setItem(SESSION_KEY, "1");
    return { ok: true };
  }

  async signUp(
    _email: string,
    _password: string,
    name: string,
  ): Promise<SignUpResult> {
    const db = readDb();
    db.profile.name = name.trim() || "Viajante";
    persist(db);
    localStorage.setItem(SESSION_KEY, "1");
    return { ok: true, needsConfirmation: false };
  }

  async signOut(): Promise<void> {
    localStorage.removeItem(SESSION_KEY);
  }

  async resetPassword(_email: string) {
    return { ok: true };
  }

  async loadBundle(): Promise<Bundle> {
    const db = readDb();
    return {
      profile: db.profile,
      habits: db.habits,
      completions: db.completions,
      stats: db.stats,
      ownedRewards: db.ownedRewards,
    };
  }

  async createHabit(input: HabitInput): Promise<Habit> {
    const db = readDb();
    const now = new Date().toISOString();
    const habit: Habit = {
      id: nanoid(),
      user_id: DEMO_USER_ID,
      name: input.name.trim(),
      description: input.description.trim(),
      category: input.category,
      icon: input.icon,
      color: input.color,
      archived: false,
      created_at: now,
      updated_at: now,
    };
    db.habits.push(habit);
    persist(db);
    return habit;
  }

  async updateHabit(id: string, patch: HabitPatch): Promise<Habit> {
    const db = readDb();
    const habit = db.habits.find((h) => h.id === id);
    if (!habit) throw new Error("not-found");
    Object.assign(habit, patch);
    habit.updated_at = new Date().toISOString();
    persist(db);
    return habit;
  }

  async archiveHabit(id: string): Promise<void> {
    const db = readDb();
    const habit = db.habits.find((h) => h.id === id);
    if (!habit) throw new Error("not-found");
    if (habit.archived) return;
    habit.archived = true;
    habit.updated_at = new Date().toISOString();
    persist(db);
  }

  async deleteHabit(id: string): Promise<void> {
    const db = readDb();
    const habit = db.habits.find((h) => h.id === id);
    if (!habit) throw new Error("habito-nao-encontrado");

    // Espelha a RPC delete_habit: histório (completions) nunca pode ser
    // destruído. Hábito com histórico deve ser arquivado.
    const hasHistory = db.completions.some((c) => c.habit_id === id);
    if (hasHistory) throw new Error("habito-com-historico");

    db.habits = db.habits.filter((h) => h.id !== id);
    sync(db);
    persist(db);
  }

  async completeHabit(habitId: string): Promise<void> {
    const db = readDb();
    const habit = db.habits.find(
      (h) => h.id === habitId && !h.archived,
    );
    if (!habit) throw new Error("not-found");

    // "Hoje" da gamificação é o dia canônico (America/Sao_Paulo), igual ao
    // servidor. Trocar profiles.timezone não fabrica dias de conclusão.
    const day = todayKey(CANONICAL_GAMIFICATION_TZ);
    const dup = db.completions.some(
      (c) => c.habit_id === habitId && c.completed_date === day,
    );
    if (dup) throw new Error("already-completed");

    db.completions.push({
      id: nanoid(),
      user_id: DEMO_USER_ID,
      habit_id: habitId,
      completed_at: new Date().toISOString(),
      completed_date: day,
    });
    sync(db);
    persist(db);
  }

  async undoCompletion(completionId: string): Promise<void> {
    const db = readDb();
    const idx = db.completions.findIndex(
      (c) => c.id === completionId && c.user_id === DEMO_USER_ID,
    );
    if (idx < 0) throw new Error("conclusao-nao-encontrada");

    // Só conclusões do dia atual (no fuso canônico da gamificação) podem ser
    // desfeitas.
    const day = todayKey(CANONICAL_GAMIFICATION_TZ);
    if (db.completions[idx].completed_date !== day) {
      throw new Error("conclusao-antiga");
    }

    db.completions.splice(idx, 1);
    sync(db);
    persist(db);
  }

  async updateProfile(patch: {
    name?: string;
    avatar_config?: AvatarConfig;
    timezone?: string;
  }): Promise<Profile> {
    const db = readDb();
    if (patch.name !== undefined) db.profile.name = patch.name.trim() || "Viajante";
    if (patch.timezone !== undefined) db.profile.timezone = patch.timezone;
    if (patch.avatar_config !== undefined) {
      db.profile.avatar_config = sanitizeAvatar(
        patch.avatar_config,
        ownedItemIds(db.ownedRewards),
      );
    }
    db.profile.updated_at = new Date().toISOString();
    persist(db);
    return db.profile;
  }
}
import type { Bundle, Completion, Habit } from "./types";
import { currentStreak, lastNDays, todayKey } from "./date";

export interface TodayHabitItem {
  habit: Habit;
  completion: Completion | null;
  streak: number;
}

export interface TodaySummary {
  today: string;
  items: TodayHabitItem[];
  done: number;
  total: number;
  pct: number;
  generalStreak: number;
}

export function todaySummary(
  bundle: Bundle,
  timezone?: string,
): TodaySummary {
  const today = todayKey(timezone);
  const active = bundle.habits.filter((h) => !h.archived);

  const doneByHabit = new Map<string, Completion>();
  for (const c of bundle.completions) {
    if (c.completed_date === today) doneByHabit.set(c.habit_id, c);
  }

  const items: TodayHabitItem[] = active.map((habit) => {
    const dates = bundle.completions
      .filter((c) => c.habit_id === habit.id)
      .map((c) => c.completed_date);
    return {
      habit,
      completion: doneByHabit.get(habit.id) ?? null,
      streak: currentStreak(dates, today),
    };
  });

  const done = items.filter((i) => i.completion).length;
  const total = items.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const generalStreak = currentStreak(
    bundle.completions.map((c) => c.completed_date),
    today,
  );

  return { today, items, done, total, pct, generalStreak };
}

export interface HabitHistoryEntry {
  date: string;
  count: number;
  done: boolean;
}

/** Histórico dos últimos `days` dias, para o mapa de atividade. */
export function activityHistory(
  bundle: Bundle,
  timezone: string | undefined,
  days = 90,
): HabitHistoryEntry[] {
  const today = todayKey(timezone);
  const counts = new Map<string, number>();
  for (const c of bundle.completions) {
    counts.set(c.completed_date, (counts.get(c.completed_date) ?? 0) + 1);
  }
  return lastNDays(today, days).map((date) => ({
    date,
    count: counts.get(date) ?? 0,
    done: (counts.get(date) ?? 0) > 0,
  }));
}
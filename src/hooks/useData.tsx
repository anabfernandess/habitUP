import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { appService } from "../lib/appService";
import type { AppService, HabitPatch } from "../lib/service";
import { REWARD_RULES, type RewardRule } from "../lib/gamification";
import { defaultItemForSlot, getItem, ownedItemIds, sanitizeAvatar } from "../lib/items";
import type { Bundle, HabitInput, Slot } from "../lib/types";
import { useAuth } from "./useAuth";

export interface Celebration {
  unlocks: RewardRule[];
  levelUp: number | null;
}

interface DataContextValue {
  bundle: Bundle | null;
  status: "loading" | "ready" | "error";
  error: string | null;
  reload(): Promise<void>;
  completeHabit(habitId: string): Promise<void>;
  undoCompletion(completionId: string): Promise<void>;
  busyHabit: string | null;
  busyUndo: string | null;
  createHabit(input: HabitInput): Promise<void>;
  updateHabit(id: string, patch: HabitPatch): Promise<void>;
  archiveHabit(id: string): Promise<void>;
  equipItem(itemId: string): Promise<void>;
  removeItem(slot: Slot): Promise<void>;
  updateName(name: string): Promise<void>;
  updateTimezone(tz: string): Promise<void>;
  celebration: Celebration | null;
  dismissCelebration(): void;
}

const DataContext = createContext<DataContextValue | null>(null);

const ruleById = (id: string) => REWARD_RULES.find((r) => r.id === id);

export function DataProvider({
  children,
  service,
}: {
  children: ReactNode;
  service: AppService;
}) {
  const { user } = useAuth();
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [busyHabit, setBusyHabit] = useState<string | null>(null);
  const [busyUndo, setBusyUndo] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const prevSnapshot = useRef<{ owned: Set<string>; level: number } | null>(null);

  const userId = user?.id ?? null;

  const load = useCallback(async () => {
    if (!userId) return;
    setStatus("loading");
    setError(null);
    try {
      let next = await service.loadBundle();

      // Nunca deixa uma peça não possuída equipada (ex.: recompensa revogada).
      const owned = ownedItemIds(next.ownedRewards);
      const sanitized = sanitizeAvatar(next.profile.avatar_config, owned);
      if (JSON.stringify(sanitized) !== JSON.stringify(next.profile.avatar_config)) {
        await service.updateProfile({ avatar_config: sanitized });
        next = await service.loadBundle();
      }

      const snap = prevSnapshot.current;
      if (snap) {
        const newUnlocks = next.ownedRewards
          .filter((id) => !snap.owned.has(id))
          .map((id) => ruleById(id))
          .filter((r): r is RewardRule => Boolean(r));
        const levelUp = next.stats.level > snap.level ? next.stats.level : null;
        if (newUnlocks.length > 0 || levelUp !== null) {
          setCelebration({ unlocks: newUnlocks, levelUp });
        }
      }

      setBundle(next);
      setStatus("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar dados.");
      setStatus("error");
    }
  }, [service, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const reload = useCallback(async () => {
    prevSnapshot.current = null;
    await load();
  }, [load]);

  const completeHabit = useCallback(
    async (habitId: string) => {
      setBusyHabit(habitId);
      try {
        prevSnapshot.current = bundle
          ? { owned: new Set(bundle.ownedRewards), level: bundle.stats.level }
          : null;
        await service.completeHabit(habitId);
        await load();
      } catch (e) {
        throw e;
      } finally {
        setBusyHabit(null);
      }
    },
    [bundle, load, service],
  );

  const undoCompletion = useCallback(
    async (completionId: string) => {
      setBusyUndo(completionId);
      try {
        prevSnapshot.current = bundle
          ? { owned: new Set(bundle.ownedRewards), level: bundle.stats.level }
          : null;
        await service.undoCompletion(completionId);
        await load();
      } catch (e) {
        throw e;
      } finally {
        setBusyUndo(null);
      }
    },
    [bundle, load, service],
  );

  const createHabit = useCallback(
    async (input: HabitInput) => {
      await service.createHabit(input);
      await reload();
    },
    [reload, service],
  );

  const updateHabit = useCallback(
    async (id: string, patch: HabitPatch) => {
      await service.updateHabit(id, patch);
      await reload();
    },
    [reload, service],
  );

  const archiveHabit = useCallback(
    async (id: string) => {
      await service.archiveHabit(id);
      await reload();
    },
    [reload, service],
  );

  const equipItem = useCallback(
    async (itemId: string) => {
      if (!bundle) return;
      const owned = new Set(ownedItemIds(bundle.ownedRewards));
      if (!owned.has(itemId)) return;
      const item = getItem(itemId);
      if (!item) return;
      const cfg = { ...bundle.profile.avatar_config };
      cfg[item.slot] = itemId;
      const updated = await service.updateProfile({ avatar_config: cfg });
      setBundle({ ...bundle, profile: { ...bundle.profile, ...updated } });
    },
    [bundle, service],
  );

  const removeItem = useCallback(
    async (slot: Slot) => {
      if (!bundle) return;
      const cfg = { ...bundle.profile.avatar_config };
      (cfg as Record<string, string | null>)[slot] = defaultItemForSlot(slot);
      const updated = await service.updateProfile({ avatar_config: cfg });
      setBundle({ ...bundle, profile: { ...bundle.profile, ...updated } });
    },
    [bundle, service],
  );

  const updateName = useCallback(
    async (name: string) => {
      const updated = await service.updateProfile({ name });
      setBundle((b) => (b ? { ...b, profile: { ...b.profile, ...updated } } : b));
    },
    [service],
  );

  const updateTimezone = useCallback(
    async (tz: string) => {
      await service.updateProfile({ timezone: tz });
      await reload();
    },
    [reload, service],
  );

  const dismissCelebration = useCallback(() => setCelebration(null), []);

  const value = useMemo<DataContextValue>(
    () => ({
      bundle,
      status,
      error,
      reload,
      completeHabit,
      undoCompletion,
      busyHabit,
      busyUndo,
      createHabit,
      updateHabit,
      archiveHabit,
      equipItem,
      removeItem,
      updateName,
      updateTimezone,
      celebration,
      dismissCelebration,
    }),
    [
      bundle,
      status,
      error,
      reload,
      completeHabit,
      undoCompletion,
      busyHabit,
      busyUndo,
      createHabit,
      updateHabit,
      archiveHabit,
      equipItem,
      removeItem,
      updateName,
      updateTimezone,
      celebration,
      dismissCelebration,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData fora do DataProvider");
  return ctx;
}

export function useDefaultService(): AppService {
  return appService;
}
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AvatarConfig,
  Bundle,
  Completion,
  Habit,
  HabitInput,
  Profile,
  UserStats,
} from "../lib/types";
import { levelFromXp, totalXp } from "../lib/gamification";
import { bestStreak } from "../lib/date";
import type {
  AppService,
  AuthUserInfo,
  HabitPatch,
  SignInResult,
  SignUpResult,
} from "../lib/service";

function friendlyError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("habito-nao-encontrado")) return "Hábito não encontrado.";
  if (m.includes("ja-concluido")) return "Você já concluiu este hábito hoje.";
  if (m.includes("conclusao-nao-encontrada")) return "Conclusão não encontrada.";
  if (m.includes("conclusao-antiga"))
    return "Só é possível desfazer a conclusão de hoje.";
  if (m.includes("nao-autorizado"))
    return "Operação não autorizada para este usuário.";
  if (m.includes("item-bloqueado"))
    return "Essa peça ainda não foi desbloqueada.";
  if (m.includes("nao-autenticado")) return "Sessão expirada. Entre novamente.";
  if (m.includes("invalid login credentials"))
    return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed"))
    return "Confirme seu e-mail antes de entrar.";
  if (m.includes("already registered") || m.includes("email_exists"))
    return "Este e-mail já está cadastrado.";
  if (m.includes("password should be"))
    return "A senha deve ter pelo menos 6 caracteres.";
  if (m.includes("rate limit"))
    return "Muitas tentativas. Aguarde um pouco e tente de novo.";
  if (m.includes("user_api_limit"))
    return "Limite de requisições atingido. Tente novamente em instantes.";
  return "Algo deu errado. Tente novamente.";
}

export class SupabaseService implements AppService {
  readonly mode = "supabase" as const;
  readonly isRealAuth = true;

constructor(private readonly supabase: SupabaseClient) {
  // Sincroniza o usuário atual em memória.
  void supabase.auth.getUser().then((r) => {
    const u = r.data.user;
    this.currentUser = u ? { id: u.id, email: u.email } : null;
  });
}

private currentUser: AuthUserInfo | null = null;

getUser(): AuthUserInfo | null {
  return this.currentUser;
}

onAuthChange(cb: (user: AuthUserInfo | null) => void) {
  const { data } = this.supabase.auth.onAuthStateChange((_event, session) => {
    const user = session?.user;
    this.currentUser = user ? { id: user.id, email: user.email } : null;
    cb(this.currentUser);
  });
  return () => data.subscription.unsubscribe();
}

  async signIn(email: string, password: string): Promise<SignInResult> {
    const { error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return { ok: false, error: friendlyError(error.message) };
    return { ok: true };
  }

  async signUp(
    email: string,
    password: string,
    name: string,
  ): Promise<SignUpResult> {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          timezone:
            Intl.DateTimeFormat().resolvedOptions().timeZone ||
            "America/Sao_Paulo",
        },
      },
    });
    if (error) return { ok: false, error: friendlyError(error.message) };
    const needsConfirmation = !data.session;
    return { ok: true, needsConfirmation };
  }

  async signOut(): Promise<void> {
    await this.supabase.auth.signOut();
  }

  async resetPassword(email: string) {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    return error ? { ok: false, error: friendlyError(error.message) } : { ok: true };
  }

  async loadBundle(): Promise<Bundle> {
    const userId = this.supabase.auth.getUser().then((r) => r.data.user?.id ?? null);
    const uid = await userId;
    if (!uid) throw new Error("auth-missing");

    const [profileRes, habitsRes, completionsRes, statsRes, rewardsRes] =
      await Promise.all([
        this.supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        this.supabase
          .from("habits")
          .select("*")
          .eq("user_id", uid)
          .order("created_at", { ascending: true }),
        this.supabase
          .from("completions")
          .select("*")
          .eq("user_id", uid)
          .order("completed_date", { ascending: true }),
        this.supabase.from("user_stats").select("*").eq("user_id", uid).maybeSingle(),
        this.supabase.from("user_rewards").select("reward_id").eq("user_id", uid),
      ]);

    const err = [
      profileRes.error,
      habitsRes.error,
      completionsRes.error,
      statsRes.error,
      rewardsRes.error,
    ].find(Boolean);
    if (err) throw err;

    const profile = profileRes.data as Profile;
    const habits = (habitsRes.data ?? []) as Habit[];
    const completions = (completionsRes.data ?? []) as Completion[];

    let stats = statsRes.data as UserStats | null;
    if (!stats) {
      const xp = totalXp(completions.length);
      stats = {
        user_id: uid,
        total_completions: completions.length,
        total_xp: xp,
        level: levelFromXp(xp),
        best_streak: bestStreak(completions.map((c) => c.completed_date)),
      };
    }

    const ownedRewards = ((rewardsRes.data ?? []) as { reward_id: string }[]).map(
      (r) => r.reward_id,
    );

    return { profile, habits, completions, stats, ownedRewards };
  }

  async createHabit(input: HabitInput): Promise<Habit> {
    const user = await this.supabase.auth.getUser();
    const { data, error } = await this.supabase
      .from("habits")
      .insert({
        user_id: user.data.user!.id,
        name: input.name.trim(),
        description: input.description.trim(),
        category: input.category,
        icon: input.icon,
        color: input.color,
      })
      .select()
      .single();
    if (error) throw error;
    return data as Habit;
  }

  async updateHabit(id: string, patch: HabitPatch): Promise<Habit> {
    const { data, error } = await this.supabase
      .from("habits")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as Habit;
  }

  async archiveHabit(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("habits")
      .update({ archived: true })
      .eq("id", id);
    if (error) throw error;
  }

  async completeHabit(habitId: string): Promise<void> {
    const { error } = await this.supabase.rpc("complete_habit", {
      p_habit_id: habitId,
    });
    if (error) throw new Error(friendlyError(error.message));
  }

  async undoCompletion(completionId: string): Promise<void> {
    const { error } = await this.supabase.rpc("undo_completion", {
      p_completion_id: completionId,
    });
    if (error) throw new Error(friendlyError(error.message));
  }

  async updateProfile(patch: {
    name?: string;
    avatar_config?: AvatarConfig;
    timezone?: string;
  }): Promise<Profile> {
    const uid = (await this.supabase.auth.getUser()).data.user?.id;
    if (!uid) throw new Error("auth-missing");
    const { data, error } = await this.supabase
      .from("profiles")
      .update(patch)
      .eq("id", uid)
      .select()
      .single();
    if (error) throw error;
    return data as Profile;
  }
}
import { isSupabaseConfigured, supabase } from "./supabase";
import { SupabaseService } from "../server/supabaseAdapter";
import { DemoService } from "../server/demoAdapter";
import type {
  AuthUserInfo,
  AvatarConfig,
  Bundle,
  Habit,
  HabitInput,
  Profile,
} from "./types";

export interface HabitPatch {
  name?: string;
  description?: string;
  category?: string;
  icon?: string;
  color?: string;
  archived?: boolean;
}

export type SignUpResult =
  | { ok: true; needsConfirmation: boolean }
  | { ok: false; error: string };

export type SignInResult = { ok: true } | { ok: false; error: string };

export interface AppService {
  mode: "supabase" | "demo";
  isRealAuth: boolean;
  getUser(): AuthUserInfo | null;
  onAuthChange(cb: (user: AuthUserInfo | null) => void): () => void;
  signIn(email: string, password: string): Promise<SignInResult>;
  signUp(
    email: string,
    password: string,
    name: string,
  ): Promise<SignUpResult>;
  signOut(): Promise<void>;
  resetPassword(email: string): Promise<{ ok: boolean; error?: string }>;
  loadBundle(): Promise<Bundle>;
  createHabit(input: HabitInput): Promise<Habit>;
  updateHabit(id: string, patch: HabitPatch): Promise<Habit>;
  archiveHabit(id: string): Promise<void>;
  completeHabit(habitId: string): Promise<void>;
  undoCompletion(completionId: string): Promise<void>;
  updateProfile(patch: {
    name?: string;
    avatar_config?: AvatarConfig;
    timezone?: string;
  }): Promise<Profile>;
}

export function createAppService(): AppService {
  if (isSupabaseConfigured) {
    return new SupabaseService(supabase!);
  }
  return new DemoService();
}

export type { AuthUserInfo, AvatarConfig, Bundle, Habit, HabitInput, Profile };
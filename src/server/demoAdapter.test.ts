import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DemoService } from "./demoAdapter";
import { mockNow, restoreRealTime } from "../test/setup";
import { DEFAULT_AVATAR, type Completion, type Habit } from "../lib/types";

const DB_KEY = "habitup:demo:db";

function seedCompletions(completions: Completion[], habits: Habit[]) {
  localStorage.setItem(
    DB_KEY,
    JSON.stringify({
      profile: {
        id: "demo-user",
        name: "Viajante",
        timezone: "UTC",
        avatar_config: { ...DEFAULT_AVATAR },
      },
      habits,
      completions,
      stats: { user_id: "demo-user", total_completions: 0, total_xp: 0, level: 1, best_streak: 0 },
      ownedRewards: [],
    }),
  );
}

const comp = (id: string, habit_id: string, date: string): Completion => ({
  id,
  user_id: "demo-user",
  habit_id,
  completed_at: `${date}T12:00:00Z`,
  completed_date: date,
});

describe("DemoService (modo demonstrativo)", () => {
  beforeEach(() => {
    localStorage.clear();
    mockNow("2026-09-09T13:00:00Z");
  });

  afterEach(() => {
    restoreRealTime();
  });

  it("abre sessão e carrega dados vazios", async () => {
    const svc = new DemoService();
    const res = await svc.signIn("a@b.c", "x");
    expect(res.ok).toBe(true);
    expect(svc.getUser()?.id).toBe("demo-user");
    const b = await svc.loadBundle();
    expect(b.habits).toEqual([]);
    expect(b.stats.total_xp).toBe(0);
    expect(b.ownedRewards).toEqual([]);
  });

  it("concluir dá XP e desbloqueia a Primeiro Passo", async () => {
    const svc = new DemoService();
    await svc.updateProfile({ timezone: "UTC" });
    await svc.createHabit({ name: "Beber água", description: "", category: "saude", icon: "water", color: "#3b82f6" });
    const b1 = await svc.loadBundle();
    await svc.completeHabit(b1.habits[0].id);
    const b2 = await svc.loadBundle();
    expect(b2.stats.total_completions).toBe(1);
    expect(b2.stats.total_xp).toBe(20);
    expect(b2.stats.level).toBe(1);
    expect(b2.ownedRewards).toContain("shirt_first_step");
  });

  it("impede conclusão duplicada no mesmo dia", async () => {
    const svc = new DemoService();
    await svc.updateProfile({ timezone: "UTC" });
    await svc.createHabit({ name: "A", description: "", category: "outros", icon: "check", color: "#8b5cf6" });
    const b = await svc.loadBundle();
    await svc.completeHabit(b.habits[0].id);
    await expect(svc.completeHabit(b.habits[0].id)).rejects.toThrow("already-completed");
  });

  it("desfazer corrige XP e revoga o que dependia daquela conclusão", async () => {
    const svc = new DemoService();
    await svc.updateProfile({ timezone: "UTC" });
    await svc.createHabit({ name: "A", description: "", category: "outros", icon: "check", color: "#8b5cf6" });
    const b0 = await svc.loadBundle();
    await svc.completeHabit(b0.habits[0].id);
    const b1 = await svc.loadBundle();
    expect(b1.ownedRewards).toContain("shirt_first_step");
    await svc.undoCompletion(b1.completions[0].id);
    const b2 = await svc.loadBundle();
    expect(b2.stats.total_xp).toBe(0);
    expect(b2.ownedRewards).not.toContain("shirt_first_step");
  });

  it("10 conclusões desbloqueiam o boné; desfazer uma revoga por falta de suporte", async () => {
    const svc = new DemoService();
    await svc.updateProfile({ timezone: "UTC" });
    for (let i = 0; i < 10; i++) {
      await svc.createHabit({ name: `H${i}`, description: "", category: "outros", icon: "check", color: "#8b5cf6" });
    }
    const b = await svc.loadBundle();
    for (const h of b.habits) await svc.completeHabit(h.id);
    const after = await svc.loadBundle();
    expect(after.ownedRewards).toContain("cap_10");

    await svc.undoCompletion(after.completions[0].id);
    const undone = await svc.loadBundle();
    expect(undone.stats.total_completions).toBe(9);
    expect(undone.ownedRewards).not.toContain("cap_10");
  });

  it("sequência: 3 dias consecutivos desbloqueiam a faixa e perder um dia por inércia não apaga o recorde", async () => {
    const svc = new DemoService();
    await svc.updateProfile({ timezone: "UTC" });
    await svc.createHabit({ name: "A", description: "", category: "outros", icon: "check", color: "#8b5cf6" });
    const b = await svc.loadBundle();
    // dias 06, 07, 08 concluídos (09 é hoje e está pendente = dia perdido por inércia)
    seedCompletions(
      [
        comp("c-day6", b.habits[0].id, "2026-09-06"),
        comp("c-day7", b.habits[0].id, "2026-09-07"),
        comp("c-day8", b.habits[0].id, "2026-09-08"),
      ],
      b.habits,
    );
    // qualquer nova conclusão força um sync com o histórico todo
    await svc.completeHabit(b.habits[0].id);
    const after = await svc.loadBundle();
    expect(after.stats.best_streak).toBe(4);
    expect(after.ownedRewards).toContain("headband_streak3");
    expect(after.ownedRewards).not.toContain("jacket_streak7");

    // nova conclusão de hoje + amanhã sem concluir: o registro de 4 dias continua
    await svc.signOut();
    mockNow("2026-09-10T13:00:00Z");
    await svc.signIn("a@b.c", "x");
    const idleDay = await svc.loadBundle();
    expect(idleDay.stats.best_streak).toBe(4);
    expect(idleDay.ownedRewards).toContain("headband_streak3");
  });

  it("desfazer a conclusão que sustentava uma conquista recalcula o recorde e revoga o item", async () => {
    const svc = new DemoService();
    await svc.updateProfile({ timezone: "UTC" });
    await svc.createHabit({ name: "A", description: "", category: "outros", icon: "check", color: "#8b5cf6" });
    const b = await svc.loadBundle();
    // melhor sequência antes de hoje: 2 (dias 07 e 08)
    seedCompletions(
      [
        comp("c-day7", b.habits[0].id, "2026-09-07"),
        comp("c-day8", b.habits[0].id, "2026-09-08"),
      ],
      b.habits,
    );
    await svc.completeHabit(b.habits[0].id); // hoje -> streak 3 -> faixa desbloqueada
    const after = await svc.loadBundle();
    expect(after.stats.best_streak).toBe(3);
    expect(after.ownedRewards).toContain("headband_streak3");

    // desfazer HOJE recalcula o recorde para 2 e revoga a faixa
    const todayComp = after.completions.find((c) => c.completed_date === "2026-09-09")!;
    await svc.undoCompletion(todayComp.id);
    const undone = await svc.loadBundle();
    expect(undone.stats.best_streak).toBe(2);
    expect(undone.ownedRewards).not.toContain("headband_streak3");
  });

  it("desfazer a conclusão que sustentava uma conquista revoga o item e tira do avatar", async () => {
    const svc = new DemoService();
    await svc.updateProfile({ timezone: "UTC" });
    for (let i = 0; i < 10; i++) {
      await svc.createHabit({ name: `H${i}`, description: "", category: "outros", icon: "check", color: "#8b5cf6" });
    }
    const b = await svc.loadBundle();
    for (const h of b.habits) await svc.completeHabit(h.id);
    const before = await svc.loadBundle();
    expect(before.ownedRewards).toContain("cap_10");

    // equipa o boné e depois desfaz 2 conclusões de hoje (suporte cai para 8)
    await svc.updateProfile({ avatar_config: { ...DEFAULT_AVATAR, headwear: "cap_10" } });
    await svc.undoCompletion((await svc.loadBundle()).completions[0].id);
    await svc.undoCompletion((await svc.loadBundle()).completions[0].id);
    const after = await svc.loadBundle();
    expect(after.stats.total_completions).toBe(8);
    expect(after.ownedRewards).not.toContain("cap_10");
    // o avatar já perdeu a peça revogada no próprio undo (igual ao banco)
    expect(after.profile.avatar_config.headwear).toBeNull();
  });

  it("impede desfazer conclusões de dias anteriores", async () => {
    const svc = new DemoService();
    await svc.updateProfile({ timezone: "UTC" });
    await svc.createHabit({ name: "A", description: "", category: "outros", icon: "check", color: "#8b5cf6" });
    const b = await svc.loadBundle();
    seedCompletions(
      [comp("c-old", b.habits[0].id, "2026-09-08")],
      b.habits,
    );
    await svc.completeHabit(b.habits[0].id); // hoje (09) também concluído
    const after = await svc.loadBundle();
    const old = after.completions.find((c) => c.id === "c-old")!;
    await expect(svc.undoCompletion(old.id)).rejects.toThrow("conclusao-antiga");
    const blocked = await svc.loadBundle();
    expect(blocked.completions).toHaveLength(2);
    expect(blocked.stats.total_completions).toBe(2);
  });

  it("concluir, desfazer e concluir de novo não duplica XP", async () => {
    const svc = new DemoService();
    await svc.updateProfile({ timezone: "UTC" });
    await svc.createHabit({ name: "A", description: "", category: "outros", icon: "check", color: "#8b5cf6" });
    const b = await svc.loadBundle();
    await svc.completeHabit(b.habits[0].id);
    let after = await svc.loadBundle();
    expect(after.stats.total_xp).toBe(20);

    await svc.undoCompletion(after.completions[0].id);
    after = await svc.loadBundle();
    expect(after.stats.total_xp).toBe(0);
    expect(after.stats.total_completions).toBe(0);

    await svc.completeHabit(b.habits[0].id);
    after = await svc.loadBundle();
    expect(after.stats.total_xp).toBe(20);
    expect(after.stats.total_completions).toBe(1);
    expect(after.completions).toHaveLength(1);
  });

  it("conclusões simultâneas terminam com estatísticas corretas", async () => {
    const svc = new DemoService();
    await svc.updateProfile({ timezone: "UTC" });
    await svc.createHabit({ name: "A", description: "", category: "outros", icon: "check", color: "#8b5cf6" });
    await svc.createHabit({ name: "B", description: "", category: "outros", icon: "check", color: "#8b5cf6" });
    const b = await svc.loadBundle();
    await Promise.all([svc.completeHabit(b.habits[0].id), svc.completeHabit(b.habits[1].id)]);
    const after = await svc.loadBundle();
    expect(after.stats.total_completions).toBe(2);
    expect(after.stats.total_xp).toBe(40);
    expect(after.completions).toHaveLength(2);
  });

  it("avatar não mantém peça que deixou de ser possuída", async () => {
    const svc = new DemoService();
    await svc.updateProfile({ timezone: "UTC" });
    for (let i = 0; i < 10; i++) {
      await svc.createHabit({ name: `H${i}`, description: "", category: "outros", icon: "check", color: "#8b5cf6" });
    }
    const b = await svc.loadBundle();
    for (const h of b.habits) await svc.completeHabit(h.id);
    // capacete: usa o boné, depois desfaz a conclusão que deu suporte a ele
    await svc.updateProfile({ avatar_config: { ...DEFAULT_AVATAR, headwear: "cap_10" } });
    const withCap = await svc.loadBundle();
    expect(withCap.profile.avatar_config.headwear).toBe("cap_10");
    await svc.undoCompletion(withCap.completions[0].id);
    const after = await svc.loadBundle();
    expect(after.ownedRewards).not.toContain("cap_10");
    // o DataProvider sanitiza o avatar com as peças possuídas na próxima atualização
    await svc.updateProfile({ avatar_config: after.profile.avatar_config });
    const sanitized = await svc.loadBundle();
    expect(sanitized.profile.avatar_config.headwear).toBeNull();
  });

  it("arquivar preserva histórico e remove do dia", async () => {
    const svc = new DemoService();
    await svc.updateProfile({ timezone: "UTC" });
    await svc.createHabit({ name: "A", description: "", category: "outros", icon: "check", color: "#8b5cf6" });
    const b = await svc.loadBundle();
    await svc.completeHabit(b.habits[0].id);
    await svc.archiveHabit(b.habits[0].id);
    const after = await svc.loadBundle();
    expect(after.habits[0].archived).toBe(true);
    expect(after.completions).toHaveLength(1);
    expect(after.stats.total_completions).toBe(1);
  });

  it("persistência após sair e voltar", async () => {
    const svc = new DemoService();
    await svc.updateProfile({ timezone: "UTC" });
    await svc.createHabit({ name: "Persistente", description: "", category: "outros", icon: "check", color: "#8b5cf6" });
    await svc.signOut();
    const svc2 = new DemoService();
    await svc2.signIn("a@b.c", "x");
    const b = await svc2.loadBundle();
    expect(b.habits[0].name).toBe("Persistente");
  });

  it("trocar o fuso do perfil não fabrica dias de conclusão (A1)", async () => {
    const svc = new DemoService();
    await svc.updateProfile({ timezone: "Etc/GMT+12" });
    await svc.createHabit({ name: "A", description: "", category: "outros", icon: "check", color: "#8b5cf6" });
    const b = await svc.loadBundle();
    // completar em 09-09 sob fuso do servidor
    await svc.completeHabit(b.habits[0].id);
    // mudar para fuso onde 09-09T13:00Z = 09-10 não deveria fabricar novo dia
    await svc.updateProfile({ timezone: "Pacific/Kiritimati" });
    await expect(svc.completeHabit(b.habits[0].id)).rejects.toThrow("already-completed");
    // mudança de fuso não removeu a conclusão existente
    const after = await svc.loadBundle();
    expect(after.completions).toHaveLength(1);
  });

  it("deleteHabit: sem histórico apaga, com histórico rejeita e preserva rewards", async () => {
    const svc = new DemoService();
    await svc.updateProfile({ timezone: "UTC" });
    await svc.createHabit({ name: "Lixo", description: "", category: "outros", icon: "check", color: "#8b5cf6" });
    await svc.createHabit({ name: "Arquivo", description: "", category: "outros", icon: "check", color: "#8b5cf6" });
    const b = await svc.loadBundle();
    const empty = b.habits.find((h) => h.name === "Lixo")!;
    const withComp = b.habits.find((h) => h.name === "Arquivo")!;

    // sem histórico => apaga
    await svc.deleteHabit(empty.id);
    const afterEmpty = await svc.loadBundle();
    expect(afterEmpty.habits.find((h) => h.id === empty.id)).toBeUndefined();

    // com histórico => rejeita
    await svc.completeHabit(withComp.id);
    await expect(svc.deleteHabit(withComp.id)).rejects.toThrow("habito-com-historico");

    // arquivar preserva rewards e XP (recompensa já desbloqueada com 1 conclusão)
    await svc.archiveHabit(withComp.id);
    const afterArchive = await svc.loadBundle();
    expect(afterArchive.habits.find((h) => h.id === withComp.id)?.archived).toBe(true);
    expect(afterArchive.completions).toHaveLength(1);
    expect(afterArchive.stats.total_completions).toBe(1);
    expect(afterArchive.stats.total_xp).toBe(20);
    expect(afterArchive.ownedRewards).toContain("shirt_first_step");
  });
});
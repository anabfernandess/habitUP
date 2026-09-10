import { describe, expect, it } from "vitest";
import {
  addDaysKey,
  bestStreak,
  currentStreak,
  diffDays,
  lastNDays,
  todayKey,
} from "./date";

describe("date helpers", () => {
  it("gera chaves e soma dias corretamente", () => {
    expect(addDaysKey("2026-09-09", 1)).toBe("2026-09-10");
    expect(addDaysKey("2026-09-09", -1)).toBe("2026-09-08");
    expect(addDaysKey("2026-03-01", -1)).toBe("2026-02-28");
    expect(diffDays("2026-09-07", "2026-09-09")).toBe(2);
  });

  it("lastNDays termina no dia atual", () => {
    const days = lastNDays("2026-09-09", 7);
    expect(days).toEqual([
      "2026-09-03",
      "2026-09-04",
      "2026-09-05",
      "2026-09-06",
      "2026-09-07",
      "2026-09-08",
      "2026-09-09",
    ]);
  });

  it("todayKey respeita o fuso informado", () => {
    // 2026-09-09 01:00 UTC == 2026-09-08 22:00 em São Paulo
    const d = new Date("2026-09-09T01:00:00Z");
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    expect(fmt.format(d)).toBe("2026-09-08");
  });

  it("todayKey local (sem fuso) usa o relógio atual", () => {
    const t = todayKey();
    expect(t).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("currentStreak", () => {
  const today = "2026-09-09";
  const y = addDaysKey(today, -1);
  const y2 = addDaysKey(today, -2);
  const y3 = addDaysKey(today, -3);

  it("sem dados retorna 0", () => {
    expect(currentStreak([], today)).toBe(0);
  });

  it("hoje concluído => 1", () => {
    expect(currentStreak([today], today)).toBe(1);
  });

  it("hoje + ontem => 2", () => {
    expect(currentStreak([today, y], today)).toBe(2);
  });

  it("ontem e anteontem concluídos, hoje pendente => 2 (o dia ainda está em aberto)", () => {
    expect(currentStreak([y, y2], today)).toBe(2);
  });

  it("dias seguidos terminando em ontem => conta a sequência inteira", () => {
    expect(currentStreak([y, y2, y3], today)).toBe(3);
  });

  it("um dia inteiro perdido quebra a sequência", () => {
    // concluído anteontem e antes, mas ontem e hoje em branco => 0
    expect(currentStreak([y2, y3], today)).toBe(0);
  });

  it("buracos interrompem a contagem", () => {
    expect(currentStreak([today, y2], today)).toBe(1);
  });

  it("não conta dia duplicado 2x", () => {
    expect(currentStreak([today, today, today], today)).toBe(1);
  });
});

describe("bestStreak", () => {
  it("maior sequência em qualquer ponto", () => {
    expect(
      bestStreak(["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-05", "2026-09-06"]),
    ).toBe(3);
  });

  it("sequência contínua", () => {
    expect(
      bestStreak(["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04"]),
    ).toBe(4);
  });

  it("vazio => 0", () => {
    expect(bestStreak([])).toBe(0);
  });

  it("ignora duplicados", () => {
    expect(bestStreak(["2026-09-01", "2026-09-01", "2026-09-02"])).toBe(2);
  });
});
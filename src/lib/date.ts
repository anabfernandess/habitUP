const pad = (n: number) => String(n).padStart(2, "0");

export function toKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Chave (YYYY-MM-DD) de "agora" no fuso do usuário, ou no fuso local se vazio. */
export function todayKey(timezone?: string): string {
  const now = new Date();
  if (!timezone) return toKey(now);
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(now);
}

export function addDaysKey(key: string, n: number): string {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

export function parseKey(key: string): Date {
  return fromKey(key);
}

export function keyCompare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function diffDays(fromKeyStr: string, toKeyStr: string): number {
  const a = fromKey(fromKeyStr).getTime();
  const b = fromKey(toKeyStr).getTime();
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

export function uniqueDates(dates: string[]): string[] {
  return Array.from(new Set(dates)).sort();
}

/** Últimos n dias terminando em `end` (inclusive), do mais antigo ao mais novo. */
export function lastNDays(end: string, n: number): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(addDaysKey(end, -i));
  return out;
}

/**
 * Sequência atual de dias consecutivos com atividade.
 * Regra: a sequência conta a partir de hoje (se hoje tem registro) ou de ontem
 * (se hoje ainda está pendente). Ela só é considerada zero quando não há
 * registro hoje nem ontem — um dia inteiro de falta quebra a sequência.
 */
export function currentStreak(dates: string[], nowKey: string): number {
  const set = new Set(dates);
  if (set.size === 0) return 0;

  let cursor: string;
  if (set.has(nowKey)) {
    cursor = nowKey;
  } else if (set.has(addDaysKey(nowKey, -1))) {
    cursor = addDaysKey(nowKey, -1);
  } else {
    return 0;
  }

  let count = 0;
  let d = cursor;
  while (set.has(d)) {
    count++;
    d = addDaysKey(d, -1);
  }
  return count;
}

/** Maior sequência (em qualquer ponto do histórico). */
export function bestStreak(dates: string[]): number {
  const sorted = uniqueDates(dates);
  if (sorted.length === 0) return 0;
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (diffDays(sorted[i - 1], sorted[i]) === 1) {
      run++;
    } else {
      run = 1;
    }
    if (run > best) best = run;
  }
  return best;
}
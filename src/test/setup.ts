import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => cleanup());

// Controles de fuso para testes determinísticos.
export function mockNow(iso: string) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(iso));
}

export function restoreRealTime() {
  vi.useRealTimers();
}

// localStorage para o ambiente node (usado pelo modo demonstrativo).
const store = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => void store.set(key, String(value)),
  removeItem: (key: string) => void store.delete(key),
  clear: () => store.clear(),
  key: (i: number) => Array.from(store.keys())[i] ?? null,
  get length() {
    return store.size;
  },
};

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  configurable: true,
  writable: true,
});

if (!("window" in globalThis)) {
  Object.defineProperty(globalThis, "window", {
    value: globalThis,
    configurable: true,
  });
}
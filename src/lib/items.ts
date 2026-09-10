import type { AvatarConfig, Slot } from "./types";
import { DEFAULT_AVATAR } from "./types";

/**
 * Catálogo de peças do avatar (assets próprios, em SVG).
 * Itens `free` estão sempre disponíveis. Itens com `rewardId` são
 * desbloqueados ao conquistar a recompensa correspondente.
 */

export interface AvatarItemDef {
  id: string;
  name: string;
  description: string;
  slot: Slot;
  category: string;
  free: boolean;
  rewardId?: string;
}

export interface InventoryCategory {
  id: string;
  label: string;
  slot: Slot;
}

export const INVENTORY_CATEGORIES: InventoryCategory[] = [
  { id: "pele", label: "Tom de pele", slot: "skin" },
  { id: "cabelo", label: "Cabelo e chapéus", slot: "hair" },
  { id: "roupa", label: "Roupas", slot: "top" },
  { id: "acessorio", label: "Acessórios", slot: "accessory" },
  { id: "fundo", label: "Fundos", slot: "background" },
  { id: "efeito", label: "Efeitos", slot: "effect" },
];

const ITEMS: AvatarItemDef[] = [
  // ---- Peles (sempre disponíveis) ----
  { id: "skin_light", name: "Pele clara", description: "Tom de pele claro.", slot: "skin", category: "pele", free: true },
  { id: "skin_tan", name: "Pele média", description: "Tom de pele médio.", slot: "skin", category: "pele", free: true },
  { id: "skin_brown", name: "Pele bronzeada", description: "Tom de pele bronzeado.", slot: "skin", category: "pele", free: true },
  { id: "skin_deep", name: "Pele escura", description: "Tom de pele escuro.", slot: "skin", category: "pele", free: true },

  // ---- Cabelo (básico gratuito) ----
  { id: "hair_short", name: "Corte curto", description: "Um corte simples e prático.", slot: "hair", category: "cabelo", free: true },
  { id: "hair_mohawk", name: "Moicano", description: "Estilo ousado para aventureiros.", slot: "hair", category: "cabelo", free: true },

  // ---- Chapéus (desbloqueáveis) ----
  { id: "cap_10", name: "Boné Veterano", description: "Boné esportivo da equipe HabitUP.", slot: "headwear", category: "cabelo", free: false, rewardId: "cap_10" },

  // ---- Roupas ----
  { id: "tee_default", name: "Camiseta básica", description: "A clássica camiseta branca.", slot: "top", category: "roupa", free: true },
  { id: "shirt_first_step", name: "Camiseta Primeiro Passo", description: "Sua primeira conquista, estampada no peito.", slot: "top", category: "roupa", free: false, rewardId: "shirt_first_step" },
  { id: "jacket_streak7", name: "Jaqueta Consistência", description: "Feita para quem não para.", slot: "top", category: "roupa", free: false, rewardId: "jacket_streak7" },
  { id: "outfit_level5", name: "Traje Nível 5", description: "Armadura leve de quem está subindo de nível.", slot: "top", category: "roupa", free: false, rewardId: "outfit_level5" },

  // ---- Acessórios ----
  { id: "headband_streak3", name: "Faixa Esportiva", description: "Uma faixa para os dias de treino.", slot: "accessory", category: "acessorio", free: false, rewardId: "headband_streak3" },
  { id: "headphones_50", name: "Fones de Foco", description: "Fones para mergulhar no flow.", slot: "accessory", category: "acessorio", free: false, rewardId: "headphones_50" },

  // ---- Fundos ----
  { id: "bg_default", name: "Arena básica", description: "O ponto de partida de todo herói.", slot: "background", category: "fundo", free: true },
  { id: "bg_level10", name: "Vale Neon", description: "Um paraíso de cores só para os fortes.", slot: "background", category: "fundo", free: false, rewardId: "bg_level10" },

  // ---- Efeitos ----
  { id: "aura_30", name: "Aura de Mestre", description: "Um brilho dourado ao redor do personagem.", slot: "effect", category: "efeito", free: false, rewardId: "aura_30" },
];

export const ITEM_MAP: Record<string, AvatarItemDef> = Object.fromEntries(
  ITEMS.map((i) => [i.id, i]),
);

export function getItem(id: string | null): AvatarItemDef | null {
  if (!id) return null;
  return ITEM_MAP[id] ?? null;
}

export function itemsForCategory(categoryId: string): AvatarItemDef[] {
  return ITEMS.filter((i) => i.category === categoryId);
}

/** Item padrão (gratuito) de cada slot, usado ao remover uma peça. */
export function defaultItemForSlot(slot: Slot): string | null {
  switch (slot) {
    case "skin":
      return "skin_light";
    case "hair":
      return "hair_short";
    case "top":
      return "tee_default";
    case "background":
      return "bg_default";
    case "headwear":
    case "accessory":
    case "effect":
      return null;
  }
}

/** Garante que o avatar só contenha peças que o usuário possui. */
export function sanitizeAvatar(
  config: Partial<AvatarConfig> | null | undefined,
  ownedItemIds: string[],
): AvatarConfig {
  const base = { ...DEFAULT_AVATAR, ...config };
  const owned = new Set(ownedItemIds);
  const result: AvatarConfig = { ...base };
  (Object.keys(base) as Slot[]).forEach((slot) => {
    const v = base[slot] as string | null;
    if (v === null) return;
    const item = getItem(v);
    const isFree = item?.free === true;
    if (!item || (!isFree && !owned.has(item.id))) {
      (result as Record<string, string | null>)[slot] = defaultItemForSlot(slot);
    }
  });
  return result;
}

/** Conjunto de ids de peças que o usuário possui (gratuitas + recompensas). */
export function ownedItemIds(ownedRewards: string[]): string[] {
  const free = ITEMS.filter((i) => i.free).map((i) => i.id);
  const rewardItems = new Set<string>();
  for (const rewardId of ownedRewards) {
    const item = ITEMS.find((i) => i.rewardId === rewardId);
    if (item) rewardItems.add(item.id);
  }
  return Array.from(new Set([...free, ...rewardItems]));
}
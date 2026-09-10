import { useState } from "react";
import { useData } from "../hooks/useData";
import {
  INVENTORY_CATEGORIES,
  itemsForCategory,
  getItem,
} from "../lib/items";
import { REWARD_RULES, rewardProgressPct, isRewardUnlocked } from "../lib/gamification";
import { ownedItemIds } from "../lib/items";
import { AvatarPreview } from "../avatar/AvatarPreview";
import { Screen, LoadingScreen, ErrorScreen } from "../components/States";
import { LockIcon } from "../components/icons";
import type { AvatarConfig, Slot } from "../lib/types";
import { useToast } from "../components/Toast";

export function Avatar() {
  const { bundle, status, reload, equipItem, removeItem } = useData();
  const toast = useToast();
  const [categoryId, setCategoryId] = useState(INVENTORY_CATEGORIES[0].id);
  const [heroConfig, setHeroConfig] = useState<AvatarConfig | null>(null);

  if (status === "loading" || !bundle) return <LoadingScreen />;
  if (status === "error") return <ErrorScreen onRetry={reload} />;

  const { profile, stats, ownedRewards } = bundle;
  const owned = ownedItemIds(ownedRewards);
  const category = INVENTORY_CATEGORIES.find((c) => c.id === categoryId)!;
  const items = itemsForCategory(categoryId);
  const config = heroConfig ?? profile.avatar_config;

  const ruleFor = (rewardId?: string) =>
    REWARD_RULES.find((r) => r.id === rewardId);

  const previewOf = (itemId: string): AvatarConfig => {
    const item = getItem(itemId);
    return { ...config, [item!.slot]: itemId };
  };

  const onEquip = async (itemId: string) => {
    await equipItem(itemId);
    setHeroConfig(null);
    toast.show("Peça equipada!");
  };

  const onRemove = async (slot: Slot) => {
    await removeItem(slot);
    setHeroConfig(null);
    toast.show("Peça removida");
  };

  return (
    <Screen title="Avatar" subtitle="Monte seu personagem com as peças que desbloquear.">
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="avatar-canvas" style={{ borderRadius: 0, border: "none" }}>
          <AvatarPreview config={config} width="100%" />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
          }}
        >
          <span style={{ fontSize: 13, color: "var(--muted)" }}>
            Nível {stats.level} · {stats.total_xp} XP
          </span>
          {config !== profile.avatar_config && (
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => setHeroConfig(null)}
            >
              Voltar ao equipado
            </button>
          )}
        </div>
      </div>

      <h2 className="section-title">Inventário</h2>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {INVENTORY_CATEGORIES.map((c) => (
          <button
            key={c.id}
            className={`chip ${category.id === c.id ? "active" : ""}`}
            onClick={() => setCategoryId(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="inventory-grid">
        {items.map((item) => {
          const equipped = config[item.slot] === item.id;
          const has = owned.includes(item.id);
          const rule = ruleFor(item.rewardId);
          const unlocked = rule ? isRewardUnlocked(rule, stats) : has;
          const lockProgress = rule ? rewardProgressPct(rule, stats) : 0;

          return (
            <div
              key={item.id}
              className={`inventory-item ${has ? "owned" : "locked"} ${equipped ? "equipped" : ""}`}
            >
              <div className="inventory-thumb">
                <AvatarPreview config={previewOf(item.id)} width={64} />
              </div>
              <strong style={{ fontSize: 12, textAlign: "center", lineHeight: 1.25 }}>
                {item.name}
              </strong>

              {equipped ? (
                <button className="btn btn-sm btn-success" style={{ width: "100%" }} disabled>
                  Equipado
                </button>
              ) : unlocked ? (
                <button className="btn btn-sm" style={{ width: "100%" }} onClick={() => onEquip(item.id)}>
                  Equipar
                </button>
              ) : (
                <span style={{ fontSize: 11.5, color: "var(--muted)", display: "flex", gap: 4, alignItems: "center", justifyContent: "center" }}>
                  <LockIcon size={12} /> {rule?.requirementText}
                </span>
              )}

              {equipped && ["headwear", "accessory", "effect"].includes(item.slot) && (
                <button
                  className="btn btn-sm btn-ghost"
                  style={{ width: "100%" }}
                  onClick={() => onRemove(item.slot as Slot)}
                >
                  Remover
                </button>
              )}
              {equipped && lockProgress < 100 && !has && (
                <div className="progress" style={{ width: "100%", height: 6 }}>
                  <div className="progress-fill amber" style={{ width: `${lockProgress}%` }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 14 }}>
        Peças desbloqueadas por conquistas nunca são perdidas (mesmo se você
        perder uma sequência). Cadeados mostram o requisito e o progresso.
      </p>
    </Screen>
  );
}
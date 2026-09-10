import { useData } from "../hooks/useData";
import { getItem } from "../lib/items";
import type { AvatarConfig } from "../lib/types";
import { AvatarPreview } from "../avatar/AvatarPreview";
import { SparklesIcon } from "./icons";

const CONFETTI_COLORS = ["#8b5cf6", "#f59e0b", "#22c55e", "#3b82f6", "#ec4899", "#fbbf24"];

function celebrateStyles(count: number): React.CSSProperties[] {
  return Array.from({ length: count }, (_, i) => {
    const left = 4 + i * (92 / count) + Math.random() * 6;
    const delay = Math.random() * 0.6;
    const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    return {
      left: `${left}%`,
      top: `${10 + Math.random() * 20}%`,
      background: color,
      animationDelay: `${delay}s`,
    };
  });
}

export function CelebrationOverlay() {
  const { celebration, dismissCelebration, equipItem, bundle } = useData();
  if (!celebration || !bundle) return null;

  const unlock = celebration.unlocks[0];
  const previewConfig: AvatarConfig =
    unlock && getItem(unlock.itemId)
      ? {
          ...bundle.profile.avatar_config,
          [getItem(unlock.itemId)!.slot]: unlock.itemId,
        }
      : bundle.profile.avatar_config;

  const confetti = celebrateStyles(20);

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Recompensa desbloqueada">
      <div className="dialog celebration">
        {celebration.levelUp !== null && (
          <span className="badge violet" style={{ marginBottom: 8 }}>
            <SparklesIcon size={14} /> Nível {celebration.levelUp} alcançado!
          </span>
        )}

        {unlock ? (
          <>
            <div className="celebration-burst">
              <div className="confetti">
                {confetti.map((s, i) => (
                  <i key={i} style={s} />
                ))}
              </div>
              <div className="celebration-item">
                <AvatarPreview config={previewConfig} width={150} />
              </div>
            </div>
            <h2 className="dialog-title">Item desbloqueado!</h2>
            <p className="dialog-sub">{unlock.name}</p>
            <p style={{ color: "var(--muted)", fontSize: 13.5, margin: "0 0 16px" }}>
              {unlock.description}
            </p>
            <button
              className="btn btn-primary"
              style={{ marginBottom: 8 }}
              onClick={async () => {
                await equipItem(unlock.itemId);
                dismissCelebration();
              }}
            >
              Equipar agora
            </button>
            <button className="btn btn-ghost" onClick={dismissCelebration}>
              Adiar
            </button>
          </>
        ) : (
          <>
            <span className="badge" style={{ margin: "0 auto 10px", display: "table" }}>
              <SparklesIcon size={14} /> +XP conquistado!
            </span>
            <p className="dialog-sub" style={{ marginBottom: 16 }}>
              Continue assim, seu personagem está evoluindo.
            </p>
            <button className="btn btn-primary" onClick={dismissCelebration}>
              Continuar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
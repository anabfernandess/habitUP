import { useState } from "react";
import { useData } from "../hooks/useData";
import { useAuth } from "../hooks/useAuth";
import { activityHistory } from "../lib/compute";
import {
  REWARD_RULES,
  rewardProgressPct,
  isRewardUnlocked,
  rewardCurrentValue,
  XP_PER_COMPLETION,
  XP_PER_LEVEL,
} from "../lib/gamification";
import { Screen, LoadingScreen, ErrorScreen } from "../components/States";
import { LogoutIcon, TrophyIcon } from "../components/icons";
import { AvatarPreview } from "../avatar/AvatarPreview";
import { useToast } from "../components/Toast";
import { todayKey } from "../lib/date";

export function Profile() {
  const { bundle, status, reload, updateName } = useData();
  const { isDemo, signOut, user } = useAuth();
  const toast = useToast();
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (status === "loading" || !bundle) return <LoadingScreen />;
  if (status === "error") return <ErrorScreen onRetry={reload} />;

  const { profile, stats } = bundle;
  const history = activityHistory(bundle, profile.timezone, 84);

  const weeks: string[][] = [];
  for (let i = 0; i < history.length; i += 7) {
    weeks.push(history.slice(i, i + 7).map((h) => h.date));
  }

  const today = todayKey(profile.timezone);
  const cellLevel = (count: number) => Math.min(4, count);

  const onSaveName = async () => {
    if (nameDraft === null) return;
    setSaving(true);
    await updateName(nameDraft);
    setSaving(false);
    setNameDraft(null);
    toast.show("Nome atualizado");
  };

  const onLogout = async () => {
    await signOut();
  };

  return (
    <Screen title="Perfil" subtitle="Seus números, histórico e configurações.">
      {isDemo && (
        <div className="demo-banner">
          <span>🧪</span>
          <span>
            Conta <strong>demonstrativa</strong>: dados locais, sem login real.
          </span>
        </div>
      )}

      {/* Identidade */}
      <div className="card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 62, height: 76, flexShrink: 0 }}>
          <AvatarPreview config={profile.avatar_config} width={62} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="profile-name">Nome</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                id="profile-name"
                className="input"
                value={nameDraft ?? profile.name}
                onChange={(e) => setNameDraft(e.target.value)}
                style={{ minHeight: 42 }}
                maxLength={40}
              />
              {nameDraft !== null && (
                <button
                  className="btn btn-primary btn-sm"
                  disabled={saving}
                  onClick={onSaveName}
                >
                  Salvar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      <h2 className="section-title">Números</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
        <div className="stat-card">
          <span className="label">XP total</span>
          <span className="value">{stats.total_xp}</span>
        </div>
        <div className="stat-card">
          <span className="label">Nível</span>
          <span className="value">{stats.level}</span>
        </div>
        <div className="stat-card">
          <span className="label">Conclusões</span>
          <span className="value">{stats.total_completions}</span>
        </div>
        <div className="stat-card">
          <span className="label">Maior sequência</span>
          <span className="value">{stats.best_streak} 🔥</span>
        </div>
      </div>

      {/* Histórico visual */}
      <h2 className="section-title">Histórico de atividade</h2>
      <div className="card">
        <div className="history-wrap">
          {weeks.map((week, i) => (
            <div className="history-col" key={i}>
              {week.map((d) => (
                <div
                  key={d}
                  className={`history-cell lvl${cellLevel(
                    history.find((h) => h.date === d)?.count ?? 0,
                  )}`}
                  title={`${d}: ${
                    history.find((h) => h.date === d)?.count ?? 0
                  } conclusão(ões)`}
                />
              ))}
              <span className="history-label">
                {week.includes(today) ? "hoje" : week[0].slice(8, 10)}
              </span>
            </div>
          ))}
        </div>
        <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--muted)" }}>
          Últimos 84 dias. Quanto mais intensa a cor, mais hábitos você concluiu
          naquele dia.
        </p>
      </div>

      {/* Conquistas */}
      <h2 className="section-title">Conquistas</h2>
      {REWARD_RULES.map((rule) => {
        const unlocked = isRewardUnlocked(rule, stats);
        const current = rewardCurrentValue(rule, stats);
        const pct = rewardProgressPct(rule, stats);
        return (
          <div key={rule.id} className="card" style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <TrophyIcon size={22} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                <strong style={{ fontSize: 14 }}>{rule.name}</strong>
                <span className={`badge ${unlocked ? "green" : ""}`} style={{ opacity: unlocked ? 1 : 0.85 }}>
                  {unlocked ? "Desbloqueada" : `${current}/${rule.value}`}
                </span>
              </div>
              <p style={{ margin: "3px 0 0", fontSize: 12.5, color: "var(--muted)" }}>
                {rule.requirementText} · {current} de {rule.value} ({pct}%)
              </p>
              <div className="progress" style={{ marginTop: 8, height: 7 }}>
                <div className={`progress-fill ${unlocked ? "green" : "amber"}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>
        );
      })}

      {/* Regras */}
      <h2 className="section-title">Como funciona</h2>
      <div className="card">
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, lineHeight: 1.7, color: "var(--muted)" }}>
          <li>Cada hábito concluído vale <strong style={{ color: "var(--text)" }}>+{XP_PER_COMPLETION} XP</strong>.</li>
          <li>A cada {XP_PER_LEVEL} XP você sobe um nível (nível = XP/100 + 1).</li>
          <li>A sequência só quebra quando um dia inteiro passa sem concluir nada, mas o recorde é recalculado pelo seu histórico — perder um dia por inércia não apaga um recorde legítimo.</li>
          <li>Só dá para desfazer a conclusão de <strong style={{ color: "var(--text)" }}>hoje</strong> (no seu fuso). Desfazer corrige XP, sequências e recompensas — e tira do avatar a peça cujo requisito deixou de valer.</li>
        </ul>
      </div>

      <div style={{ height: 12 }} />

      <button className="btn btn-ghost" onClick={onLogout}>
        <LogoutIcon size={16} /> Sair da conta
      </button>

      {!isDemo && user && (
        <p style={{ fontSize: 11.5, color: "var(--muted)", textAlign: "center", marginTop: 10 }}>
          {user.email} · fuso {profile.timezone}
        </p>
      )}
    </Screen>
  );
}
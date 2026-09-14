import { useCallback, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useData } from "../hooks/useData";
import { todaySummary } from "../lib/compute";
import { statsLevelProgress, nextReward, rewardProgressPct, XP_PER_COMPLETION } from "../lib/gamification";
import { AvatarPreview } from "../avatar/AvatarPreview";
import { iconGlyph } from "../lib/types";
import { FireIcon, TrophyIcon, CheckIcon, PlusIcon, SparklesIcon } from "../components/icons";
import { Screen, LoadingScreen, ErrorScreen, EmptyState } from "../components/States";
import { useToast } from "../components/Toast";

function useMidnightRefresh(onTick: () => void) {
  useEffect(() => {
    const everyMinute = window.setInterval(onTick, 60_000);
    let midnight: number;
    const scheduleMidnight = () => {
      const now = new Date();
      const next = new Date(now);
      next.setHours(24, 0, 5, 0);
      midnight = window.setTimeout(() => {
        onTick();
        scheduleMidnight();
      }, next.getTime() - now.getTime());
    };
    scheduleMidnight();
    return () => {
      window.clearInterval(everyMinute);
      window.clearTimeout(midnight);
    };
  }, [onTick]);
}

export function Today() {
  const { bundle, status, reload, completeHabit, undoCompletion, busyHabit, busyUndo } = useData();
  const toast = useToast();
  const navigate = useNavigate();

  const onTick = useCallback(() => void reload(), [reload]);
  useMidnightRefresh(onTick);

  if (status === "loading" || !bundle) return <LoadingScreen label="Preparando seu dia…" />;
  if (status === "error") return <ErrorScreen onRetry={reload} />;

  const { profile, stats } = bundle;
  const summary = todaySummary(bundle);
  const level = statsLevelProgress(stats);
  const next = nextReward(stats);
  const greeting = profile.name || "Viajante";

  const onComplete = async (habitId: string) => {
    try {
      await completeHabit(habitId);
      toast.show(`+${XP_PER_COMPLETION} XP`);
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Não foi possível concluir.");
    }
  };

  const onUndo = async (completionId: string) => {
    try {
      await undoCompletion(completionId);
      toast.show("Conclusão desfeita. XP ajustado.");
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Não foi possível desfazer.");
    }
  };

  return (
    <Screen>
      {/* Cabeçalho */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
        <div style={{ width: 74, height: 88, flexShrink: 0 }}>
          <AvatarPreview config={profile.avatar_config} width={74} className="habit-pop" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em" }}>
            Olá, {greeting}!
          </h1>
          <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
            <span className="badge violet">
              <SparklesIcon size={13} /> Nível {level.level}
            </span>
            <span className="badge">
              <FireIcon size={13} /> {summary.generalStreak} dia{summary.generalStreak === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </div>

      {/* XP / nível */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
          <strong style={{ fontSize: 15 }}>Nível {level.level}</strong>
          <span style={{ fontSize: 12.5, color: "var(--muted)" }}>
            {level.current} / {level.need} XP · total {stats.total_xp} XP
          </span>
        </div>
        <div className="progress">
          <div className="progress-fill" style={{ width: `${level.pct}%` }} />
        </div>
        <p style={{ margin: "8px 0 0", fontSize: 12.5, color: "var(--muted)" }}>
          {level.need - level.current} XP para o nível {level.next}
        </p>
      </div>

      {/* Estatísticas rápidas */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 12 }}>
        <div className="stat-card">
          <span className="label">Hoje</span>
          <span className="value">
            {summary.done}/{summary.total}
          </span>
        </div>
        <div className="stat-card">
          <span className="label">Progresso</span>
          <span className="value">{summary.pct}%</span>
        </div>
        <div className="stat-card">
          <span className="label">Sequência</span>
          <span className="value">{summary.generalStreak} 🔥</span>
        </div>
      </div>

      {/* Próxima conquista */}
      {next && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <TrophyIcon size={20} />
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: 14 }}>Próxima conquista</strong>
              <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--muted)" }}>
                {next.requirementText}
              </p>
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            <div className="progress">
              <div
                className="progress-fill amber"
                style={{ width: `${rewardProgressPct(next, stats)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      <h2 className="section-title">Hábitos de hoje</h2>

      {summary.total === 0 && (
        <EmptyState
          emoji="🌱"
          title={"Nenhum hábito ainda"}
          hint={"Crie seu primeiro hábito diário para começar a ganhar XP."}
          action={
            <button className="btn btn-primary" onClick={() => navigate("/habitos?novo=1")}>
              <PlusIcon size={18} /> Criar meu primeiro hábito
            </button>
          }
        />
      )}

      {summary.items.map(({ habit, completion, streak }) => {
        const busy = busyHabit === habit.id || busyUndo === completion?.id;
        return (
          <div
            key={habit.id}
            className={`habit-row ${completion ? "done" : ""}`}
            style={{ opacity: busy ? 0.6 : 1 }}
          >
            <div
              className="habit-icon"
              style={{ background: `${habit.color}26`, color: habit.color }}
            >
              {iconGlyph(habit.icon)}
            </div>
            <div className="habit-body">
              <div className="habit-name">{habit.name}</div>
              {habit.description && <div className="habit-desc">{habit.description}</div>}
              {streak > 0 && (
                <span className="habit-streak">
                  <FireIcon size={12} /> {streak} dia{streak === 1 ? "" : "s"}
                </span>
              )}
            </div>
            <button
              className={`btn btn-sm ${completion ? "btn-success" : "btn-primary"}`}
              disabled={busy}
              style={{ width: 48, height: 48, padding: 0, borderRadius: "50%", minHeight: 0, flexShrink: 0 }}
              aria-label={completion ? "Desfazer conclusão" : `Concluir ${habit.name}`}
              title={completion ? "Clique para desfazer" : "Concluir hoje"}
              onClick={() => (completion ? onUndo(completion.id) : onComplete(habit.id))}
            >
              {busy ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : completion ? <CheckIcon /> : null}
            </button>
          </div>
        );
      })}

      <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 14 }}>
        Cada hábito vale <strong>+20 XP</strong> e pode ser concluído 1x por dia.
        Toque em um hábito concluído para desfazer.{" "}
        <Link to="/perfil" style={{ color: "var(--accent-2)" }}>
          Ver regras
        </Link>
      </p>
    </Screen>
  );
}
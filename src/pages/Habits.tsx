import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useData } from "../hooks/useData";
import type { Habit } from "../lib/types";
import { iconGlyph } from "../lib/types";
import { HabitFormModal } from "../components/HabitFormModal";
import { Screen, LoadingScreen, ErrorScreen } from "../components/States";
import { PlusIcon, PenIcon, ArchiveIcon } from "../components/icons";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../components/Toast";

export function Habits() {
  const { bundle, status, reload, archiveHabit, updateHabit } = useData();
  const { isDemo } = useAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState<Habit | "new" | null>(() =>
    params.get("novo") === "1" ? "new" : null,
  );
  const [showArchived, setShowArchived] = useState(false);

  const active = useMemo(
    () => (bundle ? bundle.habits.filter((h) => !h.archived) : []),
    [bundle],
  );
  const archived = useMemo(
    () => (bundle ? bundle.habits.filter((h) => h.archived) : []),
    [bundle],
  );

  if (status === "loading" || !bundle) return <LoadingScreen />;
  if (status === "error") return <ErrorScreen onRetry={reload} />;

  const openNew = () => {
    setEditing("new");
    setParams((p) => ({ ...Object.fromEntries(p), novo: "1" }), { replace: true });
  };

  const closeForm = () => {
    setEditing(null);
    setParams({}, { replace: true });
  };

  const onArchive = async (h: Habit) => {
    await archiveHabit(h.id);
    toast.show("Hábito arquivado. Histórico preservado.");
  };

  const onRestore = async (h: Habit) => {
    await updateHabit(h.id, { archived: false });
    toast.show("Hábito reativado");
  };

  return (
    <Screen title="Hábitos" subtitle="Crie, edite e arquive seus hábitos diários.">
      <button className="btn btn-primary" style={{ marginBottom: 16 }} onClick={openNew}>
        <PlusIcon size={18} /> Novo hábito
      </button>

      {active.length === 0 && (
        <div className="center-state">
          <span className="emoji">🗂️</span>
          <strong style={{ color: "var(--text)", fontSize: 16 }}>Nenhum hábito ativo</strong>
          <p style={{ margin: 0, fontSize: 13.5 }}>
            Crie um hábito para aparecer no seu dia e render XP.
          </p>
        </div>
      )}

      {active.map((h) => (
        <div key={h.id} className="card" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            className="habit-icon"
            style={{ background: `${h.color}26`, color: h.color }}
          >
            {iconGlyph(h.icon)}
          </div>
          <div className="habit-body">
            <div className="habit-name">{h.name}</div>
            <div className="habit-desc">
              {h.description || "Sem descrição"}
            </div>
          </div>
          <button
            className="btn btn-sm btn-ghost"
            style={{ width: 38, height: 38, borderRadius: 10, padding: 0, flexShrink: 0 }}
            aria-label={`Editar ${h.name}`}
            onClick={() => setEditing(h)}
          >
            <PenIcon />
          </button>
          <button
            className="btn btn-sm btn-ghost"
            style={{ width: 38, height: 38, borderRadius: 10, padding: 0, flexShrink: 0 }}
            aria-label={`Arquivar ${h.name}`}
            onClick={() => onArchive(h)}
          >
            <ArchiveIcon />
          </button>
        </div>
      ))}

      {archived.length > 0 && (
        <>
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginTop: 18, width: "100%" }}
            onClick={() => setShowArchived((v) => !v)}
          >
            {showArchived ? "Ocultar" : "Mostrar"} arquivados ({archived.length})
          </button>
          {showArchived &&
            archived.map((h) => (
              <div
                key={h.id}
                className="card"
                style={{ display: "flex", alignItems: "center", gap: 10, opacity: 0.7, marginTop: 8 }}
              >
                <div
                  className="habit-icon"
                  style={{ background: `${h.color}26`, color: h.color }}
                >
                  {iconGlyph(h.icon)}
                </div>
                <div className="habit-body">
                  <div className="habit-name">{h.name}</div>
                  <div className="habit-desc">Arquivado · histórico mantido</div>
                </div>
                <button className="btn btn-sm btn-ghost" onClick={() => onRestore(h)}>
                  Reativar
                </button>
              </div>
            ))}
        </>
      )}

      {isDemo && (
        <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 16, textAlign: "center" }}>
          🧪 Modo demonstrativo: o arquivamento e a edição funcionam igual ao modo
          real, mas os dados ficam só neste navegador.
        </p>
      )}

      {editing && (
        <HabitFormModal
          habit={editing === "new" ? null : editing}
          onClose={closeForm}
        />
      )}
    </Screen>
  );
}
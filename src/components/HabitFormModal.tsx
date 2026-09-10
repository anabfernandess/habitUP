import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useData } from "../hooks/useData";
import {
  HABIT_CATEGORIES,
  HABIT_ICONS,
  PALETTE,
  type Habit,
} from "../lib/types";
import { useToast } from "./Toast";

export function HabitFormModal({
  habit,
  onClose,
}: {
  habit: Habit | null;
  onClose: () => void;
}) {
  const { createHabit, updateHabit } = useData();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("outros");
  const [icon, setIcon] = useState("check");
  const [color, setColor] = useState(PALETTE[0]);

  useEffect(() => {
    if (habit) {
      setName(habit.name);
      setDescription(habit.description);
      setCategory(habit.category);
      setIcon(habit.icon);
      setColor(habit.color);
    } else {
      setName("");
      setDescription("");
      setCategory("outros");
      setIcon("check");
      setColor(PALETTE[0]);
    }
  }, [habit]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Dê um nome para o hábito.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (habit) {
        await updateHabit(habit.id, {
          name,
          description,
          category,
          icon,
          color,
        });
        toast.show("Hábito atualizado");
      } else {
        await createHabit({ name, description, category, icon, color });
        toast.show("Hábito criado!");
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={habit ? "Editar hábito" : "Novo hábito"}>
      <form className="dialog" onSubmit={onSubmit}>
        <h2 className="dialog-title">{habit ? "Editar hábito" : "Novo hábito"}</h2>
        <p className="dialog-sub">Diário: conclua uma vez por dia para ganhar XP.</p>

        <div className="field">
          <label htmlFor="habit-name">Nome</label>
          <input
            id="habit-name"
            className="input"
            value={name}
            maxLength={60}
            placeholder="Ex.: Beber 2L de água"
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>

        <div className="field">
          <label htmlFor="habit-desc">Descrição (opcional)</label>
          <textarea
            id="habit-desc"
            className="input"
            rows={2}
            value={description}
            placeholder="Detalhes, meta, lembrete…"
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Categoria</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {HABIT_CATEGORIES.map((c) => (
              <button
                type="button"
                key={c.id}
                className={`chip ${category === c.id ? "active" : ""}`}
                onClick={() => setCategory(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Ícone</label>
          <div className="icon-row">
            {HABIT_ICONS.map((i) => (
              <button
                type="button"
                key={i.id}
                className={`icon-pick ${icon === i.id ? "selected" : ""}`}
                onClick={() => setIcon(i.id)}
                aria-label={`Ícone ${i.id}`}
              >
                {i.glyph}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Cor</label>
          <div className="color-row">
            {PALETTE.map((c) => (
              <button
                type="button"
                key={c}
                className={`swatch ${color === c ? "selected" : ""}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
                aria-label={`Cor ${c}`}
              />
            ))}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, padding: "10px 0 16px" }}>
          <span style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: `${color}33`, color, fontSize: 19, fontWeight: 700 }}>
            {HABIT_ICONS.find((i) => i.id === icon)?.glyph ?? "✔"}
          </span>
          <strong style={{ fontSize: 15 }}>{name.trim() || "Sem nome"}</strong>
        </div>

        {error && <p className="error-text">{error}</p>}

        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 2 }}>
            {saving ? "Salvando…" : habit ? "Salvar alterações" : "Criar hábito"}
          </button>
        </div>
      </form>
    </div>
  );
}
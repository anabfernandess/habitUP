import { useData } from "../hooks/useData";

export function LoadingScreen({ label = "Carregando…" }: { label?: string }) {
  return (
    <div className="center-state" role="status">
      <div className="spinner" />
      <p style={{ margin: 0 }}>{label}</p>
    </div>
  );
}

export interface ScreenProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function Screen({ title, subtitle, children }: ScreenProps) {
  return (
    <div>
      {title && <h1 className="page-title">{title}</h1>}
      {subtitle && <p className="page-sub">{subtitle}</p>}
      {children}
    </div>
  );
}

export function EmptyState({
  emoji,
  title,
  hint,
  action,
}: {
  emoji: string;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="center-state">
      <span className="emoji">{emoji}</span>
      <strong style={{ color: "var(--text)", fontSize: 16 }}>{title}</strong>
      {hint && <p style={{ margin: 0, fontSize: 13.5 }}>{hint}</p>}
      {action && <div style={{ marginTop: 8, width: "100%", maxWidth: 260 }}>{action}</div>}
    </div>
  );
}

export function ErrorScreen({ onRetry }: { onRetry: () => void }) {
  const { error } = useData();
  return (
    <div className="center-state">
      <span className="emoji">😵</span>
      <strong style={{ color: "var(--text)", fontSize: 16 }}>Opa, algo falhou</strong>
      <p style={{ margin: 0, fontSize: 13.5 }}>{error ?? "Não foi possível carregar seus dados."}</p>
      <button className="btn btn-primary btn-sm" style={{ width: "auto" }} onClick={onRetry}>
        Tentar de novo
      </button>
    </div>
  );
}
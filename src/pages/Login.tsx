import { useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../hooks/useAuth";
import { AvatarPreview } from "../avatar/AvatarPreview";
import { DEFAULT_AVATAR } from "../lib/types";

type Tab = "entrar" | "cadastrar" | "recuperar";

export function Login() {
  const { isDemo, signIn, signUp, resetPassword, status } = useAuth();
  const [tab, setTab] = useState<Tab>("entrar");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (tab === "recuperar") {
        const err = await resetPassword(email);
        if (err) setError(err);
        else
          setNotice(
            "Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.",
          );
        return;
      }
      if (tab === "entrar") {
        const err = await signIn(email, password);
        if (err) setError(err);
      } else {
        const res = await signUp(email, password, name);
        if ("error" in res) {
          setError(res.error);
        } else if (res.needsConfirmation) {
          setNotice(
            "Cadastro criado! Confirme seu e-mail antes de entrar.",
          );
        }
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="auth-main" style={{ flex: 1, padding: "0 16px calc(24px + var(--safe-bottom))" }}>
        <div className="auth-hero">
          <div style={{ width: 150, height: 170, margin: "0 auto 6px" }}>
            <AvatarPreview config={DEFAULT_AVATAR} width={150} />
          </div>
          <div className="logo">HabitUP</div>
          <p style={{ color: "var(--muted)", margin: "4px 0 4px", fontSize: 14 }}>
            Cuide da rotina e evolua seu personagem.
          </p>
        </div>

        {isDemo && (
          <div className="demo-banner">
            <span>🧪</span>
            <span>
              Modo <strong>demonstrativo</strong>: seus dados ficam só neste
              navegador, separados de contas reais.
            </span>
          </div>
        )}

        <div className="card auth-card">
          {tab !== "recuperar" ? (
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button
                className={`chip ${tab === "entrar" ? "active" : ""}`}
                style={{ flex: 1, justifyContent: "center" }}
                onClick={() => {
                  setTab("entrar");
                  setError(null);
                }}
              >
                Entrar
              </button>
              <button
                className={`chip ${tab === "cadastrar" ? "active" : ""}`}
                style={{ flex: 1, justifyContent: "center" }}
                onClick={() => {
                  setTab("cadastrar");
                  setError(null);
                }}
              >
                Cadastrar
              </button>
            </div>
          ) : (
            <p style={{ margin: "0 0 12px", fontSize: 13.5, color: "var(--muted)" }}>
              Informe seu e-mail e enviaremos um link para redefinir a senha.
            </p>
          )}

          <form onSubmit={onSubmit}>
            {tab === "cadastrar" && (
              <div className="field">
                <label htmlFor="auth-name">Nome</label>
                <input
                  id="auth-name"
                  className="input"
                  value={name}
                  placeholder="Como quer ser chamado?"
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}

            {tab !== "recuperar" ? (
              <>
                <div className="field">
                  <label htmlFor="auth-email">E-mail</label>
                  <input
                    id="auth-email"
                    className="input"
                    type="email"
                    required
                    value={email}
                    autoComplete="email"
                    placeholder="voce@exemplo.com"
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="auth-password">Senha</label>
                  <input
                    id="auth-password"
                    className="input"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    autoComplete={tab === "entrar" ? "current-password" : "new-password"}
                    placeholder="Mínimo de 6 caracteres"
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </>
            ) : (
              <div className="field">
                <label htmlFor="auth-email2">E-mail</label>
                <input
                  id="auth-email2"
                  className="input"
                  type="email"
                  required
                  value={email}
                  placeholder="voce@exemplo.com"
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            )}

            {error && <p className="error-text">{error}</p>}
            {notice && (
              <p style={{ color: "var(--green-2)", fontSize: 13 }}>{notice}</p>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={busy || status === "loading"}
              style={{ marginTop: 6 }}
            >
              {busy
                ? "Aguarde…"
                : tab === "recuperar"
                  ? "Enviar link"
                  : tab === "entrar"
                    ? "Entrar"
                    : "Criar conta"}
            </button>
          </form>

          {tab === "entrar" && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ marginTop: 10, width: "100%" }}
              onClick={() => {
                setTab("recuperar");
                setError(null);
                setNotice(null);
              }}
            >
              Esqueci minha senha
            </button>
          )}
          {tab === "recuperar" && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ marginTop: 10, width: "100%" }}
              onClick={() => {
                setTab("entrar");
                setError(null);
                setNotice(null);
              }}
            >
              Voltar para entrar
            </button>
          )}
        </div>

        {isDemo && (
          <div className="card" style={{ marginTop: 14 }}>
            <p style={{ margin: 0, fontSize: 13.5, color: "var(--muted)", textAlign: "center" }}>
              Sem cadastro? Explore o app com dados de exemplo:
            </p>
            <button
              className="btn btn-success"
              style={{ marginTop: 10 }}
              onClick={async () => {
                setBusy(true);
                await signUp("demo@habitup.app", "123456", "Viajante");
                setBusy(false);
              }}
            >
              Entrar no modo demonstrativo
            </button>
            <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--muted)", textAlign: "center" }}>
              Os dados de demonstração são salvos apenas neste dispositivo e não
              se misturam com contas reais.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
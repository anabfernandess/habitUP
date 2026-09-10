import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastProvider } from "./components/Toast";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { DataProvider } from "./hooks/useData";
import { appService } from "./lib/appService";
import { LoadingScreen } from "./components/States";
import { CelebrationOverlay } from "./components/CelebrationOverlay";
import { BottomNav } from "./components/BottomNav";
import { Login } from "./pages/Login";
import { Today } from "./pages/Today";
import { Habits } from "./pages/Habits";
import { Avatar } from "./pages/Avatar";
import { Profile } from "./pages/Profile";

function Shell() {
  return (
    <div className="app-shell">
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/habitos" element={<Habits />} />
          <Route path="/avatar" element={<Avatar />} />
          <Route path="/perfil" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav />
      <CelebrationOverlay />
    </div>
  );
}

function Root() {
  const { status } = useAuth();
  if (status === "loading") {
    return <LoadingScreen label="Iniciando…" />;
  }
  if (status === "anon") {
    return <Login />;
  }
  return (
    <DataProvider service={appService}>
      <Shell />
    </DataProvider>
  );
}

export default function App() {
  return (
    <HashRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="*" element={<Root />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </HashRouter>
  );
}
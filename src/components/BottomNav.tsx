import { NavLink } from "react-router-dom";
import { ListIcon, SlidersIcon, SunIcon, UserIcon } from "./icons";

const items = [
  { to: "/", label: "Hoje", Icon: SunIcon, end: true },
  { to: "/habitos", label: "Hábitos", Icon: ListIcon, end: false },
  { to: "/avatar", label: "Avatar", Icon: UserIcon, end: false },
  { to: "/perfil", label: "Perfil", Icon: SlidersIcon, end: false },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Navegação principal">
      <div className="bottom-nav-inner">
        {items.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <Icon />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
import {
  BarChart3,
  Bell,
  CalendarDays,
  CreditCard,
  Activity,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Pill,
  RotateCcw,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

const navItems = [
  { to: "/app/dashboard", key: "dashboard", icon: LayoutDashboard },
  { to: "/app/patients", key: "patients", icon: Users },
  { to: "/app/appointments", key: "appointments", icon: CalendarDays },
  { to: "/app/medicines", key: "medicines", icon: Pill },
  { to: "/app/diseases", key: "diseases", icon: Activity },
  { to: "/app/prescriptions", key: "prescriptions", icon: FileText },
  { to: "/app/payments", key: "payments", icon: CreditCard },
  { to: "/app/follow-ups", key: "followUps", icon: RotateCcw },
  { to: "/app/notifications", key: "notifications", icon: Bell },
  { to: "/app/reports", key: "reports", icon: BarChart3 },
  { to: "/app/ai-assistant", key: "aiAssistant", icon: Sparkles },
];

export default function AppShell() {
  const { t, toggleLanguage } = useLanguage();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    localStorage.setItem("scms_theme", "light");
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-scms-bg text-scms-text">
      {open && <button className="fixed inset-0 z-30 bg-[rgba(15,23,42,0.45)] lg:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-scms-border bg-white p-4 transition-all lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "lg:w-[84px]" : "lg:w-[268px]"}`}
      >
        <div className={`mb-5 rounded-2xl bg-scms-primary text-white transition-all ${collapsed ? "p-2 justify-center" : "p-4"} flex`}>
          <div className={`flex items-center ${collapsed ? "justify-center w-full" : "items-center gap-3"}`}>
            {!collapsed ? (
              <div className="">
                <div className="text-lg font-black">{t.appName}</div>
                <div className="text-xs font-semibold text-white/80 leading-none mt-0.5">{t.appSubtitle}</div>
              </div>
            ) : (
              <span className="text-xs font-black tracking-[0.18em] text-white/90">SCMS</span>
            )}
          </div>
          <button className="btn btn-ghost btn-sm btn-square text-white lg:hidden" onClick={() => setOpen(false)} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center rounded-xl px-3 py-2.5 text-sm font-extrabold transition ${
                    collapsed ? "justify-center gap-0" : "gap-3"
                  } ${
                    isActive ? "bg-scms-primaryLight text-scms-primary" : "text-[#475467] hover:bg-[#F2F4F7] hover:text-scms-text"
                  }`
                }
                title={collapsed ? t[item.key] : undefined}
              >
                <Icon size={18} className="shrink-0" />
                {!collapsed && <span className="">{t[item.key]}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-4 space-y-2 border-t border-scms-border pt-4">
          <button 
            className={`btn min-h-11 w-full rounded-xl border-[#FECDCA] bg-[#FFF1F0] text-scms-danger hover:border-[#FECDCA] hover:bg-[#FFF1F0] ${collapsed ? "justify-center px-0" : "justify-start px-5"}`} 
            onClick={handleLogout}
            title={collapsed ? t.logout : undefined}
          >
            <LogOut size={18} className="shrink-0" />
            {!collapsed && <span className="">{t.logout}</span>}
          </button>
        </div>
      </aside>

      <main className={`transition-[padding] duration-300 ${collapsed ? "lg:pl-[84px]" : "lg:pl-[268px]"}`}>
        <div className="mx-auto min-h-screen max-w-[1240px] px-4 py-5 md:px-6 lg:px-8">
          <header className="mb-6 flex items-center justify-between gap-4 rounded-[18px] border border-scms-border bg-white px-4 py-3 shadow-scms">
            <div className="flex items-center gap-2">
              <button className="btn btn-ghost btn-square lg:hidden" onClick={() => setOpen(true)} aria-label="Menu">
                <Menu size={20} />
              </button>
              <button className="btn btn-ghost btn-square hidden lg:flex rounded-xl" onClick={() => setCollapsed(!collapsed)} aria-label="Toggle Sidebar">
                <Menu size={20} />
              </button>
            </div>
            
            <div className="mr-auto">
              <div className="text-sm font-black text-scms-text">Admin User</div>
              <div className="text-xs font-semibold text-scms-muted">System Administrator</div>
            </div>
            
            <div className="flex items-center gap-3">
              <button className="scms-btn-outline hidden md:inline-flex" onClick={toggleLanguage}>
                {t.language}
              </button>
            </div>
          </header>

          <Outlet />
        </div>
      </main>
    </div>
  );
}

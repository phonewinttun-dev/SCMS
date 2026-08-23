import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  ActivityLogIcon,
  PersonIcon,
  FileTextIcon,
  CalendarIcon,
  CheckCircledIcon,
  MagicWandIcon,
  HamburgerMenuIcon,
  Cross2Icon,
  ExitIcon,
  SunIcon,
  MoonIcon,
  ChevronDownIcon,
} from "@radix-ui/react-icons";
import BrandLogo from "./BrandLogo";
import SkipLink from "./SkipLink";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "./ui/dropdown-menu";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";
import { showConfirm } from "../services/dialogs";
import useScrollLock from "../hooks/useScrollLock";

const doctorNav = [
  { to: "/doctor/dashboard", key: "doctorQueue", label: "Patient Queue", icon: ActivityLogIcon },
  { to: "/doctor/appointments", key: "doctorAppointments", label: "Visits & Schedule", icon: CalendarIcon },
  { to: "/doctor/patients", key: "patients", label: "Clinical Patients", icon: PersonIcon },
  { to: "/doctor/prescriptions", key: "doctorPrescriptions", label: "Prescriptions & Templates", icon: FileTextIcon },
  { to: "/doctor/follow-ups", key: "doctorFollowUps", label: "Follow-Up Patients", icon: CheckCircledIcon },
  { to: "/doctor/ai-assistant", key: "aiAssistant", label: "AI Clinical Assistant", icon: MagicWandIcon },
];

export default function DoctorShell() {
  const { t, toggleLanguage, language } = useLanguage();
  const { isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useScrollLock(open);

  const handleLogout = async () => {
    const confirmed = await showConfirm(
      language === "mm" ? "ဆရာဝန်အကောင့်မှ ထွက်ခွာရန် သေချာပါသလား?" : "Are you sure you want to log out of your clinical session?",
      language === "mm" ? "အကောင့်ထွက်ရန် အတည်ပြုပါ" : "Confirm Sign Out",
      language === "mm" ? "ထွက်မည်" : "Log Out",
      language === "mm" ? "မထွက်ပါ" : "Cancel"
    );
    if (confirmed) {
      logout();
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans transition-colors">
      <SkipLink targetId="doctor-content" />

      {/* Mobile drawer backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-md lg:hidden transition-all duration-300 animate-fadeIn"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Doctor Workspace Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border/80 bg-card/95 backdrop-blur-2xl p-4 transition-all duration-300 lg:w-[260px] lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between pb-4 border-b border-border/70">
          <BrandLogo subtitle={t.doctorPortal || "Doctor Workspace"} />
          <button
            className="lg:hidden grid h-8 w-8 place-items-center rounded-xl text-muted-foreground hover:bg-secondary transition cursor-pointer"
            onClick={() => setOpen(false)}
            aria-label={t.close || "Close menu"}
          >
            <Cross2Icon className="w-5 h-5" />
          </button>
        </div>

        {/* Doctor Navigation Links */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto pt-4 pr-1 scrollbar-thin" aria-label="Doctor Navigation">
          {doctorNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 font-bold border border-orange-200/60 dark:border-orange-900/40 shadow-xs"
                      : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{t[item.key] || item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="lg:pl-[260px] transition-all duration-300">
        {/* Top Navigation Bar */}
        <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border/80 bg-background/85 backdrop-blur-2xl px-4 sm:px-6 gap-4">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden grid h-9 w-9 place-items-center rounded-2xl border border-border/80 bg-card text-foreground hover:bg-secondary transition shadow-2xs cursor-pointer"
              onClick={() => setOpen(true)}
              aria-label="Toggle mobile menu"
            >
              <HamburgerMenuIcon className="w-4 h-4" />
            </button>

            <span className="text-xs font-bold uppercase tracking-wider text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/60 px-3 py-1 rounded-full border border-orange-200 dark:border-orange-900/40">
              {t.doctorPortal || "Doctor Workspace"}
            </span>
          </div>

          {/* User badge & Profile Dropdown */}
          <div className="flex items-center gap-2.5">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="grid h-9 w-9 place-items-center rounded-2xl border border-border/80 bg-card text-foreground hover:bg-secondary transition btn-target shadow-2xs"
              title={isDark ? t.lightMode : t.darkMode}
              aria-label="Toggle dark mode"
            >
              {isDark ? (
                <SunIcon className="w-4 h-4 text-amber-400" />
              ) : (
                <MoonIcon className="w-4 h-4 text-foreground" />
              )}
            </button>

            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="scms-btn-outline px-3 h-9 min-h-9 text-xs font-bold btn-target shadow-2xs"
              title="Switch language"
            >
              {language === "en" ? "မြန်မာ" : "English"}
            </button>

            {/* Accessible Header Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger>
                <div className="flex items-center gap-2.5 pl-2 border-l border-border/80 cursor-pointer p-1 rounded-2xl hover:bg-secondary/60 transition">
                  <div className="grid h-9 w-9 place-items-center rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 font-extrabold text-xs border border-orange-500/20 shadow-2xs">
                    {user?.name?.[0]?.toUpperCase() || "D"}
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-xs font-bold text-foreground leading-none">
                      {user?.name || "Dr. Clinician"}
                    </div>
                    <div className="text-[10px] font-semibold text-muted-foreground leading-none mt-1">
                      Consulting Physician
                    </div>
                  </div>
                  <ChevronDownIcon className="w-3.5 h-3.5 text-muted-foreground hidden sm:block" />
                </div>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="right" className="w-56">
                <DropdownMenuLabel>
                  <div className="font-bold text-foreground">{user?.name || "Physician"}</div>
                  <div className="text-[10px] text-muted-foreground font-normal lowercase">{user?.email || "doctor@scms.local"}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  destructive
                  icon={<ExitIcon className="w-4 h-4" />}
                  onClick={handleLogout}
                >
                  {t.logout || "Sign Out"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Doctor Main Content */}
        <main id="doctor-content" className="relative z-0 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

import {
  DashboardIcon,
  CalendarIcon,
  CardStackIcon,
  PersonIcon,
  CheckCircledIcon,
  ExitIcon,
  GlobeIcon,
  HamburgerMenuIcon,
  Cross2Icon,
  SunIcon,
  MoonIcon,
  ChevronDownIcon,
  DownloadIcon,
  InfoCircledIcon,
} from "@radix-ui/react-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import BrandLogo from "../../components/BrandLogo";
import MobileBottomNav from "../../components/MobileBottomNav";
import SkipLink from "../../components/SkipLink";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "../../components/ui/dropdown-menu";
import { Select } from "../../components/ui/select";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { useTheme } from "../../context/ThemeContext";
import { showError, showSuccess, showConfirm } from "../../services/dialogs";
import { dashboardsApi, patientsApi } from "../../services/scmsApi";
import { validatePatientProfile } from "../../utils/validation";
import DateInput from "../../components/DateInput";
import useScrollLock from "../../hooks/useScrollLock";
import ModalPortal from "../../components/ModalPortal";

const userNav = [
  { to: "/user/dashboard", key: "dashboard", label: "Dashboard", icon: DashboardIcon },
  { to: "/user/appointments", key: "myAppointments", label: "Appointments", icon: CalendarIcon },
  { to: "/user/billing", key: "invoicesAndPayments", label: "Payment", icon: CardStackIcon },
  { to: "/user/family", key: "familyHealthProfiles", label: "Family Members", icon: PersonIcon },
  { to: "/user/follow-ups", key: "followUpReminders", label: "Follow-Up Checkups", icon: CheckCircledIcon },
];

export default function UserLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { language, t, toggleLanguage } = useLanguage();
  const { isDark, toggleTheme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [activeProfile, setActiveProfile] = useState(null);
  const [error, setError] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useScrollLock(manageOpen || drawerOpen);

  const [newProfile, setNewProfile] = useState({
    name: "",
    gender: "Male",
    bloodType: "O+",
    dateOfBirth: "",
    mobileNo: "",
    email: "",
    allergies: "",
    chronicConditions: "",
    actualAddress: "",
  });

  const loadDashboard = useCallback(
    async (selectId = null) => {
      try {
        setLoading(true);
        setError("");
        const res = await dashboardsApi.patient();
        const telemetry = res?.data || res || {};
        setData(telemetry);

        const profiles =
          telemetry?.patientProfiles ||
          telemetry?.data?.patientProfiles ||
          (Array.isArray(telemetry) ? telemetry : []);

        if (profiles.length > 0) {
          const currentId = selectId || activeProfile?.patientId;
          const matched = profiles.find((p) => p.patientId === currentId);
          setActiveProfile(matched || profiles[0]);
        } else {
          setActiveProfile(null);
        }
      } catch (err) {
        console.warn("User portal telemetry load notice:", err);
        setData({
          patientProfiles: [],
          upcomingAppointments: [],
          prescriptionHistory: [],
          outstandingBalances: [],
        });
        setActiveProfile(null);
      } finally {
        setLoading(false);
      }
    },
    [activeProfile?.patientId]
  );

  const switchActiveProfile = (profileId) => {
    const profiles =
      data?.patientProfiles ||
      data?.data?.patientProfiles ||
      (Array.isArray(data) ? data : []);
    const matched = profiles.find((p) => p.patientId === profileId);
    if (matched) {
      setActiveProfile(matched);
      setDrawerOpen(false);
    }
  };

  useEffect(() => {
    loadDashboard();

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, [loadDashboard]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowInstallBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleLogout = async () => {
    const confirmed = await showConfirm(
      language === "mm" ? "လူနာအကောင့်မှ ထွက်ခွာရန် သေချာပါသလား?" : "Are you sure you want to sign out of your patient portal?",
      language === "mm" ? "အကောင့်ထွက်ရန် အတည်ပြုပါ" : "Confirm Sign Out",
      language === "mm" ? "ထွက်မည်" : "Sign Out",
      language === "mm" ? "မထွက်ပါ" : "Cancel"
    );
    if (confirmed) {
      logout();
      navigate("/login", { replace: true });
    }
  };

  const handleCreateProfile = async (e) => {
    if (e) e.preventDefault();

    const validation = validatePatientProfile(newProfile);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      showError(validation.firstError, "Validation Error");
      return;
    }

    setFormErrors({});

    try {
      setLoading(true);
      const payload = validation.sanitized;
      const res = await patientsApi.create(payload);
      setManageOpen(false);
      setNewProfile({
        name: "",
        gender: "Male",
        bloodType: "O+",
        dateOfBirth: "",
        mobileNo: "",
        email: "",
        allergies: "",
        chronicConditions: "",
        actualAddress: "",
      });
      showSuccess("New family member profile added successfully.");
      const newId = res?.patientId || res?.data?.patientId || res?.data?.id || res?.id;
      await loadDashboard(newId);
    } catch (err) {
      console.error("Create profile error:", err);
      showError(err);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name) =>
    String(name || "PT")
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  const activeProfileId = activeProfile?.patientId;

  const filteredTelemetry = useMemo(() => {
    if (!data || !activeProfileId) return { appointments: [], prescriptions: [], outstanding: [] };

    return {
      appointments: (data.upcomingAppointments || []).filter(
        (a) => a.patientId === activeProfileId
      ),
      prescriptions: (data.prescriptionHistory || []).filter(
        (p) => p.patientId === activeProfileId
      ),
      outstanding: (data.outstandingBalances || []).filter((b) =>
        b.patientId
          ? b.patientId === activeProfileId
          : (data.upcomingAppointments || []).find((a) => a.id === b.appointmentId)?.patientId ===
            activeProfileId
      ),
    };
  }, [data, activeProfileId]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background font-sans text-foreground antialiased transition-colors">
      <SkipLink targetId="user-main-content" />

      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col border-r border-border/80 bg-card/95 backdrop-blur-2xl p-4 shrink-0 transition-all duration-300 ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        <div className="pb-4 border-b border-border/70">
          <BrandLogo subtitle={t.patientPortal || "Patient Portal"} collapsed={collapsed} />
        </div>

        <nav className="flex-1 mt-6 flex flex-col gap-1.5 overflow-y-auto scrollbar-thin" aria-label="Patient Navigation">
          {userNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={collapsed ? t[item.key] || item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center rounded-2xl px-3.5 py-2.5 text-xs font-semibold transition-all ${
                    collapsed ? "justify-center gap-0" : "gap-3"
                  } ${
                    isActive
                      ? "bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 font-bold border border-orange-200/60 dark:border-orange-900/40 shadow-xs"
                      : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                {!collapsed && <span>{t[item.key] || item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className="pt-4 border-t border-border/70 flex flex-col gap-1.5">
          <button
            onClick={toggleTheme}
            title={collapsed ? (isDark ? "Light Mode" : "Dark Mode") : undefined}
            className={`flex items-center rounded-2xl py-2.5 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground w-full transition-colors btn-target ${
              collapsed ? "justify-center px-0" : "gap-3 px-3.5"
            }`}
          >
            {isDark ? <SunIcon className="w-4 h-4 text-amber-400 shrink-0" /> : <MoonIcon className="w-4 h-4 shrink-0" />}
            {!collapsed && <span>{isDark ? "Light Mode" : "Dark Mode"}</span>}
          </button>
          <button
            onClick={toggleLanguage}
            title={collapsed ? (language === "en" ? "မြန်မာ" : "English") : undefined}
            className={`flex items-center rounded-2xl py-2.5 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground w-full transition-colors btn-target ${
              collapsed ? "justify-center px-0" : "gap-3 px-3.5"
            }`}
          >
            <GlobeIcon className="w-4 h-4 shrink-0" />
            {!collapsed && <span>{language === "en" ? "မြန်မာ" : "English"}</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 lg:hidden backdrop-blur-md transition-all duration-300 animate-fadeIn"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col bg-card/95 backdrop-blur-2xl p-5 border-r border-border/80 lg:hidden transform transition-transform duration-300 ease-out ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between pb-5 border-b border-border/70">
          <BrandLogo subtitle={t.patientPortal || "Patient Portal"} />
          <button
            onClick={() => setDrawerOpen(false)}
            className="p-1.5 rounded-xl text-muted-foreground hover:bg-secondary"
            aria-label={t.close || "Close"}
          >
            <Cross2Icon className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 mt-6 flex flex-col gap-1.5 overflow-y-auto">
          {userNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setDrawerOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
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

        <div className="pt-4 border-t border-border/70 flex flex-col gap-1.5">
          <button
            onClick={() => {
              toggleTheme();
              setDrawerOpen(false);
            }}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground w-full btn-target"
          >
            {isDark ? <SunIcon className="w-4 h-4 text-amber-400 shrink-0" /> : <MoonIcon className="w-4 h-4 shrink-0" />}
            <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
          </button>
          <button
            onClick={() => {
              toggleLanguage();
              setDrawerOpen(false);
            }}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground w-full btn-target"
          >
            <GlobeIcon className="w-4 h-4 shrink-0" />
            <span>{language === "en" ? "မြန်မာ" : "English"}</span>
          </button>
        </div>
      </aside>

      {/* Main Viewport */}
      <div className="flex flex-1 flex-col h-full overflow-hidden">
        {/* Top Header */}
        <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-border/80 bg-background/85 backdrop-blur-2xl px-4 md:px-8 shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile Three Stripe Hamburger Button (Opens mobile drawer) */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden p-2 rounded-2xl text-foreground hover:bg-secondary border border-border/80 shadow-2xs cursor-pointer"
              aria-label="Open mobile navigation"
            >
              <HamburgerMenuIcon className="w-5 h-5" />
            </button>

            {/* Desktop Three Stripe Hamburger Button (Collapses / Expands desktop sidebar) */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:grid h-10 w-10 place-items-center rounded-2xl text-foreground hover:bg-secondary border border-border/80 shadow-2xs cursor-pointer transition"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <HamburgerMenuIcon className="w-5 h-5" />
            </button>

            <h1 className="text-base font-bold text-foreground hidden sm:block">
              {activeProfile ? activeProfile.name : "Patient Portal"}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Family Profile Switcher using Custom Accessible Select */}
            {data?.patientProfiles && data.patientProfiles.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider hidden md:inline">
                  Active Patient:
                </span>
                <div className="w-48">
                  <Select
                    value={String(activeProfileId || "")}
                    onChange={(val) => switchActiveProfile(Number(val))}
                    placeholder="Select Profile"
                    options={data.patientProfiles.map((p) => ({
                      value: String(p.patientId),
                      label: p.name,
                      description: p.bloodType || "O+",
                    }))}
                  />
                </div>
              </div>
            )}

            {/* Profile Avatar & Header Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger>
                <div className="flex items-center gap-2.5 border-l border-border/80 pl-3 cursor-pointer p-1 rounded-2xl hover:bg-secondary/60 transition">
                  <div className="grid h-9 w-9 place-items-center rounded-2xl bg-orange-500/10 text-xs font-bold text-orange-600 dark:text-orange-400 border border-orange-500/20 shadow-2xs">
                    {getInitials(activeProfile?.name || user?.name || "PT")}
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-xs font-bold text-foreground truncate max-w-28">
                      {activeProfile?.name || user?.name || "Patient"}
                    </div>
                    <div className="text-[10px] font-semibold text-muted-foreground">
                      Patient Profile
                    </div>
                  </div>
                  <ChevronDownIcon className="w-3.5 h-3.5 text-muted-foreground hidden sm:block" />
                </div>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="right" className="w-56">
                <DropdownMenuLabel>
                  <div className="font-bold text-foreground">{activeProfile?.name || user?.name || "Patient"}</div>
                  <div className="text-[10px] text-muted-foreground font-normal">
                    {user?.email || "patient@scms.local"} {activeProfile?.bloodType ? `• ${activeProfile.bloodType}` : ""}
                  </div>
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

        {/* Offline Status Alert */}
        {isOffline && (
          <aside
            role="status"
            aria-live="polite"
            className="flex items-center justify-between gap-3 bg-amber-600 dark:bg-amber-700 px-4 py-2 text-xs font-bold text-white shadow-xs"
          >
            <div className="flex items-center gap-2">
              <InfoCircledIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                {language === "mm"
                  ? "အင်တာနက်လိုင်း ပြတ်တောက်နေပါသည်။ သိုလှောင်ထားသော ဆေးမှတ်တမ်းများကို ပြသနေပါသည်။"
                  : "Offline Mode: Network unavailable. Showing cached medical records and prescriptions."}
              </span>
            </div>
            <span className="rounded-md bg-black/20 px-2 py-0.5 font-mono text-[10px] uppercase">
              Offline
            </span>
          </aside>
        )}

        {/* PWA Install Banner */}
        {showInstallBanner && (
          <aside
            role="region"
            aria-label="PWA App Installation"
            className="flex items-center justify-between gap-3 border-b border-orange-400/40 bg-gradient-to-r from-orange-600 via-orange-500 to-amber-600 px-4 py-2.5 text-xs text-white shadow-md"
          >
            <div className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-white/20 backdrop-blur-xs">
                <DownloadIcon className="h-4 w-4 text-white" aria-hidden="true" />
              </div>
              <div>
                <span className="block font-bold">
                  {language === "mm" ? "SCMS ဆေးခန်း App ကို ဖုန်းတွင် ထည့်သွင်းပါ" : "Install SCMS Patient App"}
                </span>
                <span className="block text-[10px] font-medium text-white/90">
                  {language === "mm"
                    ? "Home screen မှ လျင်မြန်စွာ အသုံးပြုနိုင်သည်"
                    : "Add to home screen for faster 1-tap booking & offline wallet"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleInstallClick}
                className="rounded-xl bg-white px-3.5 py-1.5 font-bold text-xs text-orange-700 shadow-xs hover:bg-orange-50 active:scale-95 btn-target"
              >
                {language === "mm" ? "ထည့်မည်" : "Install"}
              </button>
              <button
                type="button"
                onClick={() => setShowInstallBanner(false)}
                className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
                aria-label={t.close || "Dismiss install banner"}
              >
                <Cross2Icon className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </aside>
        )}

        {/* Content Body with Mobile Bottom Nav Clearance */}
        <main
          id="user-main-content"
          tabIndex={-1}
          className="relative z-0 flex-1 overflow-y-auto p-4 md:p-8 bg-background pb-28 lg:pb-8 focus:outline-none"
        >
          <div className="mx-auto max-w-6xl">
            {error && (
              <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 dark:bg-rose-950/40 p-4 text-xs font-bold text-rose-700 dark:text-rose-300">
                {error}
              </div>
            )}

            {loading && !data ? (
              <div className="grid place-items-center h-[calc(100vh-200px)]">
                <div className="flex flex-col items-center gap-3">
                  <span className="loading loading-spinner loading-md text-orange-600 dark:text-orange-400" />
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Loading Patient Portal...
                  </span>
                </div>
              </div>
            ) : (
              <Outlet
                context={{
                  data,
                  activeProfile,
                  setActiveProfile,
                  filteredTelemetry,
                  loading,
                  loadDashboard,
                  setManageOpen,
                  newProfile,
                  setNewProfile,
                  language,
                  t,
                }}
              />
            )}
          </div>
        </main>

        {/* Mobile-First Thumb-Zone Bottom Navigation Bar */}
        <MobileBottomNav
          language={language}
          counts={{
            appointments: filteredTelemetry.appointments.length,
            unpaid: filteredTelemetry.outstanding.length,
          }}
        />
      </div>

      {/* Add Patient Profile Modal */}
      <ModalPortal isOpen={manageOpen} onClose={() => setManageOpen(false)}>
        <form
          onSubmit={handleCreateProfile}
          className="w-full max-w-lg rounded-3xl border border-border/80 bg-card p-6 shadow-scms-modal space-y-4 max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between pb-3 border-b border-border/70">
            <div>
              <h3 className="text-base font-bold text-foreground">
                {language === "mm" ? "မိသားစုဝင် ဆေးမှတ်တမ်းပရိုဖိုင် အသစ်ထည့်ရန်" : "Add Family Patient Profile"}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Link a family member to book appointments and track prescriptions.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setManageOpen(false)}
              className="p-1.5 rounded-xl text-muted-foreground hover:bg-secondary cursor-pointer"
            >
              <Cross2Icon className="w-4 h-4" />
            </button>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2 text-xs">
            <label className="block sm:col-span-2">
              <span className="mb-1 block font-bold text-foreground">
                Full Name <span className="text-rose-500">*</span>
              </span>
              <input
                required
                value={newProfile.name}
                onChange={(e) => {
                  setNewProfile((p) => ({ ...p, name: e.target.value }));
                  if (formErrors.name) setFormErrors((errs) => ({ ...errs, name: null }));
                }}
                className={`scms-input w-full text-xs ${formErrors.name ? "border-rose-500 ring-1 ring-rose-500" : ""}`}
                placeholder="e.g. Daw Aye Aye"
              />
              {formErrors.name && (
                <span className="text-[11px] text-rose-500 font-semibold mt-1 block">
                  {formErrors.name}
                </span>
              )}
            </label>

            <div>
              <span className="mb-1 block font-bold text-foreground">
                Gender <span className="text-rose-500">*</span>
              </span>
              <Select
                value={newProfile.gender}
                onChange={(val) => setNewProfile((p) => ({ ...p, gender: val }))}
                options={[
                  { value: "Male", label: "Male" },
                  { value: "Female", label: "Female" },
                  { value: "Other", label: "Other" },
                ]}
              />
            </div>

            <div>
              <span className="mb-1 block font-bold text-foreground">
                Blood Type <span className="text-rose-500">*</span>
              </span>
              <Select
                value={newProfile.bloodType}
                onChange={(val) => setNewProfile((p) => ({ ...p, bloodType: val }))}
                options={["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"].map((bt) => ({
                  value: bt,
                  label: bt,
                }))}
              />
            </div>

            <label className="block">
              <span className="mb-1 block font-bold text-foreground">
                Date of Birth <span className="text-rose-500">*</span>
              </span>
              <DateInput
                max={new Date().toISOString().split("T")[0]}
                value={newProfile.dateOfBirth}
                onChange={(e) => {
                  setNewProfile((p) => ({ ...p, dateOfBirth: e.target.value }));
                  if (formErrors.dateOfBirth) setFormErrors((errs) => ({ ...errs, dateOfBirth: null }));
                }}
                className={formErrors.dateOfBirth ? "border-rose-500 ring-1 ring-rose-500" : ""}
              />
              {formErrors.dateOfBirth && (
                <span className="text-[11px] text-rose-500 font-semibold mt-1 block">
                  {formErrors.dateOfBirth}
                </span>
              )}
            </label>

            <label className="block">
              <span className="mb-1 block font-bold text-foreground">
                Primary Mobile <span className="text-rose-500">*</span>
              </span>
              <input
                type="tel"
                value={newProfile.mobileNo}
                onChange={(e) => {
                  setNewProfile((p) => ({ ...p, mobileNo: e.target.value }));
                  if (formErrors.mobileNo) setFormErrors((errs) => ({ ...errs, mobileNo: null }));
                }}
                className={`scms-input w-full text-xs font-mono ${formErrors.mobileNo ? "border-rose-500 ring-1 ring-rose-500" : ""}`}
                placeholder="09..."
              />
              {formErrors.mobileNo && (
                <span className="text-[11px] text-rose-500 font-semibold mt-1 block">
                  {formErrors.mobileNo}
                </span>
              )}
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1 block font-bold text-foreground">Email Address (Optional)</span>
              <input
                type="email"
                value={newProfile.email}
                onChange={(e) => {
                  setNewProfile((p) => ({ ...p, email: e.target.value }));
                  if (formErrors.email) setFormErrors((errs) => ({ ...errs, email: null }));
                }}
                className="scms-input w-full text-xs"
                placeholder="name@example.com"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1 block font-bold text-foreground">
                Residential Address <span className="text-rose-500">*</span>
              </span>
              <textarea
                rows={2}
                value={newProfile.actualAddress}
                onChange={(e) => {
                  setNewProfile((p) => ({ ...p, actualAddress: e.target.value }));
                  if (formErrors.actualAddress) setFormErrors((errs) => ({ ...errs, actualAddress: null }));
                }}
                className={`scms-textarea w-full text-xs ${formErrors.actualAddress ? "border-rose-500 ring-1 ring-rose-500" : ""}`}
                placeholder="Street / Township / City"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1 block font-bold text-foreground">Known Allergies</span>
              <input
                value={newProfile.allergies}
                onChange={(e) => setNewProfile((p) => ({ ...p, allergies: e.target.value }))}
                className="scms-input w-full text-xs"
                placeholder="e.g. Penicillin, Aspirin, Peanuts"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1 block font-bold text-foreground">Chronic Conditions</span>
              <input
                value={newProfile.chronicConditions}
                onChange={(e) => setNewProfile((p) => ({ ...p, chronicConditions: e.target.value }))}
                className="scms-input w-full text-xs"
                placeholder="e.g. Hypertension, Asthma"
              />
            </label>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-border/70">
            <button
              type="button"
              onClick={() => setManageOpen(false)}
              className="scms-btn-outline text-xs"
            >
              {t.cancel || "Cancel"}
            </button>
            <button type="submit" disabled={loading} className="scms-btn-primary text-xs font-bold shadow-xs">
              {loading ? <span className="loading loading-spinner loading-xs" /> : "Save Profile"}
            </button>
          </div>
        </form>
      </ModalPortal>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  DashboardIcon,
  PersonIcon,
  CalendarIcon,
  ArchiveIcon,
  ActivityLogIcon,
  FileTextIcon,
  CardStackIcon,
  ReloadIcon,
  BarChartIcon,
  MagicWandIcon,
  HamburgerMenuIcon,
  Cross2Icon,
  ExitIcon,
  SunIcon,
  MoonIcon,
  LayersIcon,
  BellIcon,
  ChevronDownIcon,
  ArrowRightIcon,
  CheckIcon,
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
import { notificationsApi } from "../services/scmsApi";
import { showConfirm, showToast } from "../services/dialogs";
import { startNotificationsHub } from "../services/signalrService";
import useScrollLock from "../hooks/useScrollLock";

const navGroups = [
  {
    groupKey: "navGroupManagement",
    defaultLabel: "Management & Finance",
    items: [
      { to: "/app/dashboard", key: "dashboard", icon: DashboardIcon },
      { to: "/app/reports", key: "reports", icon: BarChartIcon },
      { to: "/app/payments", key: "payments", icon: CardStackIcon },
    ],
  },
  {
    groupKey: "navGroupPharmacy",
    defaultLabel: "Pharmacy & Inventory",
    items: [
      { to: "/app/medicines", key: "medicines", icon: ArchiveIcon },
      { to: "/app/medicines/batches", key: "batches", icon: LayersIcon },
    ],
  },
  {
    groupKey: "navGroupClinical",
    defaultLabel: "Clinical & Patient Care",
    items: [
      { to: "/app/patients", key: "patients", icon: PersonIcon },
      { to: "/app/appointments", key: "appointments", icon: CalendarIcon },
      { to: "/app/follow-ups", key: "followUps", icon: ReloadIcon },
      { to: "/app/prescriptions", key: "prescriptions", icon: FileTextIcon },
      { to: "/app/diseases", key: "diseases", icon: ActivityLogIcon },
    ],
  },
  {
    groupKey: "navGroupIntelligence",
    defaultLabel: "Intelligence & Tools",
    items: [
      { to: "/app/ai-assistant", key: "aiAssistant", icon: MagicWandIcon },
    ],
  },
];

const defaultClinicNotifications = [
  {
    id: "notif-1",
    title: "New Appointment Booked",
    description: "Token 4: Ma Aye Aye scheduled for consultation today at 2:00 PM.",
    actionRoute: "/app/appointments",
    timeAgo: "12m ago",
    unread: true,
  },
  {
    id: "notif-2",
    title: "Patient in Waiting Queue",
    description: "3 patients are currently waiting in today's consultation queue.",
    actionRoute: "/app/appointments",
    timeAgo: "45m ago",
    unread: true,
  },
  {
    id: "notif-3",
    title: "Follow-up Appointment Due",
    description: "Patient U Ba has a follow-up review scheduled for this afternoon.",
    actionRoute: "/app/appointments",
    timeAgo: "2h ago",
    unread: true,
  },
];

export default function AppShell() {
  const { t, toggleLanguage, language } = useLanguage();
  const { isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useScrollLock(open);

  // Notification Dropdown State
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState(defaultClinicNotifications);
  const notifRef = useRef(null);

  const unreadCount = notifications.filter((n) => n.unread).length;

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await notificationsApi.list({ includeAll: true });
        const items = res?.items || res?.data?.items || (Array.isArray(res) ? res : []);
        if (items.length > 0) {
          const mapped = items.map((item, idx) => ({
            id: item.id || `api-notif-${idx}`,
            title: item.title || "Clinic Notification",
            description: (item.description || "Updated clinic record.").replace(/Token\s*#(\d+)/gi, "Token $1"),
            actionRoute: item.actionRoute || "/app/appointments",
            timeAgo: item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Recent",
            unread: true,
          }));
          setNotifications(mapped);
        }
      } catch {
        // Fallback to default clinical notifications
        console.debug("Using fallback notifications for clinic dashboard");
      }
    };

    fetchNotifications();

    const { stop } = startNotificationsHub({
      onReceiveNotification: (notification) => {
        if (!notification) return;
        const newNotif = {
          id: notification.id || `realtime-${Date.now()}`,
          title: notification.title || "Clinic Notification",
          description: (notification.description || "").replace(/Token\s*#(\d+)/gi, "Token $1"),
          actionRoute: notification.actionRoute || "/app/appointments",
          timeAgo: "Just now",
          unread: true,
        };

        setNotifications((prev) => [newNotif, ...prev.filter((n) => n.id !== newNotif.id)]);
        showToast(`${newNotif.title}: ${newNotif.description}`, "info");
      },
      onNotificationsChanged: () => {
        fetchNotifications();
      },
    });

    const interval = setInterval(fetchNotifications, 15000);
    return () => {
      clearInterval(interval);
      stop();
    };
  }, []);

  // Close dropdown on click outside or escape key
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && notifOpen) {
        setNotifOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [notifOpen]);

  const handleLogout = async () => {
    const confirmed = await showConfirm(
      language === "mm" ? "အကောင့်မှ ထွက်ခွာရန် သေချာပါသလား?" : "Are you sure you want to log out of your session?",
      language === "mm" ? "အကောင့်ထွက်ရန် အတည်ပြုပါ" : "Confirm Sign Out",
      language === "mm" ? "ထွက်မည်" : "Log Out",
      language === "mm" ? "မထွက်ပါ" : "Cancel"
    );
    if (confirmed) {
      logout();
      navigate("/login", { replace: true });
    }
  };

  const handleNotificationClick = (item) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, unread: false } : n))
    );
    setNotifOpen(false);
    navigate(item.actionRoute || "/app/appointments");
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans transition-colors overflow-x-hidden">
      <SkipLink targetId="main-content" />

      {/* Mobile overlay backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-md lg:hidden transition-all duration-300 animate-fadeIn"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Modern Apricot Glass Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border/80 bg-card/95 backdrop-blur-2xl p-4 transition-all duration-300 overflow-x-hidden lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "lg:w-[84px]" : "lg:w-[260px]"}`}
      >
        <div className="flex items-center justify-between pb-4 border-b border-border/70">
          <BrandLogo subtitle={t.ownerPortal} collapsed={collapsed} />
          <button
            className="lg:hidden grid h-8 w-8 place-items-center rounded-xl text-muted-foreground hover:bg-secondary transition cursor-pointer"
            onClick={() => setOpen(false)}
            aria-label={t.close}
          >
            <Cross2Icon className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav
          className="flex-1 space-y-3.5 overflow-y-auto overflow-x-hidden pt-3 pr-1 scrollbar-thin"
          aria-label="Practice Navigation"
        >
          {navGroups.map((group, gIdx) => (
            <div key={group.groupKey} className="space-y-1">
              {!collapsed ? (
                <div className="px-3 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75">
                  {t[group.groupKey] || group.defaultLabel}
                </div>
              ) : gIdx > 0 ? (
                <div className="my-2 border-t border-border/60" />
              ) : null}

              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center rounded-2xl px-3.5 py-2 text-xs font-semibold transition-all ${
                          collapsed ? "justify-center gap-0" : "gap-3"
                        } ${
                          isActive
                            ? "bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 font-bold border border-orange-200/60 dark:border-orange-900/40 shadow-xs"
                            : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                        }`
                      }
                      title={collapsed ? t[item.key] : undefined}
                    >
                      <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                      {!collapsed && <span className="truncate">{t[item.key]}</span>}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom Banner Card (Matching reference mockup) */}
        {!collapsed && (
          <div className="my-3 rounded-2xl border border-orange-200/60 dark:border-orange-900/40 bg-gradient-to-br from-orange-50/80 via-orange-50/40 to-transparent dark:from-orange-950/40 dark:via-orange-950/20 p-4 transition-all hover:shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-orange-900 dark:text-orange-200">
                Upgrade Plan
              </span>
              <button
                onClick={() => navigate("/app/ai-assistant")}
                className="grid h-6 w-6 place-items-center rounded-full bg-orange-500 text-white shadow-2xs hover:bg-orange-600 transition"
                aria-label="Upgrade plan details"
              >
                <ArrowRightIcon className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 leading-tight">
              Unlock premium AI & advanced clinical features
            </p>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div
        className={`transition-all duration-300 overflow-x-hidden ${
          collapsed ? "lg:pl-[84px]" : "lg:pl-[260px]"
        }`}
      >
        {/* Top Apricot Header Navigation Bar */}
        <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border/80 bg-background/85 backdrop-blur-2xl px-4 sm:px-6 gap-4">
          {/* Left Controls */}
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden grid h-9 w-9 place-items-center rounded-2xl border border-border/80 bg-card text-foreground hover:bg-secondary transition shadow-2xs cursor-pointer"
              onClick={() => setOpen(true)}
              aria-label="Open mobile menu"
            >
              <HamburgerMenuIcon className="w-4 h-4" />
            </button>
            <button
              className="hidden lg:grid h-9 w-9 place-items-center rounded-2xl border border-border/80 bg-card text-foreground hover:bg-secondary transition shadow-2xs cursor-pointer"
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <HamburgerMenuIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Right Utility Controls & User Profile Pill */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="grid h-9 w-9 place-items-center rounded-2xl border border-border/80 bg-card text-foreground hover:bg-secondary transition btn-target shadow-2xs"
              title={isDark ? t.lightMode : t.darkMode}
              aria-label="Toggle theme"
            >
              {isDark ? (
                <SunIcon className="w-4 h-4 text-amber-400" />
              ) : (
                <MoonIcon className="w-4 h-4 text-foreground" />
              )}
            </button>

            {/* Notification Bell Dropdown Container */}
            <div className="relative" ref={notifRef}>
              <button
                className={`relative grid h-9 w-9 place-items-center rounded-2xl border border-border/80 bg-card text-foreground hover:bg-secondary transition btn-target shadow-2xs ${
                  notifOpen ? "ring-2 ring-orange-500/50 bg-secondary" : ""
                }`}
                title={t.notifications || "Notifications"}
                aria-label={
                  unreadCount > 0
                    ? `${unreadCount} new notifications`
                    : "No unread notifications"
                }
                aria-haspopup="true"
                aria-expanded={notifOpen}
                aria-controls="notification-dropdown-panel"
                onClick={() => setNotifOpen((prev) => !prev)}
              >
                <BellIcon className="w-4 h-4" aria-hidden="true" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 grid h-4 min-w-4 px-1 place-items-center rounded-full bg-orange-500 text-[9px] font-bold text-white shadow-xs animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popover Dropdown */}
              {notifOpen && (
                <div
                  id="notification-dropdown-panel"
                  role="region"
                  aria-label={t.notifications || "Notifications"}
                  className="absolute right-0 top-full mt-2.5 w-80 sm:w-96 rounded-3xl border border-border/80 bg-card/95 backdrop-blur-2xl shadow-scms-modal z-50 animate-fadeIn p-4 space-y-3"
                >
                  {/* Dropdown Header */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-border/70">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-foreground">
                        {t.notifications || "Notifications"}
                      </h4>
                      {unreadCount > 0 && (
                        <span className="rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 px-2 py-0.5 text-[10px] font-extrabold font-mono">
                          {unreadCount} new
                        </span>
                      )}
                    </div>

                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1"
                        aria-label="Mark all notifications as read"
                      >
                        <CheckIcon className="w-3 h-3" aria-hidden="true" />
                        <span>{t.markRead || "Mark all read"}</span>
                      </button>
                    )}
                  </div>

                  {/* Notification List */}
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
                    {notifications.length > 0 ? (
                      notifications.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleNotificationClick(item)}
                          className={`w-full text-left p-3 rounded-2xl border transition-all flex items-start gap-3 btn-target ${
                            item.unread
                              ? "bg-orange-50/50 dark:bg-orange-950/30 border-orange-200/70 dark:border-orange-900/50 hover:bg-orange-50 dark:hover:bg-orange-950/50"
                              : "bg-secondary/30 border-border/70 hover:bg-secondary/60"
                          }`}
                        >
                          <div
                            className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-xs font-bold ${
                              item.unread
                                ? "bg-orange-500 text-white shadow-2xs"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <CalendarIcon className="w-4 h-4" aria-hidden="true" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span
                                className={`text-xs font-bold truncate ${
                                  item.unread
                                    ? "text-foreground"
                                    : "text-muted-foreground font-semibold"
                                }`}
                              >
                                {item.title}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                                {item.timeAgo}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
                              {item.description}
                            </p>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="py-6 px-4 text-center space-y-1 rounded-2xl border border-dashed border-border/80">
                        <p className="text-xs font-bold text-foreground">
                          {t.noNotifications || "No new notifications"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {t.noNotificationsSubtitle ||
                            "You're all caught up with clinic updates."}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Dropdown Footer CTA */}
                  <div className="pt-2 border-t border-border/70">
                    <button
                      onClick={() => {
                        setNotifOpen(false);
                        navigate("/app/appointments");
                      }}
                      className="w-full py-2 px-3 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2 btn-target"
                    >
                      <span>{t.viewAllAppointments || "View all appointments"}</span>
                      <ArrowRightIcon className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              className="scms-btn-outline px-3 h-9 min-h-9 text-xs font-bold btn-target shadow-2xs"
              title="Switch language"
            >
              {language === "en" ? "မြန်မာ" : "English"}
            </button>

            {/* User Profile Pill & Dropdown Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger>
                <div className="flex items-center gap-2.5 pl-2 border-l border-border/80 cursor-pointer p-1 rounded-2xl hover:bg-secondary/60 transition">
                  <div className="grid h-9 w-9 place-items-center rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 font-extrabold text-xs border border-orange-500/20 shadow-2xs">
                    {user?.name?.[0]?.toUpperCase() || "A"}
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-xs font-bold text-foreground leading-none">
                      {user?.name || "Clinic Administrator"}
                    </div>
                    <div className="text-[10px] font-semibold text-muted-foreground leading-none mt-1">
                      {user?.role || "Admin"}
                    </div>
                  </div>
                  <ChevronDownIcon className="w-3.5 h-3.5 text-muted-foreground hidden sm:block" />
                </div>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="right" className="w-56">
                <DropdownMenuLabel>
                  <div className="font-bold text-foreground">{user?.name || "Administrator"}</div>
                  <div className="text-[10px] text-muted-foreground font-normal lowercase">{user?.email || "admin@scms.local"}</div>
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

        {/* Main Routed Content */}
        <main id="main-content" className="relative z-0 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}


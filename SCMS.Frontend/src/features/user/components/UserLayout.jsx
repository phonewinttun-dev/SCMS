import { useMemo, useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  FileText,
  CreditCard,
  FolderOpen,
  LogOut,
  Languages,
  User,
} from "lucide-react";

const PRIMARY = "#4F46E5"; // Vibrant Indigo
const PRIMARY_LIGHT = "#EEF2FF";
const BG = "#F9FAFB";
const CARD = "#FFFFFF";
const TEXT = "#1F2937";
const MUTED = "#6B7280";
const BORDER = "#E5E7EB";

const labels = {
  en: {
    brand: "SCMS",
    subtitle: "Patient Portal",
    dashboard: "Dashboard",
    appointments: "Book Appointment",
    prescriptions: "My Prescriptions",
    documents: "My Documents",
    payments: "Billing & Payments",
    logout: "Logout",
    patient: "Patient Profile",
    role: "SCMS Patient",
    language: "မြန်မာ",
  },
  mm: {
    brand: "SCMS",
    subtitle: "လူနာပေါ်တယ်",
    dashboard: "ဒက်ရှ်ဘုတ်",
    appointments: "ချိန်းဆိုမှု ရယူရန်",
    prescriptions: "ကျွန်ုပ်၏ ဆေးညွှန်းများ",
    documents: "ဆေးဘက်ဆိုင်ရာ စာရွက်စာတမ်းများ",
    payments: "ငွေပေးချေမှုများ",
    logout: "ထွက်မည်",
    patient: "လူနာ ပရိုဖိုင်",
    role: "SCMS လူနာ",
    language: "English",
  },
};

const navItems = [
  { key: "dashboard", icon: LayoutDashboard, to: "/dashboard" },
  { key: "appointments", icon: CalendarDays, to: "/book-appointment" },
  { key: "prescriptions", icon: FileText, to: "/my-prescriptions" },
  { key: "documents", icon: FolderOpen, to: "/my-documents" },
  { key: "payments", icon: CreditCard, to: "/my-payments" },
];

export default function UserLayout() {
  const navigate = useNavigate();
  const [lang, setLang] = useState(localStorage.getItem("lang") || "en");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const t = useMemo(() => labels[lang], [lang]);
  const userName = localStorage.getItem("userName") || "Patient User";

  const toggleLanguage = () => {
    const next = lang === "en" ? "mm" : "en";
    setLang(next);
    localStorage.setItem("lang", next);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    localStorage.removeItem("user");
    localStorage.removeItem("userName");
    localStorage.removeItem("userId");
    navigate("/login");
  };

  const getInitials = (name) =>
    String(name || "U")
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        display: "flex",
        background: BG,
        color: TEXT,
        fontFamily: "Inter, Manrope, sans-serif",
      }}
    >
      <style>{layoutStyles}</style>

      <aside
        style={{
          width: 268,
          minWidth: 268,
          height: "100vh",
          background: CARD,
          borderRight: `1px solid ${BORDER}`,
          padding: "24px 16px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "0 12px 22px",
            borderBottom: `1px solid ${BORDER}`,
          }}
        >
          <div
            style={{
              color: PRIMARY,
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: "-0.03em",
            }}
          >
            {t.brand}
          </div>
          <div style={{ marginTop: 4, color: MUTED, fontSize: 12 }}>
            {t.subtitle}
          </div>
        </div>

        <nav
          style={{
            flex: 1,
            marginTop: 18,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            overflowY: "auto",
          }}
        >
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.key}
                to={item.to}
                style={({ isActive }) => ({
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 14px",
                  borderRadius: 12,
                  textDecoration: "none",
                  fontSize: 14,
                  fontWeight: 700,
                  color: isActive ? PRIMARY : "#475467",
                  background: isActive ? PRIMARY_LIGHT : "transparent",
                  transition: "0.18s ease",
                })}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = PRIMARY_LIGHT;
                  e.currentTarget.style.transform = "translateX(2px)";
                }}
                onMouseLeave={(e) => {
                  const active = e.currentTarget.getAttribute("aria-current");
                  e.currentTarget.style.background =
                    active === "page" ? PRIMARY_LIGHT : "transparent";
                  e.currentTarget.style.transform = "translateX(0)";
                }}
              >
                <Icon size={18} />
                <span>{t[item.key]}</span>
              </NavLink>
            );
          })}
        </nav>

        <div
          style={{
            borderTop: `1px solid ${BORDER}`,
            paddingTop: 14,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <button onClick={toggleLanguage} style={footerButtonStyle}>
            <Languages size={18} />
            {t.language}
          </button>

          <button
            onClick={logout}
            style={{
              ...footerButtonStyle,
              color: "#D92D20",
            }}
          >
            <LogOut size={18} />
            {t.logout}
          </button>
        </div>
      </aside>

      <main
        style={{
          flex: 1,
          height: "100vh",
          overflow: "auto",
          padding: "28px 32px",
        }}
      >
        <div style={{ maxWidth: 1480, margin: "0 auto" }}>
          <header
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 24,
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: 30,
                  fontWeight: 800,
                  letterSpacing: "-0.04em",
                }}
              >
                {userName}
              </h1>
              <p style={{ marginTop: 6, color: MUTED, fontSize: 14 }}>
                {t.role}
              </p>
            </div>

            <div
              style={{
                background: CARD,
                border: `1px solid ${BORDER}`,
                borderRadius: 16,
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: PRIMARY,
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                }}
              >
                {getInitials(userName)}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800 }}>{userName}</div>
                <div style={{ fontSize: 12, color: MUTED }}>{t.role}</div>
              </div>
            </div>
          </header>

          {loading ? (
            <div style={{ animation: "shimmer-fade 0.5s ease-in-out" }}>
              {/* Stats Skeleton Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 18 }}>
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="skeleton-card" style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 18, minHeight: 132, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div className="skeleton" style={{ width: 34, height: 34, borderRadius: 12 }} />
                    <div className="skeleton" style={{ width: "60%", height: 10, margin: "12px 0 6px" }} />
                    <div className="skeleton" style={{ width: "40%", height: 24 }} />
                  </div>
                ))}
              </div>

              {/* Content Skeleton Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1.65fr 0.8fr", gap: 18 }}>
                {/* Patient Queue Skeleton Card */}
                <div className="skeleton-card" style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 20, minHeight: 380, display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ width: "100%" }}>
                      <div className="skeleton" style={{ width: "30%", height: 18, marginBottom: 8 }} />
                      <div className="skeleton" style={{ width: "50%", height: 12 }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, padding: "8px 0" }}>
                        <div className="skeleton" style={{ width: 40, height: 12 }} />
                        <div className="skeleton" style={{ width: 34, height: 34, borderRadius: "50%" }} />
                        <div className="skeleton" style={{ width: "35%", height: 12 }} />
                        <div className="skeleton" style={{ width: "20%", height: 12 }} />
                        <div className="skeleton" style={{ width: 60, height: 24, borderRadius: 12, marginLeft: "auto" }} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary Skeleton Card */}
                <div className="skeleton-card" style={{ background: `linear-gradient(150deg, ${PRIMARY} 0%, #312E81 100%)`, borderRadius: 18, padding: 22, minHeight: 380, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div className="skeleton-light" style={{ width: "40%", height: 16, marginBottom: 24 }} />
                    <div className="skeleton-light" style={{ width: "60%", height: 12, marginBottom: 8 }} />
                    <div className="skeleton-light" style={{ width: "80%", height: 36 }} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div className="skeleton-light" style={{ width: "100%", height: 36, borderRadius: 8 }} />
                    <div className="skeleton-light" style={{ width: "100%", height: 36, borderRadius: 8 }} />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <Outlet context={{ lang, t }} />
          )}
        </div>
      </main>
    </div>
  );
}

const footerButtonStyle = {
  width: "100%",
  border: 0,
  background: "transparent",
  padding: "12px 14px",
  borderRadius: 12,
  display: "flex",
  alignItems: "center",
  gap: 12,
  color: "#475467",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  transition: "0.18s ease",
  textAlign: "left",
};

const layoutStyles = `
  @keyframes shimmer {
    0% { background-position: -468px 0; }
    100% { background-position: 468px 0; }
  }
  .skeleton {
    animation: shimmer 1.2s infinite linear;
    background: linear-gradient(to right, #F2F4F7 8%, #EAECF0 18%, #F2F4F7 33%);
    background-size: 800px 104px;
    position: relative;
    border-radius: 8px;
    overflow: hidden;
  }
  .skeleton-light {
    animation: shimmer 1.2s infinite linear;
    background: linear-gradient(to right, rgba(255,255,255,0.12) 8%, rgba(255,255,255,0.24) 18%, rgba(255,255,255,0.12) 33%);
    background-size: 800px 104px;
    position: relative;
    border-radius: 8px;
    overflow: hidden;
  }
  @keyframes shimmer-fade {
    from { opacity: 0.8; }
    to { opacity: 1; }
  }
`;

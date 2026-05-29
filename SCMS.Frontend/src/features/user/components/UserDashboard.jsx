import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import scmsApi from "../../../services/scmsApi";

const PRIMARY = "#4F46E5";
const SUCCESS = "#027A48";
const WARNING = "#B54708";
const DANGER = "#D92D20";
const BORDER = "#E5E7EB";
const CARD = "#FFFFFF";
const TEXT = "#1F2937";
const MUTED = "#6B7280";

export default function UserDashboard() {
  const navigate = useNavigate();
  const outlet = useOutletContext();
  const lang = outlet?.lang || localStorage.getItem("lang") || "en";

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [queueStatus, setQueueStatus] = useState(null);
  const [error, setError] = useState("");

  const t = {
    welcome: lang === "mm" ? "ပြန်လည်ကြိုဆိုပါတယ်!" : "Welcome back!",
    summary: lang === "mm" ? "ဆေးခန်းလည်ပတ်မှုအကျဉ်းချုပ်" : "Clinic visit summary",
    stats: {
      upcoming: lang === "mm" ? "လာမည့် ချိန်းဆိုမှုများ" : "Upcoming Appts",
      prescriptions: lang === "mm" ? "ဆေးညွှန်းများ" : "Prescriptions",
      outstanding: lang === "mm" ? "မရှင်းရသေးသော ဘေလ်" : "Outstanding Bills",
      notifications: lang === "mm" ? "အသိပေးချက်များ" : "Notifications",
    },
    liveQueue: lang === "mm" ? "တိုက်ရိုက် တိုကင်တန်းစီမှု" : "Live Queue Tracker",
    allergies: lang === "mm" ? "ဓာတ်မတည့်မှုများ" : "Allergies",
    chronic: lang === "mm" ? "နာတာရှည်ရောဂါများ" : "Chronic Conditions",
    blood: lang === "mm" ? "သွေးအုပ်စု" : "Blood Group",
  };

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");
      const result = await scmsApi.dashboard.patient();
      setData(result);

      // If there's an upcoming appointment, fetch its live queue status
      const upcoming = result?.upcomingAppointments || [];
      const activeAppt = upcoming.find(a => a.status?.toLowerCase() !== "cancelled" && a.status?.toLowerCase() !== "completed");
      if (activeAppt) {
        try {
          const qs = await scmsApi.appointments.queueStatus(activeAppt.id);
          setQueueStatus(qs);
        } catch {
          setQueueStatus(null);
        }
      }
    } catch (err) {
      console.error("User dashboard load error:", err);
      setError("Failed to load patient dashboard. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return <div style={{ textAlign: "center", padding: "40px", color: MUTED }}>Loading dashboard telemetry...</div>;
  }

  const profile = data?.patientProfiles?.[0] || {};
  const appointments = data?.upcomingAppointments || [];
  const prescriptions = data?.prescriptionHistory || [];
  const outstanding = data?.outstandingBalances || [];

  // Parse allergies and chronic conditions
  let allergies = "No known allergies";
  let chronicConditions = "None";
  if (profile.address) {
    try {
      const parsed = JSON.parse(profile.address);
      allergies = parsed.Allergies || allergies;
      chronicConditions = parsed.ChronicConditions || chronicConditions;
    } catch {}
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {error && <div style={{ color: DANGER, background: "#FFF1F0", padding: "12px 16px", borderRadius: 12, border: `1px solid #FECDCA` }}>{error}</div>}

      {/* Overview Cards */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 16 }}>
        <article style={statCardStyle}>
          <div style={{ fontSize: 13, fontWeight: 700, color: MUTED }}>{t.stats.upcoming}</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: PRIMARY, marginTop: 8 }}>{appointments.length}</div>
        </article>

        <article style={statCardStyle}>
          <div style={{ fontSize: 13, fontWeight: 700, color: MUTED }}>{t.stats.prescriptions}</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: SUCCESS, marginTop: 8 }}>{prescriptions.length}</div>
        </article>

        <article style={statCardStyle}>
          <div style={{ fontSize: 13, fontWeight: 700, color: MUTED }}>{t.stats.outstanding}</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: outstanding.length > 0 ? WARNING : MUTED, marginTop: 8 }}>
            RM {outstanding.reduce((sum, item) => sum + (item.amount || item.outstandingAmount || 0), 0)}
          </div>
        </article>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 0.9fr", gap: 20 }}>
        {/* Live Queue widget */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {queueStatus ? (
            <article style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, #312E81 100%)`, color: "white", padding: 24, borderRadius: 18, boxShadow: "0 4px 18px rgba(79, 70, 229, 0.25)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", background: "rgba(255,255,255,0.18)", padding: "4px 10px", borderRadius: 999 }}>{t.liveQueue}</span>
                <span style={{ fontSize: 12, fontWeight: 600 }}>Status: {queueStatus.doctorStatus}</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 24 }}>
                <div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>Your Token</div>
                  <div style={{ fontSize: 42, fontWeight: 900, marginTop: 4 }}>#{queueStatus.patientTokenNumber}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>Active Token</div>
                  <div style={{ fontSize: 42, fontWeight: 900, marginTop: 4, color: "#FBBF24" }}>#{queueStatus.currentActiveTokenNumber}</div>
                </div>
              </div>

              <div style={{ marginTop: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                  <span>Patients Ahead: {queueStatus.patientsAhead}</span>
                  <span>Est. Wait: {queueStatus.estimatedWaitTimeMinutes} mins</span>
                </div>
                <div style={{ height: 8, background: "rgba(255,255,255,0.2)", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${queueStatus.progressBarPercentage}%`, background: "white", transition: "width 0.4s ease" }} />
                </div>
              </div>

              <p style={{ marginTop: 18, fontSize: 13, lineHeight: 1.5, background: "rgba(255,255,255,0.08)", padding: "10px 14px", borderRadius: 12 }}>
                {queueStatus.queueMessage}
              </p>
            </article>
          ) : (
            <article style={{ background: CARD, border: `1px solid ${BORDER}`, padding: 24, borderRadius: 18, textAlign: "center", color: MUTED }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: TEXT, marginBottom: 6 }}>No Active Live Queue</div>
              <p style={{ fontSize: 13 }}>You don't have an active consultation check-in for today. Go to bookings to request an appointment slot.</p>
              <button onClick={() => navigate("/user/book-appointment")} style={{ marginTop: 16, padding: "10px 18px", background: PRIMARY, color: "white", border: 0, borderRadius: 12, fontWeight: 700, cursor: "pointer" }}>Book Appointment</button>
            </article>
          )}

          {/* Clinical Profile details */}
          <article style={{ background: CARD, border: `1px solid ${BORDER}`, padding: 20, borderRadius: 18 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 14 }}>{t.welcome}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={profileDetailBlock}>
                <span style={profileLabelStyle}>{t.blood}</span>
                <span style={profileValueStyle}>{profile.bloodType || "O+"}</span>
              </div>
              <div style={profileDetailBlock}>
                <span style={profileLabelStyle}>{t.allergies}</span>
                <span style={{ ...profileValueStyle, color: DANGER }}>{allergies}</span>
              </div>
              <div style={profileDetailBlock}>
                <span style={profileLabelStyle}>{t.chronic}</span>
                <span style={profileValueStyle}>{chronicConditions}</span>
              </div>
              <div style={profileDetailBlock}>
                <span style={profileLabelStyle}>Age / Gender</span>
                <span style={profileValueStyle}>{profile.gender?.toUpperCase() || "MALE"}</span>
              </div>
            </div>
          </article>
        </div>

        {/* List of outstanding invoices or notifications */}
        <article style={{ background: CARD, border: `1px solid ${BORDER}`, padding: 20, borderRadius: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800 }}>Outstanding Balance</h3>
            <span style={{ fontSize: 12, color: MUTED }}>Pending bills needing attention</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {outstanding.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 10px", color: MUTED, fontSize: 13 }}>All clear! No outstanding balances.</div>
            ) : (
              outstanding.map((bill, index) => (
                <div key={index} style={{ border: `1px solid ${BORDER}`, padding: 12, borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>RM {bill.amount || bill.outstandingAmount}</div>
                    <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>Invoice #{bill.invoiceId || bill.id || "1028"}</div>
                  </div>
                  <button onClick={() => navigate("/user/my-payments")} style={{ padding: "6px 12px", background: PRIMARY_LIGHT, color: PRIMARY, border: 0, borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Pay Now</button>
                </div>
              ))
            )}
          </div>
        </article>
      </div>
    </div>
  );
}

const statCardStyle = {
  background: CARD,
  border: `1px solid ${BORDER}`,
  borderRadius: 18,
  padding: 20,
  minHeight: 112,
  boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
};

const profileDetailBlock = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  background: "#F9FAFB",
  padding: 12,
  borderRadius: 12,
  border: `1px solid ${BORDER}`,
};

const profileLabelStyle = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  color: MUTED,
  letterSpacing: "0.04em",
};

const profileValueStyle = {
  fontSize: 14,
  fontWeight: 800,
  color: TEXT,
};

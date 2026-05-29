import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import scmsApi from "../../services/scmsApi";
import { Bell, Eye } from "lucide-react";

const PRIMARY = "#4F46E5";
const BORDER = "#E5E7EB";
const CARD = "#FFFFFF";
const TEXT = "#1F2937";
const MUTED = "#6B7280";
const SUCCESS = "#027A48";

export default function UserNotification() {
  const outlet = useOutletContext();
  const lang = outlet?.lang || localStorage.getItem("lang") || "en";

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState(null);

  const t = {
    title: lang === "mm" ? "အသိပေးချက်များ" : "Notifications",
    subtitle: lang === "mm" ? "ဆေးခန်းချိန်းဆိုမှုများနှင့် သတိပေးချက်များ" : "Stay updated on check-in schedules, alerts, and medical summaries",
    noNotif: lang === "mm" ? "မည်သည့်အသိပေးချက်မျှ မရှိသေးပါ။" : "No alerts or notifications.",
    markRead: lang === "mm" ? "ဖတ်ပြီးကြောင်းမှတ်သားမည်" : "Mark as Read",
  };

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const list = await scmsApi.notifications.list();
      setNotifications(list || []);
    } catch (err) {
      console.error("Load notifications error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      setMarkingId(id);
      await scmsApi.notifications.markAsRead(id);
      
      // Update local state to reflect read status
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, deleteFlag: true } : n));
    } catch (err) {
      console.error("Mark read error:", err);
    } finally {
      setMarkingId(null);
    }
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: "40px", color: MUTED }}>Loading alert streams...</div>;
  }

  // Active unread notifications
  const activeList = notifications.filter(n => !n.deleteFlag);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 800, margin: "0 auto" }}>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: TEXT }}>{t.title}</h2>
        <p style={{ fontSize: 14, color: MUTED, marginTop: 4 }}>{t.subtitle}</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {activeList.length === 0 ? (
          <article style={{ background: CARD, border: `1px solid ${BORDER}`, padding: 40, borderRadius: 18, textAlign: "center", color: MUTED }}>
            <Bell size={36} style={{ color: PRIMARY, margin: "0 auto 12px" }} />
            <p style={{ fontSize: 14 }}>{t.noNotif}</p>
          </article>
        ) : (
          activeList.map((notif) => (
            <article key={notif.id} style={{ background: CARD, border: `1px solid ${BORDER}`, padding: 18, borderRadius: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{ padding: 10, borderRadius: 10, background: "#EEF2FF", color: PRIMARY, marginTop: 2 }}>
                  <Bell size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: TEXT }}>{notif.title || "Notification"}</div>
                  <p style={{ fontSize: 13, color: MUTED, marginTop: 4, lineHeight: 1.45 }}>{notif.description}</p>
                  <span style={{ fontSize: 11, color: MUTED, display: "block", marginTop: 6 }}>{new Date(notif.createdAt).toLocaleString()}</span>
                </div>
              </div>

              <button
                onClick={() => handleMarkAsRead(notif.id)}
                disabled={markingId === notif.id}
                style={{
                  border: 0,
                  background: "#F3F4F6",
                  color: TEXT,
                  padding: "6px 12px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: markingId === notif.id ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4
                }}
              >
                <Eye size={14} />
                {markingId === notif.id ? "Processing..." : t.markRead}
              </button>
            </article>
          ))
        )}
      </div>
    </div>
  );
}

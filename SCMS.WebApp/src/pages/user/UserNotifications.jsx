import { useEffect, useState } from "react";
import { Bell, Check, RefreshCcw } from "lucide-react";
import { createNotificationsConnection } from "../../services/realtime";
import { notificationsApi } from "../../services/scmsApi";
import { showError } from "../../services/dialogs";

const toArray = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.items)) return res.data.items;
  return [];
};

export default function UserNotifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [liveStatus, setLiveStatus] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const res = await notificationsApi.list({ pageNumber: 1, pageSize: 30 });
      setItems(toArray(res));
    } catch (error) {
      await showError(error?.response?.data?.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    let disposed = false;
    const connection = createNotificationsConnection();
    connection.on("ReceiveNotification", (notification) => {
      setItems((current) => [notification, ...current.filter((item) => item.id !== notification?.id)]);
      setLiveStatus("New notification received.");
    });
    connection.start().catch(() => {
      if (!disposed) setLiveStatus("Live notifications are unavailable.");
    });
    return () => {
      disposed = true;
      connection.stop();
    };
  }, []);

  const markRead = async (id) => {
    try {
      await notificationsApi.read(id);
      setItems((current) => current.filter((item) => item.id !== id));
    } catch (error) {
      await showError(error?.response?.data?.message || "Failed to mark notification as read.");
    }
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Notifications</h2>
          <p className="text-sm font-semibold text-slate-500">Clinic alerts, appointment updates, and payment messages.</p>
        </div>
        <button className="btn rounded-xl bg-indigo-600 text-white hover:bg-indigo-700" onClick={load} disabled={loading}>
          <RefreshCcw size={16} />
          Refresh
        </button>
      </div>

      {liveStatus && <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-sm font-bold text-indigo-700">{liveStatus}</div>}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-bold text-slate-500">
          No notifications.
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-lg font-black text-slate-900">
                    <Bell size={18} />
                    {item.title}
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{item.description}</p>
                </div>
                <button className="btn btn-sm rounded-xl border-slate-200 bg-white" onClick={() => markRead(item.id)}>
                  <Check size={15} />
                  Read
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

import { useEffect, useState } from "react";
import { fetchQueueStatus } from "../services/patientPortalApi";
import type { QueueStatusData } from "../types";
import { Sheet } from "./Sheet";

export interface QueueStatusProps {
  open: boolean;
  appointmentId?: number;
  onClose: () => void;
}

export function QueueStatus({ open, appointmentId, onClose }: QueueStatusProps) {
  const [queue, setQueue] = useState<QueueStatusData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !appointmentId) return;

    const load = () => {
      setLoading(true);
      fetchQueueStatus(appointmentId)
        .then(setQueue)
        .catch(() => setQueue(null))
        .finally(() => setLoading(false));
    };

    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [open, appointmentId]);

  return (
    <Sheet open={open} onClose={onClose} title="စောင့်ဆိုင်းသူ စာရင်း">
      <div className="queue-ring-wrap">
        <div
          className="queue-live-badge"
          style={{
            background: "var(--blue-50)",
            marginBottom: 16,
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "3px 9px",
            borderRadius: 99,
          }}
        >
          <div className="live-dot" />
          <span style={{ color: "var(--blue-600)", fontSize: 12, fontWeight: 600 }}>
            Live update
          </span>
        </div>

        {loading && !queue ? (
          <p style={{ color: "var(--slate-400)", fontSize: 14 }}>Loading…</p>
        ) : queue ? (
          <>
            <div className="queue-ring">
              <div className="queue-ring-num">{queue.patientTokenNumber}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--blue-500)" }}>
                ယောက်မြောက်
              </div>
            </div>
            <p style={{ fontSize: 13, color: "var(--slate-500)", textAlign: "center", marginBottom: 8 }}>
              {queue.queueMessage}
            </p>
            <div className="queue-stats">
              <div style={{ textAlign: "center" }}>
                <div className="queue-stat-val">~{queue.estimatedWaitTimeMinutes}</div>
                <div className="queue-stat-key">မိနစ် အလို</div>
              </div>
              <div
                style={{
                  textAlign: "center",
                  borderLeft: "1px solid var(--slate-200)",
                  paddingLeft: 20,
                }}
              >
                <div className="queue-stat-val">{queue.patientsAhead}</div>
                <div className="queue-stat-key">ယောက် စောင့်ရန်ရှိသည်</div>
              </div>
            </div>
          </>
        ) : (
          <p style={{ color: "var(--slate-400)", fontSize: 14 }}>
            စောင့်ဆိုင်းစာရင်း မရရှိသေးပါ။
          </p>
        )}
      </div>
      <button type="button" className="btn-secondary" onClick={onClose}>
        ပိတ်မည်
      </button>
    </Sheet>
  );
}

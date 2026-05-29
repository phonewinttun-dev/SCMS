import { useState, type ReactNode } from "react";
import type {
  AppointmentDetails,
  LabReportItem,
  NotificationItem,
  Prescription,
  QueueStatusData,
  SheetId,
  UnpaidInvoice,
} from "../types";
import {
  formatApptDateParts,
  statusLabelMy,
  statusPillClass,
} from "../utils";
import { Icon } from "./Icons";
import { Sheet } from "./Sheet";
import { BookingSheet } from "./BookingSheet";
import { PaymentSheet } from "./PaymentSheet";
import { QueueStatus } from "./QueueStatus";
import { RecordsSheet } from "./RecordsSheet";

export interface DashboardProps {
  userName: string;
  patientId?: number;
  appointments: AppointmentDetails[];
  prescriptions: Prescription[];
  labPreview: LabReportItem[];
  invoices: UnpaidInvoice[];
  notifications: NotificationItem[];
  queuePreview?: QueueStatusData | null;
  onLogout: () => void;
  onToast: (message: string) => void;
  onRefresh: () => void;
}

function QuickBtn({
  label,
  iconBg,
  icon,
  onClick,
}: {
  label: string;
  iconBg: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button type="button" className="quick-btn" onClick={onClick}>
      <div className="quick-icon" style={{ background: iconBg }}>
        {icon}
      </div>
      <span className="quick-label">{label}</span>
    </button>
  );
}

function ApptCard({ appt }: { appt: AppointmentDetails }) {
  const parts = formatApptDateParts(appt.datetime);
  return (
    <div className="appt-card">
      <div className="appt-date-box">
        <span className="appt-month">{parts.month}</span>
        <span className="appt-day">{parts.day}</span>
      </div>
      <div style={{ flex: 1 }}>
        <div className="appt-doc">{appt.clinicDoctorName}</div>
        <div className="appt-sub">
          {appt.notes ?? appt.appointmentCode} · {parts.time}
        </div>
      </div>
      <span className={statusPillClass(appt.status)}>
        {statusLabelMy(appt.status)}
      </span>
    </div>
  );
}

export function Dashboard({
  userName,
  patientId,
  appointments,
  prescriptions,
  labPreview,
  invoices,
  notifications,
  queuePreview,
  onLogout,
  onToast,
  onRefresh,
}: DashboardProps) {
  const [sheet, setSheet] = useState<SheetId>(null);
  const [queueOpen, setQueueOpen] = useState(true);
  const [activeNav, setActiveNav] = useState("home");

  const primaryAppt = appointments[0];
  const close = () => setSheet(null);
  const open = (name: SheetId) => setSheet(name);

  return (
    <>
      <div className="portal-header fade-in">
        <div>
          <div className="header-greeting">မင်္ဂလာပါ</div>
          <div className="header-name">{userName}</div>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="icon-btn"
            onClick={() => open("notif")}
            aria-label="အကြောင်းကြားချက်များ"
          >
            <Icon name="bell" size={18} />
            {notifications.length > 0 && <span className="notif-dot" />}
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => {
              onLogout();
              onToast("ထွက်ပြီးပါပြီ");
            }}
            aria-label="ထွက်ရန်"
          >
            <Icon name="logout" size={18} />
          </button>
        </div>
      </div>

      <div className="portal-scroll">
        {queueOpen && queuePreview && primaryAppt && (
          <div className="queue-banner">
            <div>
              <div className="queue-live-badge">
                <div className="live-dot" />
                Live
              </div>
              <div style={{ display: "flex", gap: 4, alignItems: "baseline" }}>
                <div className="queue-num">{queuePreview.patientTokenNumber}</div>
                <div style={{ fontSize: 13, opacity: 0.7, fontWeight: 500 }}>
                  ယောက်မြောက်
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ opacity: 0.7, fontSize: 11, marginBottom: 4 }}>
                စောင့်ရန်ပျမ်းမျှကြာချိန်
              </div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>
                ~{queuePreview.estimatedWaitTimeMinutes} မိနစ် အလို
              </div>
            </div>
            <button
              type="button"
              className="queue-close-btn"
              onClick={() => setQueueOpen(false)}
              aria-label="ပိတ်မည်"
            >
              <Icon name="x" size={14} />
            </button>
          </div>
        )}

        <div className="section">
          <div className="section-head">
            <span className="section-label">Quick Actions</span>
          </div>
          <div className="quick-grid">
            <QuickBtn
              label="ရက်ချိန်းရယူရန်"
              iconBg="var(--blue-50)"
              icon={<Icon name="calendar" size={18} color="var(--blue-600)" />}
              onClick={() => open("book")}
            />
            <QuickBtn
              label="လူစောင့်စာရင်း"
              iconBg="var(--amber-50)"
              icon={<Icon name="clock" size={18} color="var(--amber-600)" />}
              onClick={() => open("queue")}
            />
            <QuickBtn
              label="မှတ်တမ်း"
              iconBg="#f0fdf4"
              icon={<Icon name="file" size={18} color="#16a34a" />}
              onClick={() => open("records")}
            />
            <QuickBtn
              label="ငွေပေးချေခြင်း"
              iconBg="var(--violet-50)"
              icon={<Icon name="card" size={18} color="var(--violet-600)" />}
              onClick={() => open("pay")}
            />
          </div>
        </div>

        <div className="section">
          <div className="section-head">
            <span className="section-label">နောက်လာမယ့်ရက်ချိန်းများ</span>
            <button type="button" className="see-all" onClick={() => open("appts")}>
              အားလုံးကြည့်ပါ
            </button>
          </div>
          {primaryAppt ? (
            <ApptCard appt={primaryAppt} />
          ) : (
            <p style={{ fontSize: 13, color: "var(--slate-400)" }}>
              ရက်ချိန်း မရှိသေးပါ။
            </p>
          )}
        </div>

        <div className="section">
          <div className="section-head">
            <span className="section-label">အရင်ကဆေးမှတ်တမ်းများ</span>
            <button type="button" className="see-all" onClick={() => open("records")}>
              အားလုံးကြည့်ပါ
            </button>
          </div>
          {labPreview.length === 0 && prescriptions.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--slate-400)" }}>
              မှတ်တမ်း မရှိသေးပါ။
            </p>
          ) : (
            <>
              {labPreview.slice(0, 2).map((r, i) => (
                <div key={r.id ?? i} className="record-item">
                  <div>
                    <div className="record-name">
                      {r.testName ?? r.name ?? "Lab Report"}
                    </div>
                    <div className="record-sub">
                      {r.createdAt
                        ? new Date(r.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </div>
                  </div>
                  <span
                    className={`pill ${r.status?.toLowerCase().includes("review") ? "pill-amber" : "pill-green"}`}
                  >
                    {r.result ?? r.status ?? "—"}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      <div className="bottom-nav">
        {[
          { id: "home", icon: "home" as const, label: "Home" },
          {
            id: "appts",
            icon: "calendar" as const,
            label: "Appts",
            onClick: () => open("appts"),
          },
          {
            id: "records",
            icon: "file" as const,
            label: "Records",
            onClick: () => open("records"),
          },
          {
            id: "pay",
            icon: "card" as const,
            label: "Pay",
            onClick: () => open("pay"),
          },
        ].map((n) => (
          <button
            key={n.id}
            type="button"
            className={`nav-btn ${activeNav === n.id ? "active" : ""}`}
            onClick={() => {
              setActiveNav(n.id);
              n.onClick?.();
            }}
          >
            <Icon name={n.icon} size={22} />
            <span>{n.label}</span>
          </button>
        ))}
      </div>

      {patientId && (
        <BookingSheet
          open={sheet === "book"}
          patientId={patientId}
          onClose={close}
          onSuccess={(msg) => {
            close();
            onToast(msg);
            onRefresh();
          }}
        />
      )}

      <QueueStatus
        open={sheet === "queue"}
        appointmentId={primaryAppt?.id}
        onClose={close}
      />

      <RecordsSheet
        open={sheet === "records"}
        patientId={patientId}
        prescriptions={prescriptions}
        onClose={close}
        onToast={onToast}
      />

      <PaymentSheet
        open={sheet === "pay"}
        invoices={invoices}
        onClose={close}
        onSuccess={(msg) => {
          close();
          onToast(msg);
          onRefresh();
        }}
      />

      <Sheet open={sheet === "notif"} onClose={close} title="အကြောင်းကြားချက်များ">
        {notifications.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--slate-400)" }}>
            အကြောင်းကြားချက် မရှိသေးပါ။
          </p>
        ) : (
          notifications.map((n) => (
            <div key={n.id} className="notif-item">
              <div className="notif-dot-green" />
              <div>
                <div className="notif-text">
                  <strong>{n.title}</strong>
                  {n.description ? ` — ${n.description}` : ""}
                </div>
                <div className="notif-time">
                  {new Date(n.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          ))
        )}
      </Sheet>

      <Sheet open={sheet === "appts"} onClose={close} title="ချိန်းဆိုထားမှုများ">
        {appointments.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--slate-400)" }}>
            ချိန်းဆိုမှု မရှိသေးပါ။
          </p>
        ) : (
          appointments.map((a) => (
            <div key={a.id} style={{ marginBottom: 10 }}>
              <ApptCard appt={a} />
            </div>
          ))
        )}
      </Sheet>
    </>
  );
}

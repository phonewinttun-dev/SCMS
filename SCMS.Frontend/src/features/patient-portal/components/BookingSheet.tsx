import { useState } from "react";
import { bookAppointment } from "../services/patientPortalApi";
import { Icon } from "./Icons";
import { Sheet } from "./Sheet";

export interface BookingSheetProps {
  open: boolean;
  patientId: number;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

const specs = [
  { id: "general", label: "အထွေထွေ", sub: "General Practice", icon: "🩺" },
  { id: "cardiology", label: "နှလုံး", sub: "Cardiology", icon: "❤️" },
  { id: "dermatology", label: "အရေပြား", sub: "Skin & Hair", icon: "🔬" },
  { id: "orthopedics", label: "အရိုး", sub: "Bones & Joints", icon: "🦴" },
];

const times = ["09:00", "10:30", "11:00", "14:00", "15:30", "16:00"];

function StepBar({ step }: { step: number }) {
  return (
    <div className="step-bar">
      {["အမျိုးအစား", "ရက်နှင့်အချိန်", "အတည်ပြုမည်"].map((label, i) => (
        <div key={label} className="step-item">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div
              className={`step-circle ${i + 1 < step ? "done" : i + 1 === step ? "active" : ""}`}
            >
              {i + 1 < step ? (
                <Icon name="check" size={12} color="#fff" strokeWidth={3} />
              ) : (
                i + 1
              )}
            </div>
            <span style={{ fontSize: 10, color: i + 1 === step ? "var(--blue-600)" : "var(--slate-400)" }}>
              {label}
            </span>
          </div>
          {i < 2 && <div className={`step-line ${i + 1 < step ? "done" : ""}`} />}
        </div>
      ))}
    </div>
  );
}

export function BookingSheet({
  open,
  patientId,
  onClose,
  onSuccess,
}: BookingSheetProps) {
  const [step, setStep] = useState(1);
  const [spec, setSpec] = useState("general");
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [time, setTime] = useState("10:30");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setStep(1);
    setSpec("general");
    setTime("10:30");
  };

  const close = () => {
    onClose();
    setTimeout(reset, 400);
  };

  const selectedSpec = specs.find((s) => s.id === spec);

  const confirm = async () => {
    setSubmitting(true);
    try {
      const datetime = new Date(`${date}T${time}:00`).toISOString();
      await bookAppointment({
        patientId,
        datetime,
        notes: `${selectedSpec?.label} - ${selectedSpec?.sub}`,
      });
      close();
      setTimeout(
        () => onSuccess("ချိန်းဆိုမှု အောင်မြင်ပါသည်! ✓"),
        350,
      );
    } catch (err) {
      onSuccess(
        (err as Error).message || "ချိန်းဆိုမှု မအောင်မြင်ပါ။",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onClose={close} title="ဆရာဝန် ချိန်းဆိုရန်">
      <StepBar step={step} />

      {step === 1 && (
        <div className="fade-up">
          <p className="section-label" style={{ marginBottom: 12 }}>
            ဌာန ရွေးချယ်ပါ
          </p>
          <div className="spec-grid">
            {specs.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`spec-btn ${spec === s.id ? "selected" : ""}`}
                onClick={() => setSpec(s.id)}
              >
                <span style={{ fontSize: 20 }}>{s.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: "var(--slate-400)" }}>{s.sub}</div>
                </div>
              </button>
            ))}
          </div>
          <button type="button" className="btn-primary" onClick={() => setStep(2)}>
            ဆက်လက်လုပ်ဆောင်မည်
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="fade-up">
          <p className="section-label" style={{ marginBottom: 12 }}>
            ရက်စွဲနှင့် အချိန်
          </p>
          <div className="field-label">ရက်စွဲ ရွေးပါ</div>
          <input
            type="date"
            className="date-input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <div className="field-label" style={{ marginTop: 18 }}>
            အချိန်များ
          </div>
          <div className="time-grid">
            {times.map((t) => (
              <button
                key={t}
                type="button"
                className={`time-btn ${time === t ? "selected" : ""}`}
                onClick={() => setTime(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="btn-row">
            <button type="button" className="btn-secondary" onClick={() => setStep(1)}>
              နောက်သို့
            </button>
            <button type="button" className="btn-primary" onClick={() => setStep(3)}>
              ဆက်လက်လုပ်ဆောင်မည်
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="fade-up">
          <p className="section-label" style={{ marginBottom: 12 }}>
            အချက်အလက် စစ်ဆေးပါ
          </p>
          <div className="confirm-card">
            <div className="confirm-row">
              <span className="confirm-key">ဌာန</span>
              <span className="confirm-val">{selectedSpec?.label}</span>
            </div>
            <div className="confirm-row">
              <span className="confirm-key">ရက်စွဲ</span>
              <span className="confirm-val">
                {new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
            <div className="confirm-row">
              <span className="confirm-key">အချိန်</span>
              <span className="confirm-val">{time}</span>
            </div>
          </div>
          <div className="btn-row">
            <button type="button" className="btn-secondary" onClick={() => setStep(2)}>
              နောက်သို့
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={confirm}
              disabled={submitting}
            >
              {submitting ? <div className="spinner" /> : "အတည်ပြုသည်"}
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

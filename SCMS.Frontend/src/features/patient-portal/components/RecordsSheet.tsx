import { useEffect, useState } from "react";
import {
  downloadPrescriptionPdf,
  fetchLabReports,
  fetchPrescriptions,
} from "../services/patientPortalApi";
import type { LabReportItem, Prescription } from "../types";
import { Sheet } from "./Sheet";

export interface RecordsSheetProps {
  open: boolean;
  patientId?: number;
  prescriptions: Prescription[];
  onClose: () => void;
  onToast: (message: string) => void;
}

export function RecordsSheet({
  open,
  patientId,
  prescriptions: initialRx,
  onClose,
  onToast,
}: RecordsSheetProps) {
  const [tab, setTab] = useState<"rx" | "lab">("rx");
  const [prescriptions, setPrescriptions] = useState(initialRx);
  const [labReports, setLabReports] = useState<LabReportItem[]>([]);

  useEffect(() => {
    setPrescriptions(initialRx);
  }, [initialRx]);

  useEffect(() => {
    if (!open || !patientId) return;
    fetchPrescriptions(patientId)
      .then(setPrescriptions)
      .catch(() => undefined);
    fetchLabReports(patientId)
      .then(setLabReports)
      .catch(() => setLabReports([]));
  }, [open, patientId]);

  const handlePdf = async (id: number) => {
    try {
      await downloadPrescriptionPdf(id);
      onToast("ဆေးညွှန်း PDF ဒေါင်းလုဒ် လုပ်နေပါသည်…");
    } catch {
      onToast("PDF ဒေါင်းလုဒ် မအောင်မြင်ပါ။");
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="ကျန်းမာရေး မှတ်တမ်း">
      <div className="tab-row">
        <button
          type="button"
          className={`tab-btn ${tab === "rx" ? "active" : ""}`}
          onClick={() => setTab("rx")}
        >
          ဆေးညွှန်း
        </button>
        <button
          type="button"
          className={`tab-btn ${tab === "lab" ? "active" : ""}`}
          onClick={() => setTab("lab")}
        >
          ဓာတ်ခွဲရလဒ်
        </button>
      </div>

      {tab === "rx" && (
        <div className="fade-up">
          {prescriptions.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--slate-400)", textAlign: "center" }}>
              ဆေးညွှန်း မှတ်တမ်း မရှိသေးပါ။
            </p>
          )}
          {prescriptions.map((rx) => (
            <div key={rx.id} className="record-item">
              <div>
                <div className="record-name">
                  {rx.items[0]?.medicineName ?? rx.appointmentCode}
                </div>
                <div className="record-sub">
                  {rx.diseaseName ?? "—"} ·{" "}
                  {new Date(rx.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              </div>
              <button
                type="button"
                className="pdf-btn"
                onClick={() => handlePdf(rx.id)}
              >
                PDF
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === "lab" && (
        <div className="fade-up">
          {labReports.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--slate-400)", textAlign: "center" }}>
              ဓာတ်ခွဲရလဒ် မရှိသေးပါ။
            </p>
          )}
          {labReports.map((r, i) => (
            <div key={r.id ?? i} className="record-item">
              <div>
                <div className="record-name">
                  {r.testName ?? r.name ?? "Lab Test"}
                </div>
                <div className="record-sub">
                  {r.createdAt
                    ? new Date(r.createdAt).toLocaleDateString()
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
        </div>
      )}
    </Sheet>
  );
}

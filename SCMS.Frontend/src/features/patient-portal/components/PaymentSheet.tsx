import { useState } from "react";
import { submitManualPayment } from "../services/patientPortalApi";
import type { UnpaidInvoice } from "../types";
import { totalDue } from "../utils";
import { Sheet } from "./Sheet";

export interface PaymentSheetProps {
  open: boolean;
  invoices: UnpaidInvoice[];
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function PaymentSheet({
  open,
  invoices,
  onClose,
  onSuccess,
}: PaymentSheetProps) {
  const primary = invoices[0];
  const balance = primary
    ? totalDue(primary.amount, primary.tax, primary.charges)
    : 0;

  const [method, setMethod] = useState("kbzpay");
  const [paying, setPaying] = useState(false);

  const pay = async () => {
    if (!primary) {
      onSuccess("ပေးဆောင်ရန် ကျန်ရှိငွေ မရှိပါ။");
      return;
    }

    setPaying(true);
    try {
      await submitManualPayment({
        appointmentId: primary.appointmentId,
        paymentMethod: method,
        amount: balance,
        screenshotUrl: "https://placeholder.scms/payment-proof.png",
      });
      onClose();
      setTimeout(
        () =>
          onSuccess(
            `ငွေပေးချေမှု တင်သွင်းပြီးပါသည် (${balance.toLocaleString()} MMK)`,
          ),
        300,
      );
    } catch (err) {
      onSuccess((err as Error).message || "ငွေပေးချေမှု မအောင်မြင်ပါ။");
    } finally {
      setPaying(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="ငွေပေးချေရန်">
      <div className="balance-card">
        <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.75, textTransform: "uppercase" }}>
          ပေးဆောင်ရန် ကျန်ရှိငွေ
        </div>
        <div className="balance-amount">
          {balance > 0 ? balance.toLocaleString() : "0"} MMK
        </div>
        {primary && (
          <div style={{ fontSize: 12, opacity: 0.85 }}>
            {primary.appointmentCode} · {primary.paymentStatus}
          </div>
        )}
      </div>

      <p className="section-label" style={{ marginBottom: 12 }}>
        ပေးချေမည့်နည်းလမ်း
      </p>
      {[
        { id: "card", icon: "💳", label: "Digital Gateway", sub: "Visa, Mastercard, PayNow" },
        { id: "kbzpay", icon: "📱", label: "KBZ Pay", sub: "မြန်မာပြည်တွင်း မိုဘိုင်းငွေ" },
        { id: "wavepay", icon: "🌊", label: "Wave Pay", sub: "Upload proof of payment" },
      ].map((m) => (
        <button
          key={m.id}
          type="button"
          className={`gateway-btn ${method === m.id ? "selected" : ""}`}
          onClick={() => setMethod(m.id)}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              background: "var(--slate-100)",
            }}
          >
            {m.icon}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{m.label}</div>
            <div style={{ fontSize: 12, color: "var(--slate-400)" }}>{m.sub}</div>
          </div>
          {method === m.id && <span className="pill pill-green">Selected</span>}
        </button>
      ))}

      <button
        type="button"
        className="btn-primary"
        style={{
          marginTop: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
        }}
        onClick={pay}
        disabled={paying || balance <= 0}
      >
        {paying ? (
          <>
            <div className="spinner" />
            Processing…
          </>
        ) : (
          `Pay ${balance.toLocaleString()} MMK`
        )}
      </button>
    </Sheet>
  );
}

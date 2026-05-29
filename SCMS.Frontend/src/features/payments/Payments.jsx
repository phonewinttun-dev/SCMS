import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import scmsApi from "../../services/scmsApi";

const PRIMARY = "#0052CC";
const PRIMARY_LIGHT = "#EBF2FF";
const SUCCESS = "#027A48";
const WARNING = "#B54708";
const DANGER = "#D92D20";
const BG = "#F6F8FB";
const CARD = "#FFFFFF";
const TEXT = "#1D2939";
const MUTED = "#667085";
const BORDER = "#E4E7EC";

const toArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.value)) return data.value;
  return [];
};

const getId = (p) => p.id || p.paymentId || p.payment_id;

const money = (value) => {
  const n = Number(value || 0);
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("en-MY", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function Payments() {
  const outlet = useOutletContext();
  const lang = outlet?.lang || localStorage.getItem("lang") || "en";

  const [payments, setPayments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState(null);

  const t = {
    title: lang === "mm" ? "ငွေပေးချေမှုမှတ်တမ်း" : "Payment History",
    subtitle:
      lang === "mm"
        ? "လူနာချိန်းဆိုမှုများအတွက် ငွေပေးချေမှုအခြေအနေများကို စစ်ဆေးနိုင်သည်"
        : "Review appointment payments, proof screenshots, tax, charges and status",
    search:
      lang === "mm"
        ? "လူနာအမည် / appointment code ဖြင့်ရှာပါ..."
        : "Search by patient or appointment code...",
    all: lang === "mm" ? "အားလုံး" : "All",
    pending: lang === "mm" ? "စောင့်ဆိုင်း" : "Pending",
    paid: lang === "mm" ? "ပေးချေပြီး" : "Paid",
    partial: lang === "mm" ? "တစ်စိတ်တစ်ပိုင်း" : "Partial",
    failed: lang === "mm" ? "မအောင်မြင်" : "Failed",
    refunded: lang === "mm" ? "ပြန်အမ်းပြီး" : "Refunded",
    appointment: lang === "mm" ? "ချိန်းဆိုမှု" : "Appointment",
    patient: lang === "mm" ? "လူနာ" : "Patient",
    amount: lang === "mm" ? "ငွေပမာဏ" : "Amount",
    tax: lang === "mm" ? "အခွန်" : "Tax",
    charges: lang === "mm" ? "ဝန်ဆောင်ခ" : "Charges",
    method: lang === "mm" ? "ငွေပေးချေမှုနည်းလမ်း" : "Method",
    status: lang === "mm" ? "အခြေအနေ" : "Status",
    paidAt: lang === "mm" ? "ပေးချေသည့်နေ့" : "Paid At",
    proof: lang === "mm" ? "ငွေလွှဲ Screenshot" : "Payment Proof",
    details: lang === "mm" ? "အသေးစိတ်" : "Details",
    approve: lang === "mm" ? "အတည်ပြုမည်" : "Approve",
    invoice: lang === "mm" ? "Invoice PDF" : "Invoice PDF",
    empty: lang === "mm" ? "Payment မတွေ့ပါ" : "No payments found",
    refresh: lang === "mm" ? "ပြန်တင်မည်" : "Refresh",
    close: lang === "mm" ? "ပိတ်မည်" : "Close",
  };

  const loadPayments = async () => {
    try {
      setLoading(true);

      const data =
        status === "all"
          ? await scmsApi.payments.list()
          : await scmsApi.payments.list(status);

      setPayments(toArray(data));
    } catch (error) {
      console.error("Payment load error:", error);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [status]);

  const filteredPayments = useMemo(() => {
    const keyword = search.toLowerCase();

    return payments.filter((p) => {
      const text = `${p.patientName || ""} ${p.appointmentCode || ""} ${
        p.paymentMethod || ""
      } ${p.paymentStatus || ""}`.toLowerCase();

      return text.includes(keyword);
    });
  }, [payments, search]);

  const stats = useMemo(() => {
    const totalAmount = payments.reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0,
    );
    const paid = payments.filter(
      (p) => String(p.paymentStatus || "").toLowerCase() === "paid",
    ).length;
    const pending = payments.filter(
      (p) => String(p.paymentStatus || "").toLowerCase() === "pending",
    ).length;

    return {
      total: payments.length,
      totalAmount,
      paid,
      pending,
    };
  }, [payments]);

  const approvePayment = async (payment) => {
    try {
      const id = getId(payment);
      setApprovingId(id);

      await scmsApi.payments.approve(id);

      await loadPayments();
      setSelected(null);
    } catch (error) {
      console.error("Approve payment error:", error);
      alert("Approve payment failed.");
    } finally {
      setApprovingId(null);
    }
  };

  const downloadInvoice = async (payment) => {
    try {
      const id = getId(payment);
      const response = await scmsApi.payments.invoicePdf(id);

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `invoice-${id}.pdf`;
      document.body.appendChild(link);
      link.click();

      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Invoice download error:", error);
      alert("Invoice download failed.");
    }
  };

  return (
    <div style={{ width: "100%" }}>
      <div style={pageHeader}>
        <div>
          <h1 style={titleStyle}>{t.title}</h1>
          <p style={subtitleStyle}>{t.subtitle}</p>
        </div>

        <button onClick={loadPayments} style={outlineBtn}>
          {t.refresh}
        </button>
      </div>

      <section style={statsGrid}>
        <StatCard label={t.all} value={stats.total} color={PRIMARY} />
        <StatCard label={t.paid} value={stats.paid} color={SUCCESS} />
        <StatCard label={t.pending} value={stats.pending} color={WARNING} />
        <StatCard
          label={t.amount}
          value={`RM ${money(stats.totalAmount)}`}
          color={PRIMARY}
        />
      </section>

      <section style={filterCard}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.search}
          style={inputStyle}
        />

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={{ ...inputStyle, maxWidth: 220 }}
        >
          <option value="all">{t.all}</option>
          <option value="pending">{t.pending}</option>
          <option value="paid">{t.paid}</option>
          <option value="partial">{t.partial}</option>
          <option value="failed">{t.failed}</option>
          <option value="refunded">{t.refunded}</option>
        </select>
      </section>

      {loading ? (
        <div style={emptyStyle}>Loading...</div>
      ) : filteredPayments.length === 0 ? (
        <div style={emptyStyle}>{t.empty}</div>
      ) : (
        <section style={paymentGrid}>
          {filteredPayments.map((payment) => (
            <PaymentCard
              key={getId(payment)}
              payment={payment}
              t={t}
              onView={() => setSelected(payment)}
              onApprove={() => approvePayment(payment)}
              onInvoice={() => downloadInvoice(payment)}
              approving={approvingId === getId(payment)}
            />
          ))}
        </section>
      )}

      {selected && (
        <Modal onClose={() => setSelected(null)} width={820}>
          <div style={modalHeader}>
            <div>
              <h2 style={modalTitle}>{t.details}</h2>
              <p style={subtitleStyle}>
                {selected.appointmentCode || "-"} —{" "}
                {selected.patientName || "-"}
              </p>
            </div>

            <button onClick={() => setSelected(null)} style={closeBtn}>
              ✕
            </button>
          </div>

          <div style={detailHero}>
            <div style={largeAvatar}>
              {(selected.patientName || "PT").slice(0, 2).toUpperCase()}
            </div>

            <div>
              <h3 style={{ color: TEXT, fontSize: 22, fontWeight: 900 }}>
                {selected.patientName || "-"}
              </h3>
              <p style={{ color: MUTED, marginTop: 5 }}>
                {t.appointment}: {selected.appointmentCode || "-"}
              </p>
            </div>
          </div>

          <div style={detailGrid}>
            <Info label={t.amount} value={`RM ${money(selected.amount)}`} />
            <Info label={t.tax} value={`RM ${money(selected.tax)}`} />
            <Info label={t.charges} value={`RM ${money(selected.charges)}`} />
            <Info label={t.method} value={selected.paymentMethod || "-"} />
            <Info label={t.status} value={selected.paymentStatus || "-"} />
            <Info label={t.paidAt} value={formatDate(selected.paidAt)} />
          </div>

          {selected.paymentScreenshot && (
            <div style={screenshotBox}>
              <strong>{t.proof}</strong>

              <img
                src={selected.paymentScreenshot}
                alt="Payment proof"
                style={proofImage}
              />
            </div>
          )}

          <div style={modalActions}>
            {String(selected.paymentStatus || "").toLowerCase() !== "paid" && (
              <button
                onClick={() => approvePayment(selected)}
                disabled={approvingId === getId(selected)}
                style={primaryBtn}
              >
                {approvingId === getId(selected) ? "Approving..." : t.approve}
              </button>
            )}

            <button
              onClick={() => downloadInvoice(selected)}
              style={outlineBtn}
            >
              {t.invoice}
            </button>

            <button onClick={() => setSelected(null)} style={outlineBtn}>
              {t.close}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function PaymentCard({ payment, t, onView, onApprove, onInvoice, approving }) {
  const status = String(payment.paymentStatus || "pending").toLowerCase();
  const s = getStatusStyle(status);

  return (
    <article
      style={paymentCard}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = "0 14px 28px rgba(16,24,40,0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 1px 2px rgba(16,24,40,0.04)";
      }}
    >
      <div style={cardTop}>
        <div style={avatarStyle}>
          {(payment.patientName || "PT").slice(0, 2).toUpperCase()}
        </div>

        <div style={{ minWidth: 0 }}>
          <h3 style={cardTitle}>{payment.patientName || "-"}</h3>
          <p style={cardSub}>{payment.appointmentCode || "-"}</p>
        </div>
      </div>

      <div
        style={{
          ...badgeStyle,
          color: s.color,
          background: s.bg,
          borderColor: s.border,
        }}
      >
        {payment.paymentStatus || "pending"}
      </div>

      <div style={infoGrid}>
        <Info label={t.amount} value={`RM ${money(payment.amount)}`} />
        <Info label={t.tax} value={`RM ${money(payment.tax)}`} />
        <Info label={t.method} value={payment.paymentMethod || "-"} />
        <Info label={t.paidAt} value={formatDate(payment.paidAt)} />
      </div>

      {payment.paymentScreenshot && (
        <div style={miniProof}>
          <span>{t.proof}</span>
          <img
            src={payment.paymentScreenshot}
            alt="Proof"
            style={miniProofImg}
          />
        </div>
      )}

      <div style={actionRow}>
        <button onClick={onView} style={outlineBtn}>
          {t.details}
        </button>

        {status !== "paid" && (
          <button onClick={onApprove} disabled={approving} style={primaryBtn}>
            {approving ? "..." : t.approve}
          </button>
        )}

        <button onClick={onInvoice} style={outlineBtn}>
          {t.invoice}
        </button>
      </div>
    </article>
  );
}

function getStatusStyle(status) {
  if (status === "paid") {
    return { color: SUCCESS, bg: "#ECFDF3", border: "#A9EFC5" };
  }

  if (status === "pending") {
    return { color: WARNING, bg: "#FFFAEB", border: "#FEDF89" };
  }

  if (status === "failed") {
    return { color: DANGER, bg: "#FFF1F0", border: "#FECDCA" };
  }

  if (status === "refunded") {
    return { color: MUTED, bg: "#F2F4F7", border: BORDER };
  }

  return { color: PRIMARY, bg: PRIMARY_LIGHT, border: "#B2CCFF" };
}

function StatCard({ label, value, color }) {
  return (
    <div style={statCard}>
      <p style={{ color: MUTED, fontSize: 12, fontWeight: 800 }}>{label}</p>
      <h2 style={{ color, fontSize: 30, fontWeight: 900, marginTop: 8 }}>
        {value}
      </h2>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div style={infoBox}>
      <span style={infoLabel}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Modal({ children, onClose, width = 700 }) {
  return (
    <div onClick={onClose} style={modalOverlay}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ ...modalBox, maxWidth: width }}
      >
        {children}
      </div>
    </div>
  );
}

const pageHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: 22,
  gap: 16,
};

const titleStyle = {
  color: TEXT,
  fontSize: 30,
  fontWeight: 800,
  letterSpacing: "-0.04em",
};

const subtitleStyle = {
  color: MUTED,
  marginTop: 6,
  fontSize: 14,
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 16,
  marginBottom: 18,
};

const statCard = {
  background: CARD,
  border: `1px solid ${BORDER}`,
  borderRadius: 18,
  padding: 18,
  boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
};

const filterCard = {
  background: CARD,
  border: `1px solid ${BORDER}`,
  borderRadius: 18,
  padding: 18,
  display: "flex",
  gap: 12,
  marginBottom: 18,
};

const inputStyle = {
  width: "100%",
  border: `1px solid ${BORDER}`,
  borderRadius: 12,
  padding: "12px 13px",
  outline: "none",
  fontSize: 14,
  background: CARD,
};

const paymentGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
  gap: 16,
};

const paymentCard = {
  background: CARD,
  border: `1px solid ${BORDER}`,
  borderRadius: 18,
  padding: 18,
  boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
  transition: "0.18s ease",
};

const cardTop = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginBottom: 14,
};

const avatarStyle = {
  width: 46,
  height: 46,
  borderRadius: "50%",
  background: PRIMARY,
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 900,
  flexShrink: 0,
};

const cardTitle = {
  color: TEXT,
  fontSize: 17,
  fontWeight: 800,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const cardSub = {
  color: MUTED,
  fontSize: 13,
  marginTop: 4,
};

const badgeStyle = {
  display: "inline-flex",
  border: "1px solid",
  borderRadius: 999,
  padding: "5px 10px",
  fontSize: 12,
  fontWeight: 800,
  marginBottom: 14,
};

const infoGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10,
};

const infoBox = {
  border: `1px solid ${BORDER}`,
  background: BG,
  borderRadius: 14,
  padding: 13,
  display: "grid",
  gap: 5,
};

const infoLabel = {
  color: MUTED,
  fontSize: 12,
  fontWeight: 800,
};

const actionRow = {
  display: "flex",
  gap: 10,
  marginTop: 16,
  flexWrap: "wrap",
};

const primaryBtn = {
  border: 0,
  background: PRIMARY,
  color: "white",
  borderRadius: 12,
  padding: "11px 15px",
  fontWeight: 800,
  cursor: "pointer",
};

const outlineBtn = {
  border: `1px solid ${BORDER}`,
  background: CARD,
  color: TEXT,
  borderRadius: 12,
  padding: "11px 15px",
  fontWeight: 800,
  cursor: "pointer",
};

const emptyStyle = {
  background: CARD,
  border: `1px solid ${BORDER}`,
  borderRadius: 18,
  padding: 34,
  color: MUTED,
  textAlign: "center",
};

const modalOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
  padding: 20,
};

const modalBox = {
  width: "100%",
  maxHeight: "90vh",
  overflowY: "auto",
  background: CARD,
  borderRadius: 22,
  padding: 24,
  boxShadow: "0 24px 60px rgba(16,24,40,0.25)",
};

const modalHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  marginBottom: 18,
};

const modalTitle = {
  color: TEXT,
  fontSize: 24,
  fontWeight: 900,
};

const closeBtn = {
  border: 0,
  background: "#F2F4F7",
  borderRadius: 10,
  padding: "8px 12px",
  cursor: "pointer",
  fontWeight: 900,
  height: 38,
};

const detailHero = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  background: PRIMARY_LIGHT,
  borderRadius: 18,
  padding: 16,
  marginBottom: 16,
};

const largeAvatar = {
  width: 58,
  height: 58,
  borderRadius: "50%",
  background: PRIMARY,
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 900,
  fontSize: 18,
};

const detailGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 12,
};

const screenshotBox = {
  marginTop: 16,
  background: "#F9FAFB",
  border: `1px solid ${BORDER}`,
  borderRadius: 16,
  padding: 14,
  display: "grid",
  gap: 12,
};

const proofImage = {
  width: "100%",
  maxHeight: 420,
  objectFit: "contain",
  borderRadius: 14,
  border: `1px solid ${BORDER}`,
  background: "#fff",
};

const miniProof = {
  marginTop: 14,
  display: "grid",
  gap: 8,
  color: MUTED,
  fontSize: 13,
  fontWeight: 800,
};

const miniProofImg = {
  width: "100%",
  height: 120,
  objectFit: "cover",
  borderRadius: 12,
  border: `1px solid ${BORDER}`,
};

const modalActions = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  marginTop: 20,
  flexWrap: "wrap",
};

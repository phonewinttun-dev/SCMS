import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import scmsApi from "../../services/scmsApi";
import { CreditCard, Download, Upload, ShieldAlert, ArrowUpRight } from "lucide-react";

const PRIMARY = "#4F46E5";
const SUCCESS = "#027A48";
const WARNING = "#B54708";
const BORDER = "#E5E7EB";
const CARD = "#FFFFFF";
const TEXT = "#1F2937";
const MUTED = "#6B7280";
const DANGER = "#D92D20";

export default function UserMyPayments() {
  const outlet = useOutletContext();
  const lang = outlet?.lang || localStorage.getItem("lang") || "en";

  const [patientId, setPatientId] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [invoiceIdToPay, setInvoiceIdToPay] = useState("");
  const [transactionRef, setTransactionRef] = useState("");
  const [downloadingId, setDownloadingId] = useState(null);

  const t = {
    title: lang === "mm" ? "ငွေပေးချေမှုမှတ်တမ်း" : "Billing & Payments",
    subtitle: lang === "mm" ? "ဆေးခန်းကုန်ကျစရိတ်ဘေလ်များနှင့် ငွေချေမှုအထောက်အထားတင်ရန်" : "Track pending bills, download invoices, and upload banking proofs",
    noBills: lang === "mm" ? "ငွေပေးချေရန်ဘေလ်များ မရှိသေးပါ။" : "No billing history found.",
    download: lang === "mm" ? "ဘေလ်ရယူရန်" : "Invoice PDF",
    uploadProof: lang === "mm" ? "ငွေချေမှုအထောက်အထားတင်ရန်" : "Submit Bank Proof",
    uploadBtn: lang === "mm" ? "အထောက်အထား တင်သွင်းမည်" : "Submit Proof of Payment",
    uploadSuccess: lang === "mm" ? "ငွေချေမှုအထောက်အထားကို စိစစ်ရန် တင်သွင်းပြီးပါပြီ။" : "Manual payment proof submitted successfully for administrative review.",
  };

  const loadPayments = async () => {
    try {
      setLoading(true);
      setError("");

      const dashboard = await scmsApi.dashboard.patient();
      const profile = dashboard?.patientProfiles?.[0];
      if (profile) {
        const pid = profile.patientId;
        setPatientId(pid);

        // Fetch all payments and filter for this patient
        const allPayments = await scmsApi.payments.list();
        const filtered = (allPayments || []).filter(p => p.patientId === pid);
        setPayments(filtered);
      }
    } catch (err) {
      console.error("Load payments error:", err);
      setError("Failed to load billing history. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const handleDownloadInvoice = async (id) => {
    try {
      setDownloadingId(id);
      const res = await scmsApi.payments.invoicePdf(id);
      
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `invoice-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Download invoice error:", err);
      alert("Failed to download invoice PDF. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleSubmitProof = async (e) => {
    e.preventDefault();
    if (!invoiceIdToPay || !transactionRef) {
      alert("Please enter the Invoice ID and banking transaction reference.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      
      // Submit bank proof to API
      const payload = {
        paymentId: Number(invoiceIdToPay),
        referenceNumber: transactionRef.trim(),
        proofNotes: `Submitted manual bank proof with reference: ${transactionRef.trim()}`,
      };

      await scmsApi.payments.manualProof(payload);
      alert(t.uploadSuccess);
      setInvoiceIdToPay("");
      setTransactionRef("");
      
      // Reload invoices
      await loadPayments();
    } catch (err) {
      console.error("Submit proof error:", err);
      setError("Failed to submit proof. Please confirm the Invoice ID exists.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: "40px", color: MUTED }}>Loading accounts receivable...</div>;
  }

  const unpaid = payments.filter(p => p.status?.toLowerCase() === "pending" || p.status?.toLowerCase() === "unpaid");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: TEXT }}>{t.title}</h2>
        <p style={{ fontSize: 14, color: MUTED, marginTop: 4 }}>{t.subtitle}</p>
      </div>

      {error && <div style={{ color: DANGER, background: "#FFF1F0", padding: "12px 16px", borderRadius: 12, border: `1px solid #FECDCA` }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1.1fr", gap: 20 }}>
        {/* Payments List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {payments.length === 0 ? (
            <article style={{ background: CARD, border: `1px solid ${BORDER}`, padding: 40, borderRadius: 18, textAlign: "center", color: MUTED }}>
              <CreditCard size={36} style={{ color: PRIMARY, margin: "0 auto 12px" }} />
              <p style={{ fontSize: 14 }}>{t.noBills}</p>
            </article>
          ) : (
            payments.map((pay) => (
              <article key={pay.id} style={{ background: CARD, border: `1px solid ${BORDER}`, padding: 20, borderRadius: 18, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  <div style={{ padding: 10, borderRadius: 10, background: pay.status?.toLowerCase() === "approved" ? "#ECFDF3" : "#FFF1F0", color: pay.status?.toLowerCase() === "approved" ? SUCCESS : WARNING }}>
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800 }}>Invoice #{pay.id}</div>
                    <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>Amount: <strong>RM {pay.amount}</strong> • Status: <span style={{ textTransform: "capitalize", color: pay.status?.toLowerCase() === "approved" ? SUCCESS : WARNING, fontWeight: 700 }}>{pay.status}</span></div>
                  </div>
                </div>

                <button
                  onClick={() => handleDownloadInvoice(pay.id)}
                  disabled={downloadingId === pay.id}
                  style={{
                    border: 0,
                    borderRadius: 10,
                    background: PRIMARY,
                    color: "white",
                    padding: "8px 14px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: downloadingId === pay.id ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4
                  }}
                >
                  <Download size={14} />
                  {downloadingId === pay.id ? "Downloading..." : t.download}
                </button>
              </article>
            ))
          )}
        </div>

        {/* Manual proof submit side form */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <article style={{ background: CARD, border: `1px solid ${BORDER}`, padding: 24, borderRadius: 18 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: TEXT, display: "flex", alignItems: "center", gap: 8 }}>
              <Upload size={18} style={{ color: PRIMARY }} />
              {t.uploadProof}
            </h3>
            <p style={{ fontSize: 13, color: MUTED, marginTop: 4, marginBottom: 20 }}>Input invoice ID and bank transaction reference to claim a manual proof payment.</p>

            <form onSubmit={handleSubmitProof} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: TEXT }}>Invoice ID to Pay</label>
                <select
                  value={invoiceIdToPay}
                  onChange={(e) => setInvoiceIdToPay(e.target.value)}
                  style={inputStyle}
                  required
                >
                  <option value="">-- Choose Invoice --</option>
                  {unpaid.map((p) => (
                    <option key={p.id} value={p.id}>
                      Invoice #{p.id} (RM {p.amount})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: TEXT }}>Transaction reference (e.g. Maybank Ref#)</label>
                <input
                  type="text"
                  placeholder="e.g. MBK-1028391823"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !invoiceIdToPay}
                style={{
                  background: PRIMARY,
                  color: "white",
                  border: 0,
                  borderRadius: 10,
                  padding: "10px 16px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: submitting || !invoiceIdToPay ? "not-allowed" : "pointer",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 6
                }}
              >
                <ArrowUpRight size={16} />
                {submitting ? "Uploading Proof..." : t.uploadBtn}
              </button>
            </form>
          </article>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 10,
  border: `1px solid ${BORDER}`,
  outline: "none",
  fontSize: 13,
  background: "#F9FAFB",
};

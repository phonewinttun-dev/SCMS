import { useState } from "react";
import { CreditCard, Download, Upload } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { downloadBlob, paymentsApi } from "../../services/scmsApi";
import { showAlert, showError } from "../../services/dialogs";

const money = (value) => `${Number(value || 0).toLocaleString()} MMK`;

export default function UserBilling() {
  const { activeProfile, filteredTelemetry, loadDashboard } = useOutletContext();
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [proofUrl, setProofUrl] = useState("");
  const [method, setMethod] = useState("kbzpay");
  const invoices = filteredTelemetry.outstanding || [];

  const downloadInvoice = async (invoice) => {
    try {
      const response = await paymentsApi.invoicePdf(invoice.id || invoice.paymentId);
      downloadBlob(response, `invoice-${invoice.id || invoice.paymentId}.pdf`);
    } catch (error) {
      await showError(error?.response?.data?.message || "Failed to download invoice.");
    }
  };

  const submitProof = async (event) => {
    event.preventDefault();
    if (!activeInvoice || !proofUrl.trim()) return;
    try {
      await paymentsApi.manualProof({
        appointmentId: Number(activeInvoice.appointmentId),
        paymentMethod: method,
        amount: Number(activeInvoice.amount),
        screenshotUrl: proofUrl.trim(),
      });
      setActiveInvoice(null);
      setProofUrl("");
      await showAlert("Payment proof submitted successfully.");
      await loadDashboard(activeProfile?.patientId);
    } catch (error) {
      await showError(error?.response?.data?.message || "Failed to submit payment proof.");
    }
  };

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-black text-slate-900">Billing & Payments</h2>
        <p className="text-sm font-semibold text-slate-500">Outstanding balances for {activeProfile?.name || "the active patient"}.</p>
      </div>

      {invoices.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-bold text-slate-500">
          No unpaid invoices for this profile.
        </div>
      ) : (
        <div className="grid gap-4">
          {invoices.map((invoice) => (
            <article key={invoice.id || invoice.paymentId} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-lg font-black text-slate-900">
                    <CreditCard size={18} />
                    {invoice.appointmentCode || `Appointment #${invoice.appointmentId}`}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-500">
                    Status: {invoice.paymentStatus || "pending"}
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900">{money(invoice.amount)}</div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="btn rounded-xl border-slate-200 bg-white" onClick={() => downloadInvoice(invoice)}>
                  <Download size={16} />
                  Invoice PDF
                </button>
                <button className="btn rounded-xl bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => setActiveInvoice(invoice)}>
                  <Upload size={16} />
                  Submit Proof
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {activeInvoice && (
        <form onSubmit={submitProof} className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-black text-slate-900">Submit payment proof</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-[180px_1fr_auto]">
            <select className="select select-bordered rounded-xl" value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="kbzpay">KBZPay</option>
              <option value="wavepay">WavePay</option>
              <option value="bank-transfer">Bank transfer</option>
            </select>
            <input className="input input-bordered rounded-xl" value={proofUrl} onChange={(e) => setProofUrl(e.target.value)} placeholder="Hosted screenshot URL" />
            <button className="btn rounded-xl bg-indigo-600 text-white hover:bg-indigo-700" type="submit">Submit</button>
          </div>
        </form>
      )}
    </section>
  );
}

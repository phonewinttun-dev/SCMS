import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  CardStackIcon,
  DownloadIcon,
  CheckCircledIcon,
  Cross2Icon,
  ClockIcon,
} from "@radix-ui/react-icons";
import PageHeader from "../../components/PageHeader";
import { Select } from "../../components/ui/select";
import { paymentsApi, downloadBlob } from "../../services/scmsApi";
import { showError, showSuccess } from "../../services/dialogs";
import { sanitizeText } from "../../utils/validation";
import useScrollLock from "../../hooks/useScrollLock";
import ModalPortal from "../../components/ModalPortal";

export default function UserBilling() {
  const {
    activeProfile,
    filteredTelemetry,
    loadDashboard,
    language,
    t,
  } = useOutletContext();

  const [payingInvoice, setPayingInvoice] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    paymentMethod: "kbzpay",
    screenshotUrl: "",
  });
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  useScrollLock(Boolean(payingInvoice));

  const outstanding = filteredTelemetry?.outstanding || [];

  const money = (value) => `${Number(value || 0).toLocaleString()} MMK`;

  const handleDownloadInvoice = async (paymentId) => {
    try {
      setDownloadingId(paymentId);
      const res = await paymentsApi.invoicePdf(paymentId);
      downloadBlob(res, `invoice-receipt-${paymentId}.pdf`);
      showSuccess("Official invoice receipt PDF downloaded.");
    } catch {
      showError("Failed to download invoice receipt PDF.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!payingInvoice) return;

    const cleanProof = sanitizeText(paymentForm.screenshotUrl);
    if (!cleanProof) {
      showError("Please provide a payment transfer screenshot URL or transaction reference number.", "Payment Proof Required");
      return;
    }

    try {
      setSubmittingPayment(true);
      await paymentsApi.manualProof({
        appointmentId: Number(payingInvoice.appointmentId),
        paymentMethod: paymentForm.paymentMethod || "kbzpay",
        amount: Number(payingInvoice.amount),
        screenshotUrl: cleanProof,
      });

      setPayingInvoice(null);
      setPaymentForm({ paymentMethod: "kbzpay", screenshotUrl: "" });
      showSuccess("Payment transfer proof submitted for clinic accounts review.");
      await loadDashboard(activeProfile?.patientId);
    } catch (error) {
      showError(error);
    } finally {
      setSubmittingPayment(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader
        title={t.invoicesAndPayments || "Payment"}
        subtitle={`Review outstanding balances, submit digital wallet transfers, and download official payment receipts for ${
          activeProfile?.name || "your profile"
        }.`}
      />

      {/* Payment Gateway Info Banner */}
      <section className="rounded-3xl border border-orange-200/80 dark:border-orange-900/60 bg-orange-50/60 dark:bg-orange-950/30 p-6 shadow-scms space-y-3">
        <h3 className="text-sm font-bold text-orange-950 dark:text-orange-200 flex items-center gap-2">
          <CardStackIcon className="w-4 h-4 text-orange-600 dark:text-orange-400" />
          <span>Supported Mobile Payment Gateways</span>
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
          <div className="p-3 bg-card rounded-2xl border border-border/80 space-y-1">
            <div className="font-bold text-foreground">KBZPay</div>
            <div className="text-muted-foreground font-mono text-[11px]">09-778-123-456</div>
            <span className="text-[10px] text-orange-600 dark:text-orange-400 font-semibold block">Dr. Clinic Care</span>
          </div>
          <div className="p-3 bg-card rounded-2xl border border-border/80 space-y-1">
            <div className="font-bold text-foreground">WavePay</div>
            <div className="text-muted-foreground font-mono text-[11px]">09-987-654-321</div>
            <span className="text-[10px] text-orange-600 dark:text-orange-400 font-semibold block">Dr. Clinic Care</span>
          </div>
          <div className="p-3 bg-card rounded-2xl border border-border/80 space-y-1">
            <div className="font-bold text-foreground">CBPay</div>
            <div className="text-muted-foreground font-mono text-[11px]">0012-3456-7890</div>
            <span className="text-[10px] text-orange-600 dark:text-orange-400 font-semibold block">Dr. Clinic Care</span>
          </div>
          <div className="p-3 bg-card rounded-2xl border border-border/80 space-y-1">
            <div className="font-bold text-foreground">AYA Pay</div>
            <div className="text-muted-foreground font-mono text-[11px]">09-445-566-778</div>
            <span className="text-[10px] text-orange-600 dark:text-orange-400 font-semibold block">Dr. Clinic Care</span>
          </div>
        </div>
      </section>

      {/* Outstanding Invoices List */}
      <section className="space-y-4">
        <h3 className="text-base font-bold text-foreground">
          Pending & Outstanding Invoices ({outstanding.length})
        </h3>

        {outstanding.length === 0 ? (
          <div className="rounded-3xl border border-border/80 bg-card p-12 text-center text-xs text-muted-foreground shadow-scms space-y-3">
            <CheckCircledIcon className="w-12 h-12 mx-auto text-emerald-500 opacity-70" />
            <h4 className="font-bold text-base text-foreground">All Invoices Settled</h4>
            <p className="max-w-md mx-auto">
              There are no unpaid balances or pending invoices on this patient profile. Thank you for using our clinic services.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {outstanding.map((invoice) => (
              <div
                key={invoice.id}
                className="rounded-3xl border border-border/80 bg-card/95 p-5 shadow-scms flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-border/70">
                    <span className="font-mono text-xs font-bold text-muted-foreground">
                      Visit #{invoice.appointmentCode || invoice.appointmentId}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      <ClockIcon className="w-3 h-3" />
                      <span>Unpaid</span>
                    </span>
                  </div>

                  <div className="mt-3 space-y-1">
                    <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Amount Due
                    </div>
                    <div className="text-2xl font-bold font-mono text-orange-600 dark:text-orange-400">
                      {money(invoice.amount)}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-border/70 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleDownloadInvoice(invoice.id)}
                    disabled={downloadingId === invoice.id}
                    className="scms-btn-icon"
                    title="Download Invoice PDF"
                    aria-label="Download Invoice PDF"
                  >
                    {downloadingId === invoice.id ? (
                      <span className="loading loading-spinner loading-xs" />
                    ) : (
                      <DownloadIcon className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => setPayingInvoice(invoice)}
                    className="scms-btn-primary text-xs font-bold px-5"
                  >
                    {language === "mm" ? "ငွေပေးချေမည်" : "Pay via Mobile"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Submit Payment Proof Modal */}
      <ModalPortal isOpen={Boolean(payingInvoice)} onClose={() => setPayingInvoice(null)}>
        {payingInvoice && (
          <form
            onSubmit={handlePayment}
            className="w-full max-w-md rounded-3xl border border-border/80 bg-card p-6 shadow-scms-modal space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-border/70">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <CardStackIcon className="w-4 h-4 text-orange-500" />
                <span>Submit Mobile Transfer Proof</span>
              </h3>
              <button
                type="button"
                onClick={() => setPayingInvoice(null)}
                className="p-1.5 rounded-xl text-muted-foreground hover:bg-secondary"
              >
                <Cross2Icon className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-2xl bg-orange-50 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-900/60 p-4 text-xs">
              <div className="font-bold text-orange-800 dark:text-orange-300 uppercase tracking-wider text-[10px]">
                Total Amount Due
              </div>
              <div className="text-2xl font-bold font-mono text-orange-700 dark:text-orange-300 mt-1">
                {money(payingInvoice.amount)}
              </div>
              <div className="text-muted-foreground font-semibold mt-1">
                For Appointment Visit #{payingInvoice.appointmentCode || payingInvoice.appointmentId}
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <span className="block font-bold text-foreground">
                Select Mobile Wallet Gateway
              </span>
              <Select
                value={paymentForm.paymentMethod}
                onChange={(val) => setPaymentForm((p) => ({ ...p, paymentMethod: val }))}
                options={[
                  { value: "kbzpay", label: "KBZPay (09-778-123-456)" },
                  { value: "wavepay", label: "WavePay (09-987-654-321)" },
                  { value: "cbpay", label: "CBPay (0012-3456-7890)" },
                  { value: "ayapay", label: "AYA Pay (09-445-566-778)" },
                ]}
              />
            </div>

            <label className="block text-xs">
              <span className="mb-1.5 block font-bold text-foreground">
                Transfer Receipt / Screenshot URL <span className="text-rose-500">*</span>
              </span>
              <input
                type="url"
                required
                placeholder="https://images.example.com/payment-receipt.jpg"
                className="scms-input w-full text-xs font-mono"
                value={paymentForm.screenshotUrl}
                onChange={(e) => setPaymentForm((p) => ({ ...p, screenshotUrl: e.target.value }))}
              />
              <span className="text-[11px] text-muted-foreground block mt-1">
                Paste the image link or hosted transaction receipt from your mobile banking app.
              </span>
            </label>

            <div className="pt-2 flex justify-end gap-2 border-t border-border/70">
              <button
                type="button"
                onClick={() => setPayingInvoice(null)}
                className="scms-btn-outline text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingPayment}
                className="scms-btn-primary text-xs font-bold"
              >
                {submittingPayment ? "Submitting..." : "Submit Payment Proof"}
              </button>
            </div>
          </form>
        )}
      </ModalPortal>
    </div>
  );
}

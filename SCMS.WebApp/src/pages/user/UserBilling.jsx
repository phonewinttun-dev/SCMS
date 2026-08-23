import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  CardStackIcon,
  DownloadIcon,
  CheckCircledIcon,
  Cross2Icon,
  ClockIcon,
  ImageIcon,
  UploadIcon,
  TrashIcon,
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
    transactionLast6: "",
    screenshotFile: null,
    screenshotPreview: "",
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

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      showError("Please upload a valid image file (JPEG, PNG, or WebP).", "Invalid File Format");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showError("Image file size exceeds the maximum limit of 5 MB.", "File Too Large");
      return;
    }

    if (paymentForm.screenshotPreview) {
      URL.revokeObjectURL(paymentForm.screenshotPreview);
    }

    const previewUrl = URL.createObjectURL(file);
    setPaymentForm((prev) => ({
      ...prev,
      screenshotFile: file,
      screenshotPreview: previewUrl,
    }));
  };

  const handleRemoveFile = () => {
    if (paymentForm.screenshotPreview) {
      URL.revokeObjectURL(paymentForm.screenshotPreview);
    }
    setPaymentForm((prev) => ({
      ...prev,
      screenshotFile: null,
      screenshotPreview: "",
    }));
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!payingInvoice) return;

    const cleanTxn = sanitizeText(paymentForm.transactionLast6 || "").trim();
    if (!cleanTxn || cleanTxn.length !== 6 || !/^\d{6}$/.test(cleanTxn)) {
      showError(
        "Please enter exactly the last 6 digits of the transaction ID from your mobile banking receipt (e.g. 661073).",
        "Transaction ID Required"
      );
      return;
    }

    if (!paymentForm.screenshotFile && !paymentForm.screenshotUrl?.trim()) {
      showError(
        "Please attach your payment transfer receipt screenshot or provide an image link.",
        "Payment Proof Required"
      );
      return;
    }

    try {
      setSubmittingPayment(true);

      const formData = new FormData();
      formData.append("appointmentId", Number(payingInvoice.appointmentId));
      formData.append("paymentMethod", paymentForm.paymentMethod || "kbzpay");
      formData.append("amount", Number(payingInvoice.amount));
      formData.append("transactionLast6", cleanTxn);

      if (paymentForm.screenshotFile) {
        formData.append("screenshot", paymentForm.screenshotFile);
      } else if (paymentForm.screenshotUrl?.trim()) {
        formData.append("screenshotUrl", sanitizeText(paymentForm.screenshotUrl).trim());
      }

      await paymentsApi.manualProof(formData);

      handleRemoveFile();
      setPayingInvoice(null);
      setPaymentForm({
        paymentMethod: "kbzpay",
        transactionLast6: "",
        screenshotFile: null,
        screenshotPreview: "",
        screenshotUrl: "",
      });
      showSuccess("Payment transfer proof and transaction reference submitted for clinic accounts review.");
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

            <div className="space-y-1.5 text-xs">
              <span className="block font-bold text-foreground">
                Transaction ID (Last 6 Digits) <span className="text-rose-500">*</span>
              </span>
              <div className="relative">
                <input
                  type="text"
                  required
                  maxLength={6}
                  pattern="\d{6}"
                  placeholder="e.g. 661073"
                  className="scms-input w-full text-sm font-mono tracking-widest font-bold uppercase"
                  value={paymentForm.transactionLast6}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setPaymentForm((p) => ({ ...p, transactionLast6: val }));
                  }}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[11px] text-muted-foreground font-semibold">
                  {paymentForm.transactionLast6.length}/6
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground block">
                Enter the last 6 numbers from the transfer slip လုပ်ဆောင်မှုအမှတ် (e.g. from 01004252031742<strong>661073</strong>).
              </span>
            </div>

            {/* Payment Proof Attachment */}
            <div className="space-y-2 text-xs">
              <span className="block font-bold text-foreground">
                Payment Screenshot / E-Receipt Proof <span className="text-rose-500">*</span>
              </span>

              {paymentForm.screenshotPreview ? (
                <div className="relative rounded-2xl border border-border/80 bg-secondary/30 p-2.5 space-y-2">
                  <div className="relative overflow-hidden rounded-xl border border-border/70 max-h-48 bg-slate-950/5 flex items-center justify-center">
                    <img
                      src={paymentForm.screenshotPreview}
                      alt="Receipt Preview"
                      className="w-full max-h-44 object-contain"
                    />
                  </div>
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] truncate max-w-[220px]">
                      <ImageIcon className="w-3.5 h-3.5 shrink-0 text-orange-500" />
                      <span className="truncate font-medium">{paymentForm.screenshotFile?.name || "Uploaded Slip"}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="scms-btn-icon-danger p-1 text-xs"
                      title="Remove image"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-border/80 hover:border-orange-500/60 rounded-2xl cursor-pointer bg-secondary/20 hover:bg-secondary/40 transition-colors">
                  <UploadIcon className="w-6 h-6 text-muted-foreground mb-1.5" />
                  <span className="font-semibold text-foreground text-xs">
                    Click or drag & drop payment screenshot
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">
                    PNG, JPG, or WebP (Max 5 MB)
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/jpg"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-border/70">
              <button
                type="button"
                onClick={() => {
                  handleRemoveFile();
                  setPayingInvoice(null);
                }}
                className="scms-btn-outline text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingPayment || paymentForm.transactionLast6.length !== 6 || (!paymentForm.screenshotFile && !paymentForm.screenshotUrl)}
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

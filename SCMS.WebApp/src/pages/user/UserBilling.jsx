import { useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import {
  CardStackIcon,
  CheckCircledIcon,
  Cross2Icon,
  ClockIcon,
  ImageIcon,
  UploadIcon,
  TrashIcon,
  PersonIcon,
  CheckIcon,
} from "@radix-ui/react-icons";
import PageHeader from "../../components/PageHeader";
import { Select } from "../../components/ui/select";
import { paymentsApi } from "../../services/scmsApi";
import { showError, showSuccess } from "../../services/dialogs";
import { sanitizeText } from "../../utils/validation";
import useScrollLock from "../../hooks/useScrollLock";
import ModalPortal from "../../components/ModalPortal";

export default function UserBilling() {
  const {
    data,
    activeProfile,
    loadDashboard,
    language,
    t,
  } = useOutletContext();

  // Modal and submission state
  const [payingInvoice, setPayingInvoice] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    paymentMethod: "kbzpay",
    transactionLast6: "",
    screenshotFile: null,
    screenshotPreview: "",
  });
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [previewModalImg, setPreviewModalImg] = useState(null);

  // Filters state
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "unpaid" | "pending" | "paid"
  const [patientFilter, setPatientFilter] = useState("all"); // "all" | string patientId

  useScrollLock(Boolean(payingInvoice || previewModalImg));

  const money = (value) => `${Number(value || 0).toLocaleString()} MMK`;

  // All payments across patient profiles
  const allInvoices = useMemo(() => {
    return data?.outstandingBalances || [];
  }, [data?.outstandingBalances]);

  const patientProfiles = useMemo(() => {
    return data?.patientProfiles || [];
  }, [data?.patientProfiles]);

  // Status helper
  const getInvoiceCategory = (inv) => {
    const status = String(inv.paymentStatus || "").toLowerCase().trim();
    if (status === "paid") return "paid";
    if (status === "pending" || status === "in_review" || (inv.paymentScreenshot && status !== "paid")) {
      return "pending";
    }
    return "unpaid";
  };

  // Counts for status tabs
  const counts = useMemo(() => {
    let unpaid = 0;
    let pending = 0;
    let paid = 0;
    allInvoices.forEach((inv) => {
      const cat = getInvoiceCategory(inv);
      if (cat === "paid") paid++;
      else if (cat === "pending") pending++;
      else unpaid++;
    });
    return { all: allInvoices.length, unpaid, pending, paid };
  }, [allInvoices]);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return allInvoices.filter((inv) => {
      // Status filter
      if (statusFilter !== "all") {
        const cat = getInvoiceCategory(inv);
        if (cat !== statusFilter) return false;
      }

      // Patient filter
      if (patientFilter !== "all") {
        if (String(inv.patientId) !== String(patientFilter)) return false;
      }

      return true;
    });
  }, [allInvoices, statusFilter, patientFilter]);

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

    if (!paymentForm.screenshotFile) {
      showError(
        "Please attach your payment transfer receipt photo or screenshot.",
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
      formData.append("screenshot", paymentForm.screenshotFile);

      await paymentsApi.manualProof(formData);

      handleRemoveFile();
      setPayingInvoice(null);
      setPaymentForm({
        paymentMethod: "kbzpay",
        transactionLast6: "",
        screenshotFile: null,
        screenshotPreview: "",
      });
      showSuccess("Payment transfer proof and transaction reference submitted for clinic review.");
      await loadDashboard(activeProfile?.patientId);
    } catch (error) {
      showError(error);
    } finally {
      setSubmittingPayment(false);
    }
  };

  const patientSelectOptions = [
    { value: "all", label: "All Family Members" },
    ...patientProfiles.map((p) => ({
      value: String(p.patientId),
      label: p.name,
      description: p.bloodType ? `Blood: ${p.bloodType}` : undefined,
    })),
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader
        title={t.invoicesAndPayments || "Invoices & Payments"}
        subtitle="View and manage all your clinic bills, track payment statuses, and submit mobile transfer proofs."
      />

      {/* Filter Tabs & Search Controls */}
      <section className="space-y-4 rounded-3xl border border-border/80 bg-card p-4 sm:p-5 shadow-scms">
        {/* Status Filter Badges / Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border/70 pb-3">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              statusFilter === "all"
                ? "bg-orange-600 text-white shadow-2xs"
                : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <span>All Payments</span>
            <span className="px-1.5 py-0.5 rounded-md bg-white/20 text-[10px] font-mono">
              {counts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("unpaid")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              statusFilter === "unpaid"
                ? "bg-amber-600 text-white shadow-2xs"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
            }`}
          >
            <span>Unpaid Bills</span>
            <span className="px-1.5 py-0.5 rounded-md bg-black/15 text-[10px] font-mono">
              {counts.unpaid}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("pending")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              statusFilter === "pending"
                ? "bg-sky-600 text-white shadow-2xs"
                : "bg-sky-500/10 text-sky-700 dark:text-sky-300 hover:bg-sky-500/20"
            }`}
          >
            <span>Pending Review</span>
            <span className="px-1.5 py-0.5 rounded-md bg-black/15 text-[10px] font-mono">
              {counts.pending}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("paid")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              statusFilter === "paid"
                ? "bg-emerald-600 text-white shadow-2xs"
                : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
            }`}
          >
            <span>Settled & Paid</span>
            <span className="px-1.5 py-0.5 rounded-md bg-black/15 text-[10px] font-mono">
              {counts.paid}
            </span>
          </button>
        </div>

        {/* Patient Profile Filter Row */}
        {patientProfiles.length > 0 && (
          <div className="max-w-xs pt-1">
            <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
              Filter By Patient
            </label>
            <Select
              value={patientFilter}
              onChange={(val) => setPatientFilter(val)}
              options={patientSelectOptions}
            />
          </div>
        )}
      </section>

      {/* Invoices List Display */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-foreground">
            Invoices & Payments ({filteredInvoices.length})
          </h3>
          {(statusFilter !== "all" || patientFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter("all");
                setPatientFilter("all");
              }}
              className="text-xs text-orange-600 dark:text-orange-400 font-semibold hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>

        {filteredInvoices.length === 0 ? (
          <div className="rounded-3xl border border-border/80 bg-card p-12 text-center text-xs text-muted-foreground shadow-scms space-y-3">
            <CheckCircledIcon className="w-12 h-12 mx-auto text-emerald-500 opacity-70" />
            <h4 className="font-bold text-base text-foreground">No Invoices Found</h4>
            <p className="max-w-md mx-auto">
              {allInvoices.length === 0
                ? "There are no invoice records registered for your patient profile."
                : "No payments match your selected filter criteria. Try resetting your status or patient filter."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredInvoices.map((invoice) => {
              const category = getInvoiceCategory(invoice);
              const isPaid = category === "paid";
              const isPending = category === "pending";

              return (
                <div
                  key={invoice.id}
                  className={`rounded-3xl border bg-card/95 p-5 shadow-scms flex flex-col justify-between gap-4 transition ${
                    isPaid
                      ? "border-emerald-500/30 bg-emerald-500/[0.02]"
                      : isPending
                      ? "border-sky-500/30 bg-sky-500/[0.02]"
                      : "border-border/80"
                  }`}
                >
                  <div className="space-y-3">
                    {/* Top Header: Appointment & Status Badge */}
                    <div className="flex items-start justify-between gap-2 pb-3 border-b border-border/70">
                      <div className="space-y-0.5">
                        <span className="font-mono text-xs font-bold text-muted-foreground block">
                          Visit {invoice.appointmentCode || invoice.appointmentId}
                        </span>
                        {invoice.patientName && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground/80">
                            <PersonIcon className="w-3 h-3 text-muted-foreground" />
                            <span>{invoice.patientName}</span>
                          </span>
                        )}
                      </div>

                      {/* Status Badges */}
                      {isPaid ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <CheckIcon className="w-3 h-3" />
                          <span>Paid</span>
                        </span>
                      ) : isPending ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                          <ClockIcon className="w-3 h-3" />
                          <span>In Review</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          <ClockIcon className="w-3 h-3" />
                          <span>Unpaid</span>
                        </span>
                      )}
                    </div>

                    {/* Amount & Details */}
                    <div className="space-y-1">
                      <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        {isPaid ? "Total Paid" : "Amount Due"}
                      </div>
                      <div
                        className={`text-2xl font-bold font-mono ${
                          isPaid
                            ? "text-emerald-600 dark:text-emerald-400"
                            : isPending
                            ? "text-sky-600 dark:text-sky-400"
                            : "text-orange-600 dark:text-orange-400"
                        }`}
                      >
                        {money(invoice.amount)}
                      </div>

                      {/* Transaction info if available */}
                      {invoice.transactionRef && (
                        <div className="text-[11px] text-muted-foreground font-mono mt-1">
                          Txn ID: <span className="font-bold text-foreground">...{invoice.transactionRef}</span>
                        </div>
                      )}

                      {/* Method label */}
                      {invoice.paymentMethod && (
                        <div className="text-[11px] text-muted-foreground uppercase font-semibold">
                          Via {invoice.paymentMethod}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Action / Status Footer */}
                  <div className="pt-3 border-t border-border/70 flex items-center justify-between gap-2">
                    {isPaid ? (
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircledIcon className="w-3.5 h-3.5" />
                        <span>Payment Settled & Confirmed</span>
                      </span>
                    ) : isPending ? (
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[11px] font-medium text-sky-600 dark:text-sky-400">
                          Proof uploaded. Awaiting clinic verification.
                        </span>
                        {invoice.paymentScreenshot && (
                          <button
                            type="button"
                            onClick={() => setPreviewModalImg(invoice.paymentScreenshot)}
                            className="scms-btn-outline text-[10px] py-1 px-2 font-bold"
                          >
                            View Slip
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => setPayingInvoice(invoice)}
                        className="scms-btn-primary text-xs font-bold px-5 w-full justify-center"
                      >
                        {language === "mm" ? "ငွေပေးချေမည်" : "Pay via Mobile"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
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
                onClick={() => {
                  handleRemoveFile();
                  setPayingInvoice(null);
                }}
                className="p-1.5 rounded-xl text-muted-foreground hover:bg-secondary"
                aria-label="Close modal"
              >
                <Cross2Icon className="w-4 h-4" />
              </button>
            </div>

            {/* Total Amount Due & Appointment Code (No # sign) */}
            <div className="rounded-2xl bg-orange-50 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-900/60 p-4 text-xs">
              <div className="font-bold text-orange-800 dark:text-orange-300 uppercase tracking-wider text-[10px]">
                Total Amount Due
              </div>
              <div className="text-2xl font-bold font-mono text-orange-700 dark:text-orange-300 mt-1">
                {money(payingInvoice.amount)}
              </div>
              <div className="text-muted-foreground font-semibold mt-1">
                For Appointment Visit {payingInvoice.appointmentCode || payingInvoice.appointmentId}
              </div>
            </div>

            {/* Select Gateway */}
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

            {/* Transaction Number (Last 6 Digits) */}
            <div className="space-y-1.5 text-xs">
              <span className="block font-bold text-foreground">
                Last 6 Digits of Transaction Number <span className="text-rose-500">*</span>
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
                Enter the last 6 digits of the transaction / reference number from your mobile banking slip (e.g. 661073).
              </span>
            </div>

            {/* Photo Upload Attachment (Button & Preview Only) */}
            <div className="space-y-2 text-xs">
              <span className="block font-bold text-foreground">
                Upload Transfer Receipt Screenshot <span className="text-rose-500">*</span>
              </span>

              {paymentForm.screenshotPreview ? (
                <div className="relative rounded-2xl border border-border/80 bg-secondary/30 p-3 space-y-2.5">
                  <div className="relative overflow-hidden rounded-xl border border-border/70 max-h-48 bg-slate-950/5 flex items-center justify-center">
                    <img
                      src={paymentForm.screenshotPreview}
                      alt="Receipt Preview"
                      className="w-full max-h-44 object-contain"
                    />
                  </div>
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] truncate max-w-[200px]">
                      <ImageIcon className="w-3.5 h-3.5 shrink-0 text-orange-500" />
                      <span className="truncate font-medium">{paymentForm.screenshotFile?.name || "Uploaded Slip"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <label className="scms-btn-outline text-[11px] py-1 px-2.5 cursor-pointer font-semibold">
                        Change
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/jpg"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
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
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-border/80 hover:border-orange-500/70 rounded-2xl cursor-pointer bg-secondary/20 hover:bg-secondary/40 transition-colors group">
                  <div className="h-10 w-10 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 grid place-items-center mb-2 group-hover:scale-105 transition-transform">
                    <UploadIcon className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-foreground text-xs">
                    Choose Receipt Photo or Drag & Drop
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

            {/* Modal Actions */}
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
                disabled={submittingPayment || paymentForm.transactionLast6.length !== 6 || !paymentForm.screenshotFile}
                className="scms-btn-primary text-xs font-bold"
              >
                {submittingPayment ? "Submitting..." : "Submit Payment Proof"}
              </button>
            </div>
          </form>
        )}
      </ModalPortal>

      {/* Full Size Image Preview Modal */}
      <ModalPortal isOpen={Boolean(previewModalImg)} onClose={() => setPreviewModalImg(null)}>
        {previewModalImg && (
          <div className="w-full max-w-lg rounded-3xl border border-border/80 bg-card p-4 shadow-scms-modal space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border/70">
              <span className="font-bold text-xs text-foreground">Payment Receipt Preview</span>
              <button
                type="button"
                onClick={() => setPreviewModalImg(null)}
                className="p-1 rounded-xl text-muted-foreground hover:bg-secondary"
              >
                <Cross2Icon className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto rounded-2xl bg-slate-950/5 flex items-center justify-center p-2">
              <img
                src={previewModalImg}
                alt="Payment Slip Full Preview"
                className="max-h-[65vh] object-contain rounded-xl"
              />
            </div>
          </div>
        )}
      </ModalPortal>
    </div>
  );
}

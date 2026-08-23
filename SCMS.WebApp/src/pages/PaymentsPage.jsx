import { useState, useEffect } from "react";
import {
  CardStackIcon,
  GridIcon,
  ListBulletIcon,
  DownloadIcon,
  CheckIcon,
  Cross2Icon,
  MagnifyingGlassIcon,
  EyeOpenIcon,
  ImageIcon,
} from "@radix-ui/react-icons";
import PageHeader from "../components/PageHeader";
import PaginationControls from "../components/PaginationControls";
import DateInput from "../components/DateInput";
import SegmentedControl from "../components/SegmentedControl";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { paymentsApi, downloadBlob } from "../services/scmsApi";
import { showAlert, showError, showConfirm, showSuccess } from "../services/dialogs";
import { useLanguage } from "../context/LanguageContext";
import useScrollLock from "../hooks/useScrollLock";
import ModalPortal from "../components/ModalPortal";
import demoReceiptImg from "../assets/demo-receipt.jpg";

const toArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.result)) return data.result;
  return [];
};

export default function PaymentsPage() {
  const { t } = useLanguage();
  const pageSize = 10;

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [approvingId, setApprovingId] = useState(null);
  const [viewMode, setViewMode] = useState("table");

  // Filters
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Detail Modal & Zoom Lightbox State
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [zoomImage, setZoomImage] = useState(null);

  useScrollLock(detailOpen || Boolean(zoomImage));

  const loadPayments = async (pageNum = page, currentQuery = query) => {
    try {
      setLoading(true);
      const trimmed = (currentQuery || "").trim();
      const res = trimmed
        ? await paymentsApi.search({
            query: trimmed,
            status: statusFilter === "all" ? undefined : statusFilter,
            dateFilter: dateFilter || undefined,
            pageNumber: pageNum,
            pageSize,
          })
        : await paymentsApi.list({
            pageNumber: pageNum,
            pageSize,
            status: statusFilter === "all" ? undefined : statusFilter,
            date: dateFilter || undefined,
          });

      if (res) {
        setPayments(toArray(res));
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages || 1);
          setTotalCount(res.pagination.totalCount || 0);
        }
      }
    } catch (err) {
      console.error("Payments load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments(page, query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, dateFilter]);

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    setPage(1);
    loadPayments(1, query);
  };

  const handleApprove = async (e, paymentId) => {
    e.stopPropagation();
    const confirmed = await showConfirm(
      "Confirm and approve this mobile payment transaction? This will mark the invoice as settled.",
      "Approve Payment Transfer"
    );
    if (!confirmed) return;

    try {
      setApprovingId(paymentId);
      await paymentsApi.approve(paymentId);
      showSuccess("Payment transaction approved and settled.");
      loadPayments(page, query);
      if (selectedPayment) setDetailOpen(false);
    } catch (err) {
      showError(err?.response?.data?.message || "Failed to approve payment.");
    } finally {
      setApprovingId(null);
    }
  };

  const handleDownloadInvoice = async (e, paymentId) => {
    e.stopPropagation();
    try {
      const blob = await paymentsApi.invoicePdf(paymentId);
      downloadBlob(blob, `invoice-${paymentId}.pdf`);
      showAlert("Invoice PDF generated and downloaded.");
    } catch {
      showError("Failed to export invoice PDF.");
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <PageHeader
        title={t.payments}
        subtitle="Manage billing statements, verify mobile payment screenshots, approve transactions, and generate receipts."
      />

      {/* Filter and View Bar */}
      <div className="relative z-10 flex flex-col sm:flex-row justify-between items-center gap-4 rounded-3xl border border-border/80 bg-card/90 backdrop-blur-md p-4 shadow-scms">
        <form onSubmit={handleSearch} className="flex-1 w-full max-w-sm flex items-center gap-2">
          <Input
            type="text"
            startIcon={<MagnifyingGlassIcon className="w-4 h-4 shrink-0" />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onClear={() => {
              setQuery("");
              loadPayments(1, "");
            }}
            placeholder="Search by code or patient..."
            className="flex-1"
          />
          <button type="submit" className="scms-btn-search">
            <span>Search</span>
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="min-w-[170px]">
            <Select
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
              placeholder="All Statuses"
              options={[
                { value: "all", label: "All Statuses" },
                { value: "Pending", label: "Pending Verification" },
                { value: "Paid", label: "Paid / Settled" },
                { value: "Failed", label: "Failed / Rejected" },
              ]}
            />
          </div>

          <DateInput
            className="min-w-[150px] text-xs font-mono"
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <SegmentedControl
          value={viewMode}
          onChange={setViewMode}
          options={[
            { label: "Table", value: "table", icon: ListBulletIcon },
            { label: "Cards", value: "card", icon: GridIcon },
          ]}
        />
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="grid place-items-center h-64 rounded-3xl border border-border/80 bg-card">
          <span className="loading loading-spinner loading-md text-orange-600 dark:text-orange-400" />
        </div>
      ) : payments.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-3xl border border-dashed border-border/80 bg-card">
          <CardStackIcon className="w-12 h-12 text-muted-foreground/40 mb-2 animate-pulse" />
          <h3 className="text-base font-bold text-foreground">No Payment Records</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            Transactions and patient payment screenshot submissions will appear here.
          </p>
        </div>
      ) : viewMode === "table" ? (
        <div className="overflow-hidden rounded-3xl border border-border/80 bg-card/95 backdrop-blur-md shadow-scms">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="border-b border-border/80 bg-secondary/50 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3.5 w-12 text-center">No.</th>
                  <th className="px-4 py-3.5">Invoice / Payment ID</th>
                  <th className="px-4 py-3.5">Patient Details</th>
                  <th className="px-4 py-3.5">Payment Method</th>
                  <th className="px-4 py-3.5">Amount (MMK)</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {payments.map((p, index) => {
                  const isPending =
                    String(p.status || "").toLowerCase() === "pending" ||
                    String(p.paymentStatus || "").toLowerCase() === "pending";
                  const pId = p.id || p.paymentId;

                  return (
                    <tr
                      key={pId || index}
                      onClick={() => {
                        setSelectedPayment(p);
                        setDetailOpen(true);
                      }}
                      className="hover:bg-secondary/60 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3.5 text-center font-mono text-xs text-muted-foreground font-semibold">
                        {(page - 1) * pageSize + index + 1}
                      </td>
                      <td className="px-4 py-3.5 font-mono font-bold text-orange-600 dark:text-orange-400">
                        INV-{String(pId).padStart(4, "0")}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-foreground">
                        {p.patientName || p.patient?.name || `Appointment #${p.appointmentId}`}
                      </td>
                      <td className="px-4 py-3.5 text-xs font-semibold text-muted-foreground uppercase">
                        {p.paymentMethod || "Cash / KBZPay"}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs font-bold text-foreground">
                        {Number(p.amount || 0).toLocaleString()} MMK
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            isPending
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                          }`}
                        >
                          {p.paymentStatus || p.status || "Settled"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedPayment(p);
                              setDetailOpen(true);
                            }}
                            className="scms-btn-icon"
                            title="View Payment Details"
                            aria-label="View Payment Details"
                          >
                            <EyeOpenIcon className="w-4 h-4" />
                          </button>
                          {isPending && (
                            <button
                              onClick={(e) => handleApprove(e, pId)}
                              disabled={approvingId === pId}
                              className="scms-btn-sm bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 border-none"
                            >
                              {approvingId === pId ? (
                                <span className="loading loading-spinner loading-xs" />
                              ) : (
                                <CheckIcon className="w-3.5 h-3.5" />
                              )}
                              <span>Approve</span>
                            </button>
                          )}
                          <button
                            onClick={(e) => handleDownloadInvoice(e, pId)}
                            className="scms-btn-icon"
                            title="Download Invoice PDF"
                            aria-label="Download Invoice PDF"
                          >
                            <DownloadIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Card Grid View */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {payments.map((p, index) => {
            const isPending =
              String(p.status || "").toLowerCase() === "pending" ||
              String(p.paymentStatus || "").toLowerCase() === "pending";
            const pId = p.id || p.paymentId;

            return (
              <div
                key={pId || index}
                onClick={() => {
                  setSelectedPayment(p);
                  setDetailOpen(true);
                }}
                className="rounded-3xl border border-border/80 bg-card/95 p-5 shadow-scms hover:shadow-scms-raised cursor-pointer transition-all space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-orange-600 dark:text-orange-400">
                    INV-{String(pId).padStart(4, "0")}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      isPending
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                        : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                    }`}
                  >
                    {p.paymentStatus || p.status || "Settled"}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-foreground">
                    {p.patientName || p.patient?.name || `Appt #${p.appointmentId}`}
                  </h3>
                  <p className="text-xs text-muted-foreground font-semibold">{p.paymentMethod || "Mobile Transfer"}</p>
                </div>

                <div className="font-mono text-base font-bold text-foreground">
                  {Number(p.amount || 0).toLocaleString()} MMK
                </div>

                <div className="pt-2 border-t border-border/70 flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => {
                      setSelectedPayment(p);
                      setDetailOpen(true);
                    }}
                    className="scms-btn-icon"
                    title="View Payment Details"
                    aria-label="View Payment Details"
                  >
                    <EyeOpenIcon className="w-4 h-4" />
                  </button>
                  {isPending && (
                    <button
                      onClick={(e) => handleApprove(e, pId)}
                      disabled={approvingId === pId}
                      className="scms-btn-sm bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 border-none"
                    >
                      <CheckIcon className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                  )}
                  <button
                    onClick={(e) => handleDownloadInvoice(e, pId)}
                    className="scms-btn-icon"
                    title="Download Invoice"
                    aria-label="Download Invoice"
                  >
                    <DownloadIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <PaginationControls
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        label="transactions"
        onPageChange={setPage}
      />

      {/* Payment Detail & Screenshot Verification Modal */}
      <ModalPortal
        isOpen={detailOpen && Boolean(selectedPayment)}
        onClose={() => setDetailOpen(false)}
      >
        {selectedPayment && (() => {
          const isPending =
            String(selectedPayment.status || "").toLowerCase() === "pending" ||
            String(selectedPayment.paymentStatus || "").toLowerCase() === "pending";
          const pId = selectedPayment.id || selectedPayment.paymentId;
          const rawScreenshot = selectedPayment.paymentScreenshot || selectedPayment.screenshotUrl;
          const screenshot = (rawScreenshot && !rawScreenshot.includes("demo-receipt")) ? rawScreenshot : demoReceiptImg;
          const txnRef = selectedPayment.transactionRef || "661073";
          const totalAmt = Number(selectedPayment.amount || 0);
          const taxAmt = Number(selectedPayment.tax || totalAmt * 0.05);
          const baseAmt = Math.max(0, totalAmt - taxAmt);
          const chargesAmt = Number(selectedPayment.charges || 0);

          return (
            <div className="w-full max-w-lg rounded-3xl border border-border/80 bg-card text-card-foreground p-6 shadow-scms-modal space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-border/70">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-foreground">
                      Invoice INV-{String(pId).padStart(4, "0")}
                    </h3>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        isPending
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                      }`}
                    >
                      {selectedPayment.paymentStatus || selectedPayment.status || "Settled"}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground block mt-0.5">
                    Patient: <strong className="text-foreground">{selectedPayment.patientName || selectedPayment.patient?.name || "Unknown"}</strong>
                    {selectedPayment.appointmentCode && ` • Appt Code: ${selectedPayment.appointmentCode}`}
                  </span>
                </div>
                <button
                  onClick={() => setDetailOpen(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:bg-secondary"
                >
                  <Cross2Icon className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                {/* Transaction Reference Number */}
                <div className="flex items-center justify-between bg-orange-50/80 dark:bg-orange-950/40 border border-orange-200/80 dark:border-orange-900/60 p-3 rounded-2xl">
                  <div>
                    <span className="text-[11px] text-orange-800 dark:text-orange-300 font-semibold block">
                      Transaction ID (Last 6 Digits)
                    </span>
                    <span className="font-mono text-base font-bold text-orange-700 dark:text-orange-300 tracking-wider">
                      #{txnRef}
                    </span>
                  </div>
                  <span className="text-[10px] text-orange-600 dark:text-orange-400 font-semibold px-2 py-1 bg-orange-100 dark:bg-orange-900/40 rounded-lg">
                    Transfer Ref
                  </span>
                </div>

                {/* Amount & Breakdown Grid */}
                <div className="bg-secondary/30 border border-border/80 p-4 rounded-2xl space-y-2">
                  <div className="grid grid-cols-2 gap-3 pb-3 border-b border-border/60">
                    <div>
                      <span className="text-muted-foreground font-semibold block text-[11px]">Total Bill Amount</span>
                      <strong className="font-mono text-base text-foreground block">
                        {totalAmt.toLocaleString()} MMK
                      </strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground font-semibold block text-[11px]">Payment Method</span>
                      <strong className="uppercase text-sm block font-bold text-foreground">
                        {selectedPayment.paymentMethod || "KBZPay / Wave"}
                      </strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                    <div>
                      <span className="text-muted-foreground block">Base Amount</span>
                      <span className="font-mono font-semibold text-foreground">{baseAmt.toLocaleString()} MMK</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Tax (5%)</span>
                      <span className="font-mono font-semibold text-foreground">{taxAmt.toLocaleString()} MMK</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Charges</span>
                      <span className="font-mono font-semibold text-foreground">{chargesAmt.toLocaleString()} MMK</span>
                    </div>
                  </div>

                  {selectedPayment.paidAt && (
                    <div className="pt-2 text-[11px] text-muted-foreground border-t border-border/60 flex items-center justify-between">
                      <span>Transaction / Settlement Date:</span>
                      <span className="font-mono font-medium text-foreground">
                        {new Date(selectedPayment.paidAt).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Transfer Screenshot Proof - Scrollable preview inside the card */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground block">
                      Patient Transfer E-Receipt Slip:
                    </span>
                    <span className="text-[10px] text-muted-foreground">Scroll to view slip details</span>
                  </div>
                  <div
                    onClick={() => setZoomImage(screenshot || demoReceiptImg)}
                    className="relative overflow-y-auto max-h-72 rounded-2xl border border-border/80 bg-slate-950/5 p-2 flex justify-center cursor-pointer hover:border-orange-500/60 transition-colors group"
                    title="Scroll to inspect, or click to enlarge"
                  >
                    <img
                      src={screenshot || demoReceiptImg}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = demoReceiptImg;
                      }}
                      alt="Payment transfer proof"
                      className="w-full max-w-sm h-auto object-contain rounded-xl shadow-sm"
                    />
                    <div className="absolute top-3 right-3 bg-background/90 text-foreground text-[10px] px-2 py-1 rounded-lg font-semibold shadow opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      <EyeOpenIcon className="w-3 h-3" />
                      <span>Full View</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-border/70 flex justify-end gap-2">
                {isPending && (
                  <button
                    onClick={(e) => handleApprove(e, pId)}
                    disabled={approvingId === pId}
                    className="scms-btn-primary bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 btn-target"
                  >
                    <CheckIcon className="w-4 h-4" />
                    <span>Confirm & Settle Payment</span>
                  </button>
                )}
                <button
                  onClick={(e) => handleDownloadInvoice(e, pId)}
                  className="scms-btn-outline text-xs flex items-center gap-1.5 btn-target"
                >
                  <DownloadIcon className="w-4 h-4" />
                  <span>Invoice PDF</span>
                </button>
              </div>
            </div>
          );
        })()}
      </ModalPortal>

      {/* Full-Screen Screenshot Lightbox Modal */}
      <ModalPortal isOpen={Boolean(zoomImage)} onClose={() => setZoomImage(null)}>
        {zoomImage && (
          <div className="relative max-w-2xl w-full max-h-[90vh] bg-card rounded-3xl p-4 border border-border shadow-2xl space-y-3 flex flex-col items-center">
            <div className="w-full flex items-center justify-between pb-2 border-b border-border/70">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-orange-500" />
                <span>Payment Transfer E-Receipt Slip</span>
              </span>
              <button
                onClick={() => setZoomImage(null)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-secondary"
              >
                <Cross2Icon className="w-4 h-4" />
              </button>
            </div>
            <div className="w-full overflow-auto max-h-[75vh] rounded-2xl bg-black/5 flex items-center justify-center p-2">
              <img
                src={zoomImage || demoReceiptImg}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = demoReceiptImg;
                }}
                alt="Payment Receipt Full View"
                className="max-h-[70vh] w-auto object-contain rounded-lg shadow-sm"
              />
            </div>
          </div>
        )}
      </ModalPortal>
    </div>
  );
}

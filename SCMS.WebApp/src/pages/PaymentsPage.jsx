import { useState, useEffect } from "react";
import {
  CreditCard,
  RefreshCcw,
  LayoutGrid,
  List,
  Download,
  CheckCircle,
  FileText,
  Clock,
  Check,
  Calendar,
  X,
  AlertCircle
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import ModalPortal from "../components/ModalPortal";
import PaginationControls from "../components/PaginationControls";
import DateInput from "../components/DateInput";
import SearchForm from "../components/SearchForm";
import { paymentsApi, downloadBlob } from "../services/scmsApi";
import { showAlert, showError, showConfirm } from "../services/dialogs";
import { useLanguage } from "../context/LanguageContext";

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
  const [viewMode, setViewMode] = useState("table"); // "table" or "card"
  
  // Search & Filter State
  const [query, setQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [dateFilter, setDateFilter] = useState(""); // YYYY-MM-DD

  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Detailed Modal State
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  const loadPayments = async (pageNum = page) => {
    try {
      setLoading(true);
      const res = await paymentsApi.list({
        status: selectedStatus || undefined,
        query: query.trim() || undefined,
        dateFilter: dateFilter || undefined,
        pageNumber: pageNum,
        pageSize: 10
      });

      if (res) {
        setPayments(res.data || []);
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages || 1);
          setTotalCount(res.pagination.totalCount || (res.data || []).length);
        }
      }
    } catch (error) {
      showError("Failed to fetch payments journal.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, selectedStatus, dateFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadPayments(1);
  };

  const handleApprove = async (e, paymentId) => {
    e.stopPropagation();
    const ok = await showConfirm("Are you sure you want to approve this payment proof?");
    if (!ok) return;

    try {
      setApprovingId(paymentId);
      await paymentsApi.approve(paymentId);
      await showAlert("Payment approved successfully!");
      if (selectedPayment && (selectedPayment.id === paymentId || selectedPayment.paymentId === paymentId)) {
        setDetailOpen(false);
      }
      loadPayments(page);
    } catch (err) {
      showError(err?.response?.data?.message || "Failed to approve payment.");
    } finally {
      setApprovingId(null);
    }
  };

  const downloadInvoice = async (e, paymentId) => {
    e.stopPropagation();
    try {
      const response = await paymentsApi.invoicePdf(paymentId);
      downloadBlob(response, `invoice-${paymentId}.pdf`);
      showAlert("Invoice downloaded successfully.");
    } catch (error) {
      showError("Failed to download invoice PDF.");
    }
  };

  const formatDate = (val) => {
    if (!val) return "-";
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const getStatusClass = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "completed" || s === "paid" || s === "success") {
      return "bg-[#ECFDF3] text-[#027A48] border-[#A9EFC5]";
    }
    if (s === "approved" || s === "confirmed" || s === "active") {
      return "bg-[#EBF2FF] text-[#0052CC] border-[#B2CCFF]";
    }
    if (s === "cancelled" || s === "failed" || s === "rejected") {
      return "bg-[#FFF1F0] text-[#D92D20] border-[#FECDCA]";
    }
    if (s === "pending" || s === "requested") {
      return "bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]";
    }
    return "bg-[#F2F4F7] text-[#667085] border-[#E4E7EC]";
  };

  const openDetail = (p) => {
    setSelectedPayment(p);
    setDetailOpen(true);
  };

  return (
    <div className="space-y-6 ">
      {/* Page Header */}
      <PageHeader
        title={t.payments}
        subtitle="Track ledger transactions, approve manual payment screenshots, and export invoices."
      />

      {/* Advanced Filters */}
      <div className="flex flex-col xl:flex-row justify-between items-center gap-4 bg-white border border-scms-border rounded-2xl p-4 shadow-sm">
        <SearchForm
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onSubmit={handleSearchSubmit}
          placeholder="Search by patient name or appointment code..."
          submitLabel={t.search}
          className="w-full max-w-2xl flex-1"
        />

        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          {/* Status dropdown */}
          <div className="relative w-full sm:w-44">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <select
              className="select select-bordered h-11 pl-9 rounded-xl text-xs font-semibold w-full bg-white border-scms-border"
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending Proof</option>
              <option value="paid">Approved / Paid</option>
              <option value="failed">Failed / Cancelled</option>
            </select>
          </div>

          {/* Date Picker */}
          <div className="relative w-full sm:w-44">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <DateInput
              className="input input-bordered h-11 pl-9 rounded-xl text-xs font-semibold w-full bg-white border-scms-border"
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 ml-auto xl:ml-0">
            <button
              onClick={() => setViewMode("table")}
              className={`p-2 rounded-lg transition ${viewMode === "table" ? "bg-white text-scms-primary shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              title="Table view"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setViewMode("card")}
              className={`p-2 rounded-lg transition ${viewMode === "card" ? "bg-white text-scms-primary shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              title="Grid Cards view"
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Main content display */}
      {loading ? (
        <div className="grid place-items-center h-60 bg-white rounded-2xl border border-scms-border">
          <span className="loading loading-spinner loading-md text-scms-primary" />
        </div>
      ) : payments.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-scms-border">
          <CreditCard size={48} className="text-slate-300 mb-2 animate-pulse" />
          <p className="text-sm font-bold text-scms-muted">No transaction logs found.</p>
        </div>
      ) : viewMode === "table" ? (
        /* TABLE VIEW */
        <div className="scms-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full font-sans">
              <thead className="bg-[#F9FAFB] text-xs uppercase text-scms-muted">
                <tr>
                  <th>No.</th>
                  <th>Invoice ID</th>
                  <th>Patient Name</th>
                  <th>Appointment</th>
                  <th>Paid Date</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p, index) => {
                  const pId = p.id || p.paymentId;
                  const status = p.paymentStatus || p.status;
                  const isPending = String(status).toLowerCase() === "pending";
                  const rowNo = ((page - 1) * pageSize) + index + 1;
                  return (
                    <tr
                      key={pId}
                      onClick={() => openDetail(p)}
                      className="hover:bg-slate-50/70 cursor-pointer transition"
                    >
                      <td className="font-black text-xs text-scms-muted">{rowNo}</td>
                      <td className="font-extrabold text-mono text-scms-primary text-sm">
                        INV-{pId}
                      </td>
                      <td className="font-extrabold text-scms-text">
                        {p.patientName || `Patient #${p.patientId}`}
                      </td>
                      <td className="font-bold text-slate-600 font-mono text-xs">
                        #{p.appointmentCode}
                      </td>
                      <td className="font-semibold text-xs">
                        {formatDate(p.paidAt || p.createdAt)}
                      </td>
                      <td className="font-black text-sm text-scms-text">
                        {Number(p.amount || p.totalAmount).toLocaleString()} MMK
                      </td>
                      <td>
                        <span className={`text-[10px] font-black border px-2.5 py-0.5 rounded-full ${getStatusClass(status)}`}>
                          {String(status).toUpperCase()}
                        </span>
                      </td>
                      <td className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1.5">
                          {isPending && (
                            <button
                              disabled={approvingId === pId}
                              onClick={(e) => handleApprove(e, pId)}
                              className="btn btn-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white border-0 px-3 flex items-center gap-1 font-black"
                              title="Approve Manual Payment Proof"
                            >
                              <Check size={12} />
                              Approve
                            </button>
                          )}
                          <button
                            onClick={(e) => downloadInvoice(e, pId)}
                            className="btn btn-xs rounded-lg border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                            title="Download PDF invoice"
                          >
                            <Download size={12} />
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
        /* GRID CARDS VIEW */
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {payments.map((p, index) => {
            const pId = p.id || p.paymentId;
            const status = p.paymentStatus || p.status;
            const isPending = String(status).toLowerCase() === "pending";
            const rowNo = ((page - 1) * pageSize) + index + 1;
            return (
              <div
                key={pId}
                onClick={() => openDetail(p)}
                className="bg-white border border-scms-border hover:border-indigo-600 rounded-3xl p-5 hover:shadow-lg cursor-pointer transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-xs font-black text-scms-muted">No. {rowNo}</span>
                    <span className="text-xs font-black text-indigo-600 font-mono">INV-{pId}</span>
                    <span className={`text-[9px] font-black border px-2.5 py-0.5 rounded-full ${getStatusClass(status)}`}>
                      {String(status).toUpperCase()}
                    </span>
                  </div>

                  <div className="mt-4">
                    <h4 className="font-black text-scms-text text-sm">{p.patientName || `Patient #${p.patientId}`}</h4>
                    <span className="text-[10px] text-scms-muted font-bold block mt-1">Visit Code: #{p.appointmentCode}</span>
                  </div>

                  <div className="mt-4 bg-slate-50 p-3.5 rounded-2xl text-xs space-y-2">
                    <div className="flex justify-between text-slate-500 font-semibold">
                      <span>Total Amount:</span>
                      <strong className="text-scms-text text-sm font-mono">{Number(p.amount || p.totalAmount).toLocaleString()} MMK</strong>
                    </div>
                    <div className="flex justify-between text-slate-500 font-semibold">
                      <span>Transaction Date:</span>
                      <strong className="text-scms-text">{formatDate(p.paidAt || p.createdAt)}</strong>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex justify-between items-center" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => openDetail(p)}
                    className="btn btn-sm btn-ghost rounded-xl text-xs font-extrabold text-indigo-600 bg-indigo-50/50 hover:bg-indigo-100/50"
                  >
                    View Breakdown
                  </button>

                  <div className="flex gap-1.5">
                    {isPending && (
                      <button
                        disabled={approvingId === pId}
                        onClick={(e) => handleApprove(e, pId)}
                        className="btn btn-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold px-3 border-0 h-9"
                      >
                        Approve
                      </button>
                    )}
                    <button
                      onClick={(e) => downloadInvoice(e, pId)}
                      className="btn btn-sm btn-ghost btn-square rounded-xl border border-scms-border"
                    >
                      <Download size={14} />
                    </button>
                  </div>
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
        label="payments"
        loading={loading}
        onPageChange={setPage}
      />

      {/* --- DETAILED PAYMENT BREAKDOWN PREVIEW MODAL --- */}
      {detailOpen && selectedPayment && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm ">
          <div className="w-full max-w-xl bg-white rounded-3xl border border-scms-border p-6 shadow-2xl relative max-h-[85vh] overflow-y-auto font-sans">
            <button
              onClick={() => setDetailOpen(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition"
            >
              <X size={18} />
            </button>

            {/* Header */}
            <div className="flex gap-4 items-center border-b border-slate-100 pb-4 mb-4">
              <div className="grid h-12 w-12 place-items-center bg-indigo-50 text-indigo-600 rounded-2xl shrink-0">
                <CreditCard size={22} />
              </div>
              <div>
                <h3 className="text-lg font-black text-scms-text">Ledger Invoice INV-{selectedPayment.id || selectedPayment.paymentId}</h3>
                <span className={`inline-flex text-[9px] font-black border px-2 py-0.5 mt-1 rounded-full ${getStatusClass(selectedPayment.paymentStatus || selectedPayment.status)}`}>
                  {String(selectedPayment.paymentStatus || selectedPayment.status).toUpperCase()}
                </span>
              </div>
            </div>

            {/* Breakdown Invoice Grid */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-4 text-xs font-sans">
              <h4 className="font-extrabold text-slate-800 flex items-center gap-1.5 border-b border-slate-200 pb-2">
                <FileText size={14} className="text-scms-primary" />
                Ledger Breakdown
              </h4>

              <div className="space-y-2.5 font-semibold text-slate-600">
                <div className="flex justify-between">
                  <span>Patient Name:</span>
                  <strong className="text-scms-text">{selectedPayment.patientName}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Appointment Slot:</span>
                  <strong className="text-scms-text font-mono">#{selectedPayment.appointmentCode}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Transaction Date:</span>
                  <strong className="text-scms-text">{formatDate(selectedPayment.paidAt || selectedPayment.createdAt)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Payment Gateway:</span>
                  <strong className="text-scms-text capitalize">{selectedPayment.paymentMethod || "Manual Proof"}</strong>
                </div>

                 <div className="border-t border-slate-200 pt-3 space-y-2.5">
                  <div className="flex justify-between">
                    <span>Clinical Base Charge:</span>
                    <strong className="text-scms-text font-mono">{Number(selectedPayment.amount || selectedPayment.totalAmount).toLocaleString()} MMK</strong>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Commercial Service Tax (5%):</span>
                    <strong className="text-scms-text font-mono">{Number(selectedPayment.tax || 0).toLocaleString()} MMK</strong>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>System Surcharge / Fees:</span>
                    <strong className="text-scms-text font-mono">{Number(selectedPayment.charges || 0).toLocaleString()} MMK</strong>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-3 flex justify-between text-sm">
                  <span className="font-black text-slate-800">Grand Total Invoiced:</span>
                  <strong className="text-indigo-600 font-mono font-black">
                    {Number(
                      (selectedPayment.amount || selectedPayment.totalAmount) +
                      (selectedPayment.tax || 0) +
                      (selectedPayment.charges || 0)
                    ).toLocaleString()} MMK
                  </strong>
                </div>
              </div>
            </div>

            {/* Proof screenshot if it exists */}
            {(selectedPayment.paymentScreenshot || selectedPayment.screenshot) && (
              <div className="mt-5 space-y-2 text-xs">
                <span className="font-black text-slate-700 block flex items-center gap-1">
                  <AlertCircle size={14} className="text-indigo-600" />
                  Uploaded Bank Transaction Transfer Screenshot Proof:
                </span>
                <div className="w-full h-64 border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 flex items-center justify-center relative group">
                  <img
                    src={selectedPayment.paymentScreenshot || selectedPayment.screenshot}
                    alt="Manual payment proof screenshot transfer"
                    className="object-contain w-full h-full cursor-zoom-in transition duration-300 group-hover:scale-110"
                  />
                </div>
              </div>
            )}

            {/* Footer action bar */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end gap-2">
              {String(selectedPayment.paymentStatus || selectedPayment.status).toLowerCase() === "pending" && (
                <button
                  disabled={approvingId === (selectedPayment.id || selectedPayment.paymentId)}
                  onClick={(e) => handleApprove(e, selectedPayment.id || selectedPayment.paymentId)}
                  className="scms-btn-primary h-10 text-xs font-black flex items-center gap-1.5"
                >
                  {approvingId === (selectedPayment.id || selectedPayment.paymentId) ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    <Check size={14} />
                  )}
                  Approve Transaction Proof
                </button>
              )}
              <button
                onClick={(e) => downloadInvoice(e, selectedPayment.id || selectedPayment.paymentId)}
                className="scms-btn-outline h-10 text-xs font-black flex items-center gap-1"
              >
                <Download size={13} />
                Download PDF
              </button>
              <button
                onClick={() => setDetailOpen(false)}
                className="scms-btn-outline h-10 w-10 p-0 min-w-0 flex items-center justify-center animate-scaleIn"
                aria-label="Close Invoice"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}

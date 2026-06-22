import { useState, useEffect } from "react";
import {
  BarChart3,
  Download,
  Calendar,
  Layers,
  FileText,
  TrendingUp,
  Activity,
  CheckCircle,
  Eye,
  X
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import ModalPortal from "../components/ModalPortal";
import DateInput from "../components/DateInput";
import { useLanguage } from "../context/LanguageContext";
import { downloadBlob, reportsApi } from "../services/scmsApi";
import { showError, showAlert } from "../services/dialogs";

const toArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.result)) return data.result;
  if (typeof data === "object" && data) {
    return Object.entries(data).map(([key, value]) => ({ metric: key, value }));
  }
  return [];
};

const reportConfigs = {
  businessSummary: {
    label: "Business Summary Report",
    load: reportsApi.businessSummary,
    pdf: reportsApi.businessSummaryPdf,
    file: "business-summary.pdf",
    description: "Holistic overview of revenue metrics, top diagnoses, and medicine inventory."
  },
  appointments: {
    label: "Appointments Status Report",
    load: reportsApi.appointments,
    pdf: reportsApi.appointmentPdf,
    file: "appointments-report.pdf",
    description: "Detailed slots booking statistics, doctor consultation, and queue durations."
  },
  revenue: {
    label: "Financial Revenue Report",
    load: reportsApi.revenue,
    pdf: reportsApi.revenuePdf,
    file: "revenue-report.pdf",
    description: "Invoiced totals, commercial taxes, system fees, and manual payment summaries."
  },
  patients: {
    label: "Patients Directory Report",
    load: reportsApi.patients,
    pdf: reportsApi.patientsPdf,
    file: "patients-report.pdf",
    description: "Demographics, new registrations, gender splits, and clinical histories."
  },
  medicineStock: {
    label: "Inventory Medicine Stock Report",
    load: reportsApi.medicineStock,
    pdf: reportsApi.medicineStockPdf,
    file: "medicine-stock-report.pdf",
    description: "Low-stock warnings, quarantine batch counts, and expiry milestones."
  },
  followUps: {
    label: "Patient Follow-Ups Report",
    load: reportsApi.followUps,
    pdf: reportsApi.followUpsPdf,
    file: "follow-ups-report.pdf",
    description: "Schedules, completion rates, and routine revisit alerts."
  },
};

export default function Reports() {
  const { t } = useLanguage();
  const [reportKey, setReportKey] = useState("businessSummary");
  const [reportType, setReportType] = useState("daily");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  // Detailed Modal State
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const params = () => ({ reportType, date });

  const loadReport = async () => {
    try {
      setLoading(true);
      const data = await reportConfigs[reportKey].load(params());
      setRows(toArray(data));
    } catch (error) {
      showError(error?.response?.data?.message || "Failed to load report analytics.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportKey, reportType, date]);

  const handleDownloadPdf = async () => {
    try {
      const response = await reportConfigs[reportKey].pdf(params());
      downloadBlob(response, reportConfigs[reportKey].file);
      showAlert("PDF Report downloaded successfully.");
    } catch (error) {
      showError("Failed to export PDF report.");
    }
  };

  const formatDate = (val) => {
    if (!val) return "-";
    // Avoid formatting standard numbers or IDs as dates
    if (typeof val === "number" || /^\d+$/.test(val)) return String(val);
    
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    
    // Check if it looks like a date string (YYYY-MM-DD or ISO)
    const isIsoOrHyphenated = String(val).includes("-") || String(val).includes("T");
    if (!isIsoOrHyphenated) return String(val);

    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const openPreview = (row) => {
    setSelectedRow(row);
    setPreviewOpen(true);
  };

  return (
    <div className="space-y-6 ">
      {/* Page Header */}
      <PageHeader
        title={t.reports}
        subtitle="Access clinical analytics, business revenue splits, and download structured audits."
      />

      {/* Filter panel */}
      <section className="bg-white border border-scms-border rounded-3xl p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 items-end">
          <label className="block">
            <span className="mb-2 block text-xs font-black text-scms-text">Select Report Domain</span>
            <select
              className="select select-bordered h-11 rounded-xl text-xs font-semibold w-full bg-white border-scms-border"
              value={reportKey}
              onChange={(e) => setReportKey(e.target.value)}
            >
              <option value="businessSummary">Business Summary</option>
              <option value="appointments">Appointments Stats</option>
              <option value="revenue">Financial Revenue</option>
              <option value="patients">Patients Directory</option>
              <option value="medicineStock">Inventory Medicine Stock</option>
              <option value="followUps">Patient Follow-ups</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-black text-scms-text">Aggregation Interval</span>
            <select
              className="select select-bordered h-11 rounded-xl text-xs font-semibold w-full bg-white border-scms-border"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
            >
              <option value="daily">Daily Aggregation</option>
              <option value="monthly">Monthly Aggregation</option>
              <option value="all">All-time Aggregate</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-black text-scms-text">Report Target Date</span>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <DateInput
                className="input input-bordered h-11 pl-9 rounded-xl text-xs font-semibold w-full bg-white border-scms-border font-mono"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </label>

          <button
            onClick={handleDownloadPdf}
            className="scms-btn-primary h-11 font-black text-sm flex items-center justify-center gap-2"
          >
            <Download size={16} />
            Export PDF Report
          </button>
        </div>

        <div className="mt-4 text-xs font-medium text-scms-muted bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex items-center gap-2">
          <Activity size={15} className="text-scms-primary" />
          <span><strong>Active Config:</strong> {reportConfigs[reportKey].description}</span>
        </div>
      </section>

      {/* Structured data table */}
      {loading ? (
        <div className="grid place-items-center h-60 bg-white rounded-2xl border border-scms-border">
          <span className="loading loading-spinner loading-md text-scms-primary" />
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-scms-border">
          <BarChart3 size={48} className="text-slate-300 mb-2 animate-bounce" />
          <p className="text-sm font-bold text-scms-muted">No analytical rows fetched for the selected configuration.</p>
        </div>
      ) : (
        <div className="scms-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full font-sans">
              <thead className="bg-[#F9FAFB] text-xs uppercase text-scms-muted">
                <tr>
                  <th>No.</th>
                  <th>Report Metric / Record Key</th>
                  <th>Aggregated Value / Summary</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const metric = row.metric || row.name || row.patientName || row.id || `Metric #${index + 1}`;
                  let val = row.value ?? row.total ?? row.amount ?? row.count ?? row.status;
                  if (val === undefined || val === null) {
                    val = "Check Details";
                  }

                  return (
                    <tr
                      key={index}
                      onClick={() => openPreview(row)}
                    className="hover:bg-slate-50/70 cursor-pointer transition text-xs"
                  >
                      <td className="font-black text-xs text-scms-muted">{index + 1}</td>
                    <td className="font-extrabold text-scms-text">
                        {formatDate(metric)}
                    </td>
                      <td className="font-semibold text-scms-muted max-w-sm truncate">
                        {typeof val === "object" ? "JSON details" : formatDate(val)}
                      </td>
                      <td className="text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => openPreview(row)}
                          className="btn btn-xs rounded-lg border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-extrabold px-2.5 flex items-center gap-1"
                        >
                          <Eye size={12} />
                          Preview Detail
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- DETAILED JSON PREVIEW MODAL --- */}
      {previewOpen && selectedRow && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm ">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-scms-border p-6 shadow-2xl relative max-h-[80vh] overflow-y-auto font-sans">
            <button
              onClick={() => setPreviewOpen(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition"
            >
              <X size={18} />
            </button>

            {/* Header */}
            <div className="flex gap-3 items-center border-b border-slate-100 pb-3 mb-4">
              <div className="grid h-10 w-10 place-items-center bg-scms-primaryLight text-scms-primary rounded-xl shrink-0">
                <BarChart3 size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-scms-text">Metric Breakdown Preview</h3>
                <span className="text-[10px] font-bold text-scms-muted">Domain: {reportConfigs[reportKey].label}</span>
              </div>
            </div>

            {/* Structured details display */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-xs font-sans space-y-3.5">
              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="font-extrabold text-slate-500">Metric ID / Key:</span>
                <strong className="text-scms-text">{formatDate(selectedRow.metric || selectedRow.name || selectedRow.patientName || selectedRow.id || "N/A")}</strong>
              </div>

              <div className="space-y-2">
                <span className="font-extrabold text-slate-500 block mb-1">Analytical Values:</span>
                
                {typeof selectedRow === "object" ? (
                  <div className="bg-white p-3 rounded-xl border border-slate-200 max-h-60 overflow-y-auto space-y-2 font-mono text-[10px]">
                    {Object.entries(selectedRow).map(([k, v]) => (
                      <div key={k} className="flex justify-between border-b border-slate-100 last:border-0 pb-1.5 last:pb-0">
                        <span className="font-bold text-indigo-700 capitalize">{k}:</span>
                        <span className="text-slate-700 font-extrabold">{typeof v === "object" ? JSON.stringify(v) : formatDate(v)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-scms-text font-black text-sm bg-white p-3 rounded-xl border border-slate-200">
                    {formatDate(selectedRow)}
                  </p>
                )}
              </div>
            </div>

            {/* Action footer */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={handleDownloadPdf}
                className="scms-btn-primary h-10 text-xs font-black flex items-center gap-1.5"
              >
                <Download size={14} />
                Download PDF Report
              </button>
              <button
                onClick={() => setPreviewOpen(false)}
                className="scms-btn-outline h-10 w-10 p-0 min-w-0 flex items-center justify-center"
                aria-label="Close Preview"
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

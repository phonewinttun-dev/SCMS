import { useState, useEffect } from "react";
import {
  FileText,
  RefreshCcw,
  LayoutGrid,
  List,
  Download,
  Info,
  Activity,
  Heart,
  Droplet,
  User,
  Calendar,
  Pill,
  X
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import ModalPortal from "../components/ModalPortal";
import DateInput from "../components/DateInput";
import PaginationControls from "../components/PaginationControls";
import SearchForm from "../components/SearchForm";
import { prescriptionsApi, patientsApi, diseasesApi, downloadBlob } from "../services/scmsApi";
import { showAlert, showError } from "../services/dialogs";
import { useLanguage } from "../context/LanguageContext";
import { formatTemperatureF } from "../utils/clinical";

const toArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.result)) return data.result;
  return [];
};

export default function PrescriptionsPage() {
  const { t } = useLanguage();
  const pageSize = 10;

  const [prescriptions, setPrescriptions] = useState([]);
  const [diseases, setDiseases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState("table"); // "table" or "card"
  
  // Search & Filter State
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedDiseaseId, setSelectedDiseaseId] = useState("");
  const [dateFilter, setDateFilter] = useState(""); // YYYY-MM-DD

  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Detailed Modal State
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedRx, setSelectedRx] = useState(null);

  const loadFilterCatalog = async () => {
    try {
      const diseasesRes = await diseasesApi.list({ pageSize: 100 });
      setDiseases(toArray(diseasesRes));
    } catch (e) {
      console.error("Failed to load filter catalogs", e);
    }
  };

  const loadPrescriptions = async (pageNum = page) => {
    try {
      setLoading(true);
      
      const params = {
        pageNumber: pageNum,
        pageSize: 10,
      };

      const res = await prescriptionsApi.list(params);

      if (res) {
        let items = res.data || [];

        // Apply client filters for fields not supported directly by backend list API
        if (patientSearch.trim()) {
          items = items.filter(rx => rx.patientName?.toLowerCase().includes(patientSearch.toLowerCase()));
        }
        if (selectedDiseaseId) {
          items = items.filter(rx => String(rx.diseaseId) === String(selectedDiseaseId));
        }
        if (dateFilter) {
          items = items.filter(rx => rx.createdAt?.split("T")[0] === dateFilter);
        }

        setPrescriptions(items);
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages || 1);
          setTotalCount(res.pagination.totalCount || items.length);
        }
      }
    } catch (error) {
      showError("Failed to fetch prescriptions records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFilterCatalog();
  }, []);

  useEffect(() => {
    loadPrescriptions(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, selectedDiseaseId, dateFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadPrescriptions(1);
  };

  const downloadRxPdf = async (e, rxId) => {
    e.stopPropagation();
    try {
      const response = await prescriptionsApi.pdf(rxId);
      downloadBlob(response, `prescription-${rxId}.pdf`);
      showAlert("Prescription PDF downloaded successfully.");
    } catch (err) {
      showError("Failed to download PDF document.");
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

  const openDetail = async (rx) => {
    try {
      const res = await prescriptionsApi.get(rx.id || rx.prescriptionId);
      setSelectedRx(res.data || res);
      setDetailOpen(true);
    } catch (e) {
      // Fallback to loaded object
      setSelectedRx(rx);
      setDetailOpen(true);
    }
  };

  return (
    <div className="space-y-6 ">
      {/* Page Header */}
      <PageHeader
        title={t.prescriptions}
        subtitle="Review clinical prescriptions catalog, drug schedules, and downloadable records."
      />

      {/* Advanced Filters */}
      <div className="flex flex-col xl:flex-row justify-between items-center gap-4 bg-white border border-scms-border rounded-2xl p-4 shadow-sm">
        <SearchForm
          value={patientSearch}
          onChange={(e) => setPatientSearch(e.target.value)}
          onSubmit={handleSearchSubmit}
          placeholder="Search by patient name..."
          submitLabel={t.search}
          className="w-full max-w-2xl flex-1"
        />

        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          {/* Disease filter */}
          <div className="relative w-full sm:w-48">
            <Activity className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <select
              className="select select-bordered h-11 pl-9 rounded-xl text-xs font-semibold w-full bg-white border-scms-border"
              value={selectedDiseaseId}
              onChange={(e) => { setSelectedDiseaseId(e.target.value); setPage(1); }}
            >
              <option value="">All Diseases</option>
              {diseases.map(d => (
                <option key={d.diseaseId || d.id} value={d.diseaseId || d.id}>{d.name || d.diseaseName}</option>
              ))}
            </select>
          </div>

          {/* Date Picker */}
          <div className="relative w-full sm:w-40">
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

      {/* Main Listing View */}
      {loading ? (
        <div className="grid place-items-center h-60 bg-white rounded-2xl border border-scms-border">
          <span className="loading loading-spinner loading-md text-scms-primary" />
        </div>
      ) : prescriptions.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-scms-border">
          <FileText size={48} className="text-slate-300 mb-2 animate-pulse" />
          <p className="text-sm font-bold text-scms-muted">No prescriptions records found.</p>
        </div>
      ) : viewMode === "table" ? (
        /* TABLE VIEW */
        <div className="scms-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full font-sans">
              <thead className="bg-[#F9FAFB] text-xs uppercase text-scms-muted">
                <tr>
                  <th>No.</th>
                  <th>Prescription Code</th>
                  <th>Patient Name</th>
                  <th>Diagnosed Disease</th>
                  <th>Consultation Date</th>
                  <th>Prescribed Drugs Count</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {prescriptions.map((rx, index) => {
                  const rowNo = ((page - 1) * pageSize) + index + 1;
                  return (
                  <tr
                    key={rx.id || rx.prescriptionId}
                    onClick={() => openDetail(rx)}
                    className="hover:bg-slate-50/70 cursor-pointer transition"
                  >
                    <td className="font-black text-xs text-scms-muted">{rowNo}</td>
                    <td className="font-extrabold text-scms-primary font-mono text-sm">
                      RX-{rx.id || rx.prescriptionId}
                    </td>
                    <td className="font-extrabold text-scms-text">
                      {rx.patientName || `Patient ID: ${rx.patientId}`}
                    </td>
                    <td>
                      <span className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
                        <Activity size={12} />
                        {rx.diseaseName || "General Symptomatic"}
                      </span>
                    </td>
                    <td className="font-semibold text-xs">
                      {formatDate(rx.createdAt || rx.date)}
                    </td>
                    <td className="font-extrabold text-slate-700">
                      {rx.items?.length || 0} items
                    </td>
                    <td className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => openDetail(rx)}
                          className="btn btn-xs rounded-lg border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                        >
                          <Info size={12} />
                          Review
                        </button>
                        <button
                          onClick={(e) => downloadRxPdf(e, rx.id || rx.prescriptionId)}
                          className="btn btn-xs rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white border-0"
                        >
                          <Download size={12} />
                          PDF
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
          {prescriptions.map((rx, index) => {
            const rowNo = ((page - 1) * pageSize) + index + 1;
            return (
            <div
              key={rx.id || rx.prescriptionId}
              onClick={() => openDetail(rx)}
              className="bg-white border border-scms-border hover:border-indigo-600 rounded-3xl p-5 hover:shadow-lg cursor-pointer transition flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-xs font-black text-scms-muted">No. {rowNo}</span>
                  <span className="text-xs font-black text-indigo-600 font-mono">RX-{rx.id || rx.prescriptionId}</span>
                  <span className="text-[10px] text-scms-muted font-bold flex items-center gap-1">
                    <Calendar size={12} />
                    {formatDate(rx.createdAt || rx.date)}
                  </span>
                </div>

                <div className="mt-4">
                  <h4 className="font-black text-scms-text text-sm">{rx.patientName || `Patient ID: ${rx.patientId}`}</h4>
                  <div className="mt-2.5">
                    <span className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                      <Activity size={11} />
                      {rx.diseaseName || "General Symptomatic"}
                    </span>
                  </div>
                </div>

                {rx.items?.length > 0 && (
                  <div className="mt-4 space-y-1.5">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Prescribed Medication</span>
                    <div className="flex flex-wrap gap-1.5">
                      {rx.items.slice(0, 3).map((item, idx) => (
                        <span key={idx} className="bg-slate-50 border border-slate-100 text-slate-600 text-[9px] font-bold px-2 py-0.5 rounded-md">
                          {item.medicineName}
                        </span>
                      ))}
                      {rx.items.length > 3 && (
                        <span className="bg-slate-100 text-slate-500 text-[9px] font-bold px-2 py-0.5 rounded-md">
                          +{rx.items.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-3 border-t border-slate-100 flex justify-between items-center" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => openDetail(rx)}
                  className="btn btn-sm btn-ghost rounded-xl text-xs font-extrabold text-indigo-600 bg-indigo-50/50 hover:bg-indigo-100/50"
                >
                  View Details
                </button>
                <button
                  onClick={(e) => downloadRxPdf(e, rx.id || rx.prescriptionId)}
                  className="btn btn-sm btn-ghost btn-square rounded-xl border border-scms-border"
                >
                  <Download size={14} />
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
        label="prescriptions"
        loading={loading}
        onPageChange={setPage}
      />

      {/* --- DETAILED PRESCRIPTION REVIEW MODAL --- */}
      {detailOpen && selectedRx && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm ">
          <div className="w-full max-w-3xl bg-white rounded-3xl border border-scms-border p-6 shadow-2xl relative max-h-[85vh] overflow-y-auto font-sans">
            <button
              onClick={() => setDetailOpen(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition"
            >
              <X size={18} />
            </button>

            {/* Title / Brief */}
            <div className="flex gap-4 items-center border-b border-slate-100 pb-4 mb-4">
              <div className="grid h-12 w-12 place-items-center bg-indigo-50 text-indigo-600 rounded-2xl shrink-0">
                <FileText size={22} />
              </div>
              <div>
                <h3 className="text-lg font-black text-scms-text">Prescription Review RX-{selectedRx.id || selectedRx.prescriptionId}</h3>
                <p className="text-xs font-semibold text-scms-muted mt-0.5">
                  Consultation Date: <strong className="text-scms-text">{formatDate(selectedRx.createdAt || selectedRx.date)}</strong> | Visit Code: <strong className="text-scms-text">#{selectedRx.appointmentCode}</strong>
                </p>
              </div>
            </div>

            {/* Demographics / Details Grid */}
            <div className="grid gap-6 sm:grid-cols-2 text-xs">
              
              {/* Vitals Summary Card */}
              <div className="space-y-4">
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
                  <h4 className="font-extrabold text-slate-800 flex items-center gap-1.5 border-b border-slate-200 pb-2">
                    <Heart size={14} className="text-rose-500 fill-rose-500" />
                    Clinical Vitals & Measurements
                  </h4>

                  <div className="grid grid-cols-2 gap-2 text-slate-600 font-semibold leading-loose">
                    <div>Weight: <strong className="text-scms-text">{selectedRx.weightKg ? `${selectedRx.weightKg} kg` : "-"}</strong></div>
                    <div>Height: <strong className="text-scms-text">{selectedRx.heightCm ? `${selectedRx.heightCm} cm` : "-"}</strong></div>
                    <div>BP Systolic: <strong className="text-scms-text">{selectedRx.bloodPressureSystolic ? `${selectedRx.bloodPressureSystolic} mmHg` : "-"}</strong></div>
                    <div>BP Diastolic: <strong className="text-scms-text">{selectedRx.bloodPressureDiastolic ? `${selectedRx.bloodPressureDiastolic} mmHg` : "-"}</strong></div>
                    <div>Pulse Rate: <strong className="text-scms-text">{selectedRx.pulseBpm ? `${selectedRx.pulseBpm} bpm` : "-"}</strong></div>
                    <div>Temp (°F): <strong className="text-scms-text">{formatTemperatureF(selectedRx.temperatureC)}</strong></div>
                    <div>SpO2: <strong className="text-scms-text">{selectedRx.spo2Percent ? `${selectedRx.spo2Percent} %` : "-"}</strong></div>
                    <div>BMI Score: <strong className="text-indigo-600 font-extrabold">{selectedRx.bmi || "-"}</strong></div>
                  </div>
                </div>

                <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100/60">
                  <h4 className="font-extrabold text-indigo-800 flex items-center gap-1.5 mb-1.5">
                    <Activity size={14} className="text-indigo-600" />
                    Medical Assessment
                  </h4>
                  <div className="space-y-1.5 text-slate-600 font-semibold">
                    <div>Diagnosis: <strong className="text-indigo-950 font-black">{selectedRx.diseaseName || "General clinical visit"}</strong></div>
                    <div className="mt-2 text-xs">
                      <span className="font-bold text-slate-500 block mb-1">Clinical Assessment Notes:</span>
                      <p className="text-scms-muted font-medium bg-white p-2.5 rounded-lg border border-slate-200 italic leading-relaxed">
                        "{selectedRx.notes || "No visit notes registered."}"
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Prescribed Medicine block */}
              <div className="space-y-4 flex flex-col">
                <div className="flex-1 bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col justify-between">
                  <div>
                    <h4 className="font-extrabold text-slate-800 flex items-center gap-1.5 border-b border-slate-200 pb-2 mb-3">
                      <Pill size={14} className="text-indigo-600" />
                      Prescribed Drug Checklist
                    </h4>
                    
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {selectedRx.items?.map((item) => (
                        <div key={item.id} className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-black text-slate-800 text-[11px]">{item.medicineName}</span>
                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                              {item.dosage}
                            </span>
                          </div>
                          <div className="text-[10px] text-scms-muted font-bold flex justify-between">
                            <span>Duration: {item.days} days</span>
                            <span>Qty: {item.quantity} {item.doseUnit || "units"}</span>
                          </div>
                          {item.instruction && (
                            <p className="text-[9px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md italic font-semibold mt-1">
                              Instruction: {item.instruction}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
              <span className="text-[10px] font-bold text-scms-muted">Patient: <strong className="text-scms-text">{selectedRx.patientName}</strong></span>
              
              <div className="flex gap-2">
                <button
                  onClick={(e) => downloadRxPdf(e, selectedRx.id || selectedRx.prescriptionId)}
                  className="scms-btn-primary h-10 text-xs font-black flex items-center gap-1.5"
                >
                  <Download size={14} />
                  Download PDF
                </button>
                <button
                  onClick={() => setDetailOpen(false)}
                  className="scms-btn-outline h-10 w-10 p-0 min-w-0 flex items-center justify-center"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}

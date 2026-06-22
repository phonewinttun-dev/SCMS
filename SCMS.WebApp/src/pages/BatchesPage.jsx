import { useState, useEffect } from "react";
import {
  Layers,
  Plus,
  RefreshCcw,
  LayoutGrid,
  List,
  BellRing,
  Edit,
  Trash2,
  Calendar,
  AlertTriangle,
  X,
  ArrowLeft,
  Pill,
  User,
  Truck
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import ModalPortal from "../components/ModalPortal";
import PaginationControls from "../components/PaginationControls";
import DateInput from "../components/DateInput";
import SearchForm from "../components/SearchForm";
import { medicinesApi } from "../services/scmsApi";
import { showAlert, showError, showConfirm } from "../services/dialogs";
import { useLanguage } from "../context/LanguageContext";
import { useNavigate } from "react-router-dom";

const toArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.result)) return data.result;
  return [];
};

const getDaysRemaining = (expiryDate) => {
  if (!expiryDate) return 0;
  
  let parts;
  let year, month, day;
  
  if (String(expiryDate).includes("-")) {
    parts = String(expiryDate).split("-");
    if (parts[0].length === 4) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      day = parseInt(parts[2], 10);
    } else {
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      year = parseInt(parts[2], 10);
    }
  } else if (String(expiryDate).includes("/")) {
    parts = String(expiryDate).split("/");
    if (parts[0].length === 4) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      day = parseInt(parts[2], 10);
    } else {
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      year = parseInt(parts[2], 10);
    }
  } else {
    const d = new Date(expiryDate);
    if (isNaN(d.getTime())) return 0;
    year = d.getFullYear();
    month = d.getMonth();
    day = d.getDate();
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(year, month, day);
  expiry.setHours(0, 0, 0, 0);
  
  const diffTime = expiry - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
};

export default function BatchesPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const pageSize = 10;

  const [batches, setBatches] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState("table"); // "table" or "card"
  
  // Search & Filter State
  const [query, setQuery] = useState("");
  const [selectedMedicineId, setSelectedMedicineId] = useState("");

  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Alerts Modal State
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);

  // CRUD Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [form, setForm] = useState({
    medId: "",
    batchNo: "",
    quantity: "",
    expiryDate: "",
    manufactureDate: "",
    receivedDate: "",
    supplierName: "",
    manufacturer: "",
    status: "active"
  });

  const loadMedicinesCatalog = async () => {
    try {
      const res = await medicinesApi.list({ pageSize: 100 });
      setMedicines(toArray(res));
    } catch (e) {
      console.error("Failed to load medicines catalog", e);
    }
  };

  const loadBatches = async (pageNum = page) => {
    try {
      setLoading(true);
      const res = await medicinesApi.batches({
        query: query.trim() || undefined,
        medicineId: selectedMedicineId ? Number(selectedMedicineId) : undefined,
        pageNumber: pageNum,
        pageSize: 10
      });

      if (res) {
        setBatches(toArray(res));
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages || 1);
          setTotalCount(res.pagination.totalCount || toArray(res).length);
        }
      }
    } catch (error) {
      showError("Failed to fetch medicine batches.");
    } finally {
      setLoading(false);
    }
  };

  const loadAlerts = async () => {
    try {
      setLoadingAlerts(true);
      const res = await medicinesApi.alerts();
      setAlerts(toArray(res));
    } catch (e) {
      console.error("Failed to load inventory alerts", e);
    } finally {
      setLoadingAlerts(false);
    }
  };

  useEffect(() => {
    loadMedicinesCatalog();
    loadBatches(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, selectedMedicineId]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadBatches(1);
  };

  const openCreate = () => {
    setEditingBatch(null);
    setForm({
      medId: medicines[0]?.medicineId || medicines[0]?.id || "",
      batchNo: "",
      quantity: "",
      expiryDate: "",
      manufactureDate: "",
      receivedDate: new Date().toISOString().split("T")[0],
      supplierName: "",
      manufacturer: "",
      status: "active"
    });
    setModalOpen(true);
  };

  const openEdit = (batch) => {
    setEditingBatch(batch);
    setForm({
      medId: batch.medicineId || batch.medId || "",
      batchNo: batch.batchNo || "",
      quantity: batch.quantity || "",
      expiryDate: batch.expiryDate || "",
      manufactureDate: batch.manufactureDate || "",
      receivedDate: batch.receivedDate || "",
      supplierName: batch.supplierName || "",
      manufacturer: batch.manufacturer || "",
      status: batch.status || "active"
    });
    setModalOpen(true);
  };

  const handleDelete = async (batch) => {
    const ok = await showConfirm(`Are you sure you want to delete Batch "${batch.batchNo}"?`);
    if (!ok) return;

    try {
      await medicinesApi.deleteBatch(batch.id || batch.batchId);
      await showAlert("Medicine batch deleted successfully.");
      loadBatches(page);
    } catch (e) {
      showError("Failed to delete medicine batch.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.medId || !form.batchNo || !form.quantity || !form.expiryDate || !form.manufactureDate) {
      showAlert("Please fill in all required fields.");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        medId: Number(form.medId),
        batchNo: form.batchNo.trim(),
        quantity: Number(form.quantity),
        expiryDate: form.expiryDate,
        manufactureDate: form.manufactureDate,
        receivedDate: form.receivedDate || null,
        supplierName: form.supplierName.trim() || null,
        manufacturer: form.manufacturer.trim() || "Generic",
        status: form.status
      };

      if (editingBatch) {
        await medicinesApi.updateBatch(editingBatch.id || editingBatch.batchId, payload);
        await showAlert("Batch updated successfully.");
      } else {
        await medicinesApi.createBatch(payload);
        await showAlert("New medicine batch registered successfully.");
      }

      setModalOpen(false);
      setPage(1);
      loadBatches(1);
    } catch (error) {
      showError(error?.response?.data?.message || "Failed to save medicine batch.");
    } finally {
      setSaving(false);
    }
  };

  const openAlertsModal = () => {
    loadAlerts();
    setAlertsOpen(true);
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

  return (
    <div className="space-y-6 ">
      {/* Page Header */}
      <PageHeader
        title="Medicine Batches"
        subtitle="Manage supplier invoices, drug batches, expiration monitoring, and real-time inventory levels."
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => navigate("/app/medicines")}
              className="scms-btn-outline flex items-center gap-1.5 font-bold"
            >
              <ArrowLeft size={16} />
              Back to Catalog
            </button>
            <button
              onClick={openAlertsModal}
              className="scms-btn-outline border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 flex items-center gap-1.5 font-bold"
            >
              <BellRing size={16} />
              Stock Warnings
            </button>
            <button onClick={openCreate} className="scms-btn-primary">
              <Plus size={16} />
              Add Batch
            </button>
          </div>
        }
      />

      {/* Advanced Filters */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white border border-scms-border rounded-2xl p-4 shadow-sm">
        <SearchForm
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onSubmit={handleSearchSubmit}
          placeholder="Search batches by batch number, supplier, or brand..."
          submitLabel={t.search}
          className="w-full max-w-2xl flex-1"
        />

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Medicine Specific Filter */}
          <div className="relative w-full sm:w-60">
            <Pill className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select
              className="select select-bordered h-11 pl-10 rounded-xl text-xs font-semibold w-full bg-white border-scms-border"
              value={selectedMedicineId}
              onChange={(e) => { setSelectedMedicineId(e.target.value); setPage(1); }}
            >
              <option value="">All Medicines</option>
              {medicines.map(m => (
                <option key={m.medicineId || m.id} value={m.medicineId || m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 ml-auto md:ml-0">
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
      ) : batches.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-scms-border">
          <Layers size={48} className="text-slate-300 mb-2 animate-bounce" />
          <p className="text-sm font-bold text-scms-muted">No medicine batches found.</p>
        </div>
      ) : viewMode === "table" ? (
        /* TABLE VIEW */
        <div className="scms-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead className="bg-[#F9FAFB] text-xs uppercase text-scms-muted">
                <tr>
                  <th>No.</th>
                  <th>Visual</th>
                  <th>Batch Number</th>
                  <th>Medicine</th>
                  <th>Qty In Hand</th>
                  <th>Expiration</th>
                  <th>Supplier / Brand</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((batch, index) => {
                  const rowNo = ((page - 1) * pageSize) + index + 1;
                  const m = medicines.find(med => String(med.medicineId || med.id) === String(batch.medicineId || batch.medId));
                  return (
                    <tr key={batch.id || batch.batchId} className="hover:bg-slate-50/70 transition">
                      <td className="font-black text-xs text-scms-muted">{rowNo}</td>
                      <td>
                        {/* Zoom preview visual */}
                        <div className="relative group w-10 h-10 shrink-0 cursor-zoom-in">
                          {/* Small thumbnail wrapper that clips scale-up */}
                          <div className="w-full h-full rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center">
                            {m?.imageUrl ? (
                              <img
                                src={m.imageUrl}
                                alt={m.name}
                                className="object-cover w-full h-full transition duration-300 group-hover:scale-125"
                              />
                            ) : (
                              <Pill className="text-slate-400" size={16} />
                            )}
                          </div>
                          {/* Large Hover Zoom Card (Placed outside overflow-hidden) */}
                          <div className="absolute left-14 top-1/2 -translate-y-1/2 hidden group-hover:block z-50 p-1 bg-white border border-scms-border rounded-xl shadow-xl w-36 h-36  pointer-events-none">
                            {m?.imageUrl ? (
                              <img src={m.imageUrl} alt={m?.name} className="object-cover w-full h-full rounded-lg" />
                            ) : (
                              <div className="w-full h-full bg-slate-50 rounded-lg flex items-center justify-center">
                                <Pill className="text-slate-300" size={32} />
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="font-extrabold text-mono text-indigo-600 text-xs">
                        {batch.batchNo}
                      </td>
                      <td className="font-extrabold text-scms-text">
                        {batch.medicineName || m?.name || `Medicine ID: ${batch.medicineId || batch.medId}`}
                      </td>
                      <td className="font-black text-scms-text text-sm">
                        {batch.quantity} units
                      </td>
                      <td className="font-semibold text-xs text-rose-700">
                        {formatDate(batch.expiryDate)}
                      </td>
                      <td className="text-xs">
                        <div className="font-semibold text-scms-text">{batch.supplierName || "Default Supplier"}</div>
                        <div className="text-scms-muted text-[10px]">{batch.manufacturer || "Generic Labs"}</div>
                      </td>
                      <td>
                        <span className={`text-[9px] font-black border px-2 py-0.5 rounded-full ${
                          String(batch.status).toLowerCase() === "active" ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
                          String(batch.status).toLowerCase() === "quarantined" ? "bg-amber-100 text-amber-800 border-amber-200" :
                          "bg-slate-100 text-slate-800 border-slate-200"
                        }`}>
                          {String(batch.status).toUpperCase()}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => openEdit(batch)}
                            className="btn btn-xs rounded-lg border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                            title="Edit Batch"
                          >
                            <Edit size={12} />
                          </button>
                          <button
                            onClick={() => handleDelete(batch)}
                            className="btn btn-xs rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 border-0"
                            title="Delete Batch"
                          >
                            <Trash2 size={12} />
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
        /* CARD VIEW */
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {batches.map((batch, index) => {
            const rowNo = ((page - 1) * pageSize) + index + 1;
            const m = medicines.find(med => String(med.medicineId || med.id) === String(batch.medicineId || batch.medId));
            return (
              <div
                key={batch.id || batch.batchId}
                className="bg-white border border-scms-border hover:border-indigo-600 rounded-3xl p-5 hover:shadow-lg transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-xs font-black text-scms-muted">No. {rowNo}</span>
                    <span className="text-xs font-black text-indigo-600 font-mono">Batch #{batch.batchNo}</span>
                    <span className={`text-[9px] font-black border px-2.5 py-0.5 rounded-full ${
                      String(batch.status).toLowerCase() === "active" ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
                      "bg-amber-100 text-amber-800 border-amber-200"
                    }`}>
                      {String(batch.status).toUpperCase()}
                    </span>
                  </div>

                  <div className="mt-4 flex gap-4">
                    <div className="relative group w-14 h-14 shrink-0 cursor-zoom-in">
                      {/* Small thumbnail wrapper that clips scale-up */}
                      <div className="w-full h-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center">
                        {m?.imageUrl ? (
                          <img
                            src={m.imageUrl}
                            alt={m.name}
                            className="object-cover w-full h-full transition duration-300 group-hover:scale-125"
                          />
                        ) : (
                          <Pill className="text-slate-400" size={24} />
                        )}
                      </div>
                      {/* Large Zoom Card (Placed outside overflow-hidden) */}
                      <div className="absolute left-16 top-1/2 -translate-y-1/2 hidden group-hover:block z-50 p-1 bg-white border border-scms-border rounded-xl shadow-xl w-36 h-36  pointer-events-none">
                        {m?.imageUrl ? (
                          <img src={m.imageUrl} alt={m?.name} className="object-cover w-full h-full rounded-lg" />
                        ) : (
                          <div className="w-full h-full bg-slate-50 rounded-lg flex items-center justify-center">
                            <Pill className="text-slate-300" size={32} />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="font-black text-scms-text text-sm truncate">
                        {batch.medicineName || m?.name || `Medicine ID: ${batch.medicineId || batch.medId}`}
                      </h4>
                      <p className="text-[10px] text-scms-muted font-bold mt-1">Supplier: {batch.supplierName || "Default Supplier"}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl text-[11px]">
                    <div>
                      <span className="text-slate-500 font-bold block">Remaining Qty</span>
                      <strong className="text-scms-text font-black text-xs">{batch.quantity} units</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block">Expiry Date</span>
                      <strong className="text-rose-700 font-black text-xs">{formatDate(batch.expiryDate)}</strong>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    onClick={() => openEdit(batch)}
                    className="btn btn-xs rounded-lg border-slate-200 bg-white text-slate-700"
                  >
                    Edit Batch
                  </button>
                  <button
                    onClick={() => handleDelete(batch)}
                    className="btn btn-xs rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 border-0"
                  >
                    Delete
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
        label="batches"
        loading={loading}
        onPageChange={setPage}
      />

      {/* --- ADD / EDIT BATCH FORM MODAL --- */}
      {modalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm ">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-lg bg-white rounded-3xl border border-scms-border p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-black text-scms-text flex items-center gap-2">
                <Layers size={20} className="text-scms-primary" />
                {editingBatch ? "Update Batch Record" : "Add Medicine Batch"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-black text-scms-text">
                  Selected Medicine <span className="scms-required">*</span>
                </span>
                <select
                  required
                  disabled={!!editingBatch}
                  className="select select-bordered h-11 rounded-xl text-sm w-full bg-white border-slate-300 scms-select-no-arrow"
                  value={form.medId}
                  onChange={(e) => setForm(p => ({ ...p, medId: e.target.value }))}
                >
                  {medicines.map(m => (
                    <option key={m.medicineId || m.id} value={m.medicineId || m.id}>{m.name}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-black text-scms-text">
                  Batch Number <span className="scms-required">*</span>
                </span>
                <input
                  required
                  placeholder="e.g. BATCH-2026A"
                  className="input input-bordered h-11 rounded-xl text-sm w-full font-mono text-xs"
                  value={form.batchNo}
                  onChange={(e) => setForm(p => ({ ...p, batchNo: e.target.value }))}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-black text-scms-text">
                  Quantity <span className="scms-required">*</span>
                </span>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 500"
                  className="input input-bordered h-11 rounded-xl text-sm w-full font-mono text-xs"
                  value={form.quantity}
                  onChange={(e) => setForm(p => ({ ...p, quantity: e.target.value }))}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-black text-scms-text">
                  Manufacture Date <span className="scms-required">*</span>
                </span>
                <DateInput
                  required
                  className="input input-bordered h-11 rounded-xl text-xs w-full font-mono"
                  value={form.manufactureDate}
                  onChange={(e) => setForm(p => ({ ...p, manufactureDate: e.target.value }))}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-black text-scms-text">
                  Expiry Date <span className="scms-required">*</span>
                </span>
                <DateInput
                  required
                  className="input input-bordered h-11 rounded-xl text-xs w-full font-mono text-rose-700"
                  value={form.expiryDate}
                  onChange={(e) => setForm(p => ({ ...p, expiryDate: e.target.value }))}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-black text-scms-text">Received Date</span>
                <DateInput
                  className="input input-bordered h-11 rounded-xl text-xs w-full font-mono"
                  value={form.receivedDate}
                  onChange={(e) => setForm(p => ({ ...p, receivedDate: e.target.value }))}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-black text-scms-text">Supplier Name</span>
                <input
                  placeholder="e.g. AA Pharma Co."
                  className="input input-bordered h-11 rounded-xl text-sm w-full text-xs"
                  value={form.supplierName}
                  onChange={(e) => setForm(p => ({ ...p, supplierName: e.target.value }))}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-black text-scms-text">Brand / Manufacturer</span>
                <input
                  placeholder="e.g. Pfizer Inc."
                  className="input input-bordered h-11 rounded-xl text-sm w-full text-xs"
                  value={form.manufacturer}
                  onChange={(e) => setForm(p => ({ ...p, manufacturer: e.target.value }))}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-black text-scms-text">Status</span>
                <select
                  className="select select-bordered h-11 rounded-xl text-sm w-full bg-white border-slate-300"
                  value={form.status}
                  onChange={(e) => setForm(p => ({ ...p, status: e.target.value }))}
                >
                  <option value="active">Active</option>
                  <option value="quarantined">Quarantined</option>
                  <option value="expired">Expired</option>
                </select>
              </label>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="scms-btn-primary w-full h-11 font-black text-sm"
            >
              {saving && <span className="loading loading-spinner loading-xs" />}
              Save Batch Record
            </button>
          </form>
          </div>
        </ModalPortal>
      )}

      {/* --- STOCK & EXPIRY ALERTS POPUP MODAL --- */}
      {alertsOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm ">
          <div className="w-full max-w-xl bg-white rounded-3xl border border-scms-border p-6 shadow-2xl relative max-h-[80vh] overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <h3 className="text-lg font-black text-rose-700 flex items-center gap-2">
                <AlertTriangle size={20} className="animate-pulse" />
                Active Stock & Expiry Alerts
              </h3>
              <button
                type="button"
                onClick={() => setAlertsOpen(false)}
                className="text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            {/* Alerts List Container */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {loadingAlerts ? (
                <div className="grid place-items-center h-40">
                  <span className="loading loading-spinner loading-sm text-scms-primary" />
                </div>
              ) : alerts.length === 0 ? (
                <div className="text-center py-10">
                  <span className="text-xs font-bold text-emerald-600 block">✓ No Critical Alerts Found</span>
                  <p className="text-slate-400 text-[11px] mt-1 font-medium">All medicines and active batches are within healthy inventory margins.</p>
                </div>
              ) : (
                alerts.map((alert, idx) => {
                  const isLowStock = alert.alertType === "Low Stock" || alert.alertType === "LowStock";
                  const daysRemaining = getDaysRemaining(alert.expiryDate);
                  return (
                    <div key={idx} className="flex items-start gap-3 p-3.5 rounded-2xl bg-rose-50 border border-rose-100 text-xs">
                      <AlertTriangle className="text-rose-600 mt-0.5 shrink-0" size={16} />
                      <div className="flex-1">
                        <strong className="text-slate-800 font-extrabold">{alert.medicineName}</strong>
                        <p className="text-slate-600 mt-1 font-medium leading-relaxed">
                          {isLowStock ? (
                            <span className="text-amber-700 font-bold">
                              ⚠️ Total stock is critically low: {alert.currentQuantity} units remaining (Threshold: 20).
                            </span>
                          ) : (
                            <span className="text-rose-700 font-bold">
                              ⏳ Batch <span className="font-mono text-[10px]">{alert.batchNo}</span> is expiring on {formatDate(alert.expiryDate)} ({daysRemaining} days remaining).
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <button
              onClick={() => setAlertsOpen(false)}
              className="scms-btn-outline h-10 w-10 p-0 min-w-0 flex items-center justify-center shrink-0"
              aria-label="Close Alerts"
            >
              <X size={18} />
            </button>
          </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}

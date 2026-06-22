import { useState, useEffect } from "react";
import {
  Pill,
  Plus,
  RefreshCcw,
  LayoutGrid,
  List,
  ShieldAlert,
  Edit,
  Trash2,
  Layers,
  Upload,
  Sparkles,
  AlertTriangle,
  X
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import ModalPortal from "../components/ModalPortal";
import PaginationControls from "../components/PaginationControls";
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

export default function MedicinesPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const pageSize = 10;
  
  const [medicines, setMedicines] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState("grid"); // "table" or "grid"
  
  // Search & Filter State
  const [query, setQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // CRUD Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    unitPrice: "",
    categoryId: ""
  });

  const loadCategories = async () => {
    try {
      const res = await medicinesApi.categories();
      setCategories(toArray(res));
    } catch (e) {
      console.error("Failed to load medicine categories", e);
    }
  };

  const loadMedicines = async (pageNum = page) => {
    try {
      setLoading(true);
      const res = await medicinesApi.list({
        query: query.trim() || undefined,
        pageNumber: pageNum,
        pageSize: 10
      });

      if (res) {
        let items = res.data || [];
        
        // Category client-side filter since server list is search-only
        if (selectedCategoryId) {
          items = items.filter(m => String(m.categoryId) === String(selectedCategoryId));
        }

        setMedicines(items);
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages || 1);
          setTotalCount(res.pagination.totalCount || items.length);
        }
      }
    } catch (error) {
      showError("Failed to load medicine catalog.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadMedicines(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, selectedCategoryId]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadMedicines(1);
  };

  const handleQuarantine = async () => {
    const ok = await showConfirm("Are you sure you want to quarantine all expired medicine batches?");
    if (!ok) return;
    try {
      await medicinesApi.quarantineExpired();
      await showAlert("All expired batches have been quarantined successfully.");
      loadMedicines(page);
    } catch (e) {
      showError("Failed to quarantine expired batches.");
    }
  };

  const openCreate = () => {
    setEditingMedicine(null);
    setImageFile(null);
    setForm({
      name: "",
      description: "",
      unitPrice: "",
      categoryId: ""
    });
    setModalOpen(true);
  };

  const openEdit = (med) => {
    setEditingMedicine(med);
    setImageFile(null);
    setForm({
      name: med.name || "",
      description: med.description || "",
      unitPrice: med.unitPrice || "",
      categoryId: med.categoryId || ""
    });
    setModalOpen(true);
  };

  const handleDelete = async (med) => {
    const ok = await showConfirm(`Are you sure you want to delete "${med.name}" from catalog?`);
    if (!ok) return;
    try {
      await medicinesApi.remove(med.medicineId || med.id);
      await showAlert("Medicine deleted successfully.");
      loadMedicines(page);
    } catch (e) {
      showError("Failed to delete medicine.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.unitPrice) {
      showAlert("Please fill in required fields.");
      return;
    }

    try {
      setSaving(true);
      const dataPayload = new FormData();
      dataPayload.append("name", form.name.trim());
      dataPayload.append("description", form.description.trim());
      dataPayload.append("unitPrice", form.unitPrice);
      if (form.categoryId) {
        dataPayload.append("categoryId", form.categoryId);
      }
      if (imageFile) {
        dataPayload.append("image", imageFile);
      }

      if (editingMedicine) {
        await medicinesApi.update(editingMedicine.medicineId || editingMedicine.id, dataPayload);
        await showAlert("Medicine updated successfully.");
      } else {
        await medicinesApi.create(dataPayload);
        await showAlert("New medicine registered successfully.");
      }

      setModalOpen(false);
      setPage(1);
      loadMedicines(1);
    } catch (error) {
      showError(error?.response?.data?.message || "Failed to save medicine catalog record.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 ">
      {/* Page Header */}
      <PageHeader
        title={t.medicines}
        subtitle="Complete catalog visibility, categories, stock, and smart batch tracking."
        actions={
          <div className="flex gap-2">
            <button
              onClick={handleQuarantine}
              className="scms-btn-outline border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800"
              title="Move expired batches to quarantine status"
            >
              <ShieldAlert size={16} />
              Quarantine Expired
            </button>
            <button
              onClick={() => navigate("/app/medicines/batches")}
              className="scms-btn-outline bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-extrabold"
            >
              <Layers size={16} />
              Manage Batches
            </button>
            <button onClick={openCreate} className="scms-btn-primary">
              <Plus size={16} />
              Add Medicine
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
          placeholder="Search medicine catalog..."
          submitLabel={t.search}
          className="w-full max-w-2xl flex-1"
        />

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Category Filter */}
          <div className="relative w-full sm:w-56">
            <select
              className="select select-bordered h-11 rounded-xl text-xs font-semibold w-full bg-white border-scms-border"
              value={selectedCategoryId}
              onChange={(e) => { setSelectedCategoryId(e.target.value); setPage(1); }}
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
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
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition ${viewMode === "grid" ? "bg-white text-scms-primary shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              title="Grid Cards view"
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      {loading ? (
        <div className="grid place-items-center h-60 bg-white rounded-2xl border border-scms-border">
          <span className="loading loading-spinner loading-md text-scms-primary" />
        </div>
      ) : medicines.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-scms-border">
          <Pill size={48} className="text-slate-300 mb-2 animate-bounce" />
          <p className="text-sm font-bold text-scms-muted">No medicines found matching the filters.</p>
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
                  <th>Medicine Name</th>
                  <th>Category</th>
                  <th>Unit Price</th>
                  <th>Stock In Hand</th>
                  <th>Alerts</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {medicines.map((med, index) => {
                  const rowNo = ((page - 1) * pageSize) + index + 1;
                  const hasAlert = med.hasLowStockWarning || med.hasNearExpiryWarning;
                  return (
                    <tr key={med.medicineId || med.id} className="hover:bg-slate-50/70 transition">
                      <td className="font-black text-xs text-scms-muted">{rowNo}</td>
                      <td>
                        <div className="relative group w-12 h-12 shrink-0 cursor-zoom-in">
                          {/* Small thumbnail wrapper that clips scale-up */}
                          <div className="w-full h-full rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center">
                            {med.imageUrl ? (
                              <img
                                src={med.imageUrl}
                                alt={med.name}
                                className="object-cover w-full h-full transition duration-300 group-hover:scale-125"
                              />
                            ) : (
                              <Pill className="text-slate-400" size={20} />
                            )}
                          </div>
                          {/* Large Zoom Popover on Hover (Placed outside overflow-hidden) */}
                          <div className="absolute left-16 top-1/2 -translate-y-1/2 hidden group-hover:block z-50 p-1.5 bg-white border border-scms-border rounded-2xl shadow-2xl w-44 h-44  pointer-events-none">
                            {med.imageUrl ? (
                              <img src={med.imageUrl} alt={med.name} className="object-cover w-full h-full rounded-xl" />
                            ) : (
                              <div className="w-full h-full bg-slate-50 rounded-xl flex items-center justify-center">
                                <Pill className="text-slate-300" size={48} />
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="font-extrabold text-scms-text">
                        <div>
                          <div>{med.name}</div>
                          {med.description && <div className="text-[10px] text-scms-muted truncate max-w-xs mt-0.5 font-medium">{med.description}</div>}
                        </div>
                      </td>
                      <td className="font-semibold text-xs text-slate-500">
                        {med.categoryName || "Uncategorized"}
                      </td>
                      <td className="font-mono font-bold text-scms-text text-sm">
                        MMK {Number(med.unitPrice).toLocaleString()}
                      </td>
                      <td className="font-black">
                        <span className={med.totalStock < 20 ? "text-amber-600" : "text-emerald-600"}>
                          {med.totalStock ?? 0} units
                        </span>
                      </td>
                      <td>
                        {hasAlert ? (
                          <div className="flex gap-1">
                            {med.hasLowStockWarning && (
                              <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-200">
                                LOW STOCK
                              </span>
                            )}
                            {med.hasNearExpiryWarning && (
                              <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-rose-200">
                                EXPIRE SOON
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-emerald-200">
                            STABLE
                          </span>
                        )}
                      </td>
                      <td className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => openEdit(med)}
                            className="btn btn-xs rounded-lg border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                            title="Edit Medicine details"
                          >
                            <Edit size={12} />
                          </button>
                          <button
                            onClick={() => handleDelete(med)}
                            className="btn btn-xs rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 border-0"
                            title="Remove Medicine"
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
        /* GRID CARDS VIEW */
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {medicines.map((med, index) => {
            const rowNo = ((page - 1) * pageSize) + index + 1;
            const hasAlert = med.hasLowStockWarning || med.hasNearExpiryWarning;
            return (
              <div
                key={med.medicineId || med.id}
                className="bg-white border border-scms-border hover:border-indigo-600 rounded-3xl p-5 hover:shadow-lg transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex gap-4">
                    <span className="text-[10px] font-black text-scms-muted">No. {rowNo}</span>
                    {/* Zoomable Image Container */}
                    <div className="relative group w-20 h-20 shrink-0 cursor-zoom-in">
                      {/* Small thumbnail wrapper that clips scale-up */}
                      <div className="w-full h-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center shadow-sm">
                        {med.imageUrl ? (
                          <img
                            src={med.imageUrl}
                            alt={med.name}
                            className="object-cover w-full h-full transition duration-300 group-hover:scale-125"
                          />
                        ) : (
                          <Pill className="text-slate-400" size={32} />
                        )}
                      </div>
                      {/* Large zoom preview popup (Placed outside overflow-hidden) */}
                      <div className="absolute left-24 top-1/2 -translate-y-1/2 hidden group-hover:block z-50 p-2 bg-white border border-scms-border rounded-3xl shadow-2xl w-48 h-48  pointer-events-none">
                        {med.imageUrl ? (
                          <img src={med.imageUrl} alt={med.name} className="object-cover w-full h-full rounded-2xl" />
                        ) : (
                          <div className="w-full h-full bg-slate-50 rounded-2xl flex items-center justify-center">
                            <Pill className="text-slate-300" size={56} />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600">
                        {med.categoryName || "Uncategorized"}
                      </span>
                      <h4 className="font-black text-scms-text text-md mt-0.5 truncate">{med.name}</h4>
                      <p className="text-xs text-scms-muted line-clamp-2 mt-1 font-medium">{med.description || "No medicine description provided."}</p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-4 bg-slate-50/70 border border-slate-100 p-3.5 rounded-2xl text-xs">
                    <div>
                      <span className="text-slate-500 font-bold block">Unit Price</span>
                      <strong className="text-scms-text text-sm font-mono">MMK {Number(med.unitPrice).toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block">Stock Available</span>
                      <strong className={`text-sm ${med.totalStock < 20 ? "text-amber-600" : "text-emerald-600"}`}>
                        {med.totalStock ?? 0} units
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex gap-1">
                    {hasAlert ? (
                      <>
                        {med.hasLowStockWarning && (
                          <span className="bg-amber-50 text-amber-700 text-[9px] font-black px-2 py-0.5 rounded-full border border-amber-100">
                            LOW STOCK
                          </span>
                        )}
                        {med.hasNearExpiryWarning && (
                          <span className="bg-rose-50 text-rose-700 text-[9px] font-black px-2 py-0.5 rounded-full border border-rose-100">
                            EXPIRED
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="bg-emerald-50 text-emerald-700 text-[9px] font-black px-2 py-0.5 rounded-full border border-emerald-100">
                        STABLE INVENTORY
                      </span>
                    )}
                  </div>

                  <div className="flex gap-1.5">
                    <button
                      onClick={() => openEdit(med)}
                      className="btn btn-sm btn-ghost btn-square rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(med)}
                      className="btn btn-sm btn-ghost btn-square rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100"
                    >
                      <Trash2 size={14} />
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
        label="items"
        loading={loading}
        onPageChange={setPage}
      />

      {/* --- ADD / EDIT MEDICINE FORM MODAL --- */}
      {modalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm ">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md bg-white rounded-3xl border border-scms-border p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-black text-scms-text flex items-center gap-2">
                <Pill size={20} className="text-scms-primary" />
                {editingMedicine ? "Edit Medicine Details" : "Register New Medicine"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-xs font-black text-scms-text">
                  Medicine Name <span className="scms-required">*</span>
                </span>
                <input
                  required
                  placeholder="e.g. Paracetamol 500mg"
                  className="input input-bordered h-11 rounded-xl text-sm w-full"
                  value={form.name}
                  onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-black text-scms-text">
                  Unit Price (MMK) <span className="scms-required">*</span>
                </span>
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="e.g. 500"
                  className="input input-bordered h-11 rounded-xl text-sm w-full font-mono"
                  value={form.unitPrice}
                  onChange={(e) => setForm(p => ({ ...p, unitPrice: e.target.value }))}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-black text-scms-text">Medicine Category</span>
                <select
                  className="select select-bordered h-11 rounded-xl text-sm w-full bg-white border-slate-300"
                  value={form.categoryId}
                  onChange={(e) => setForm(p => ({ ...p, categoryId: e.target.value }))}
                >
                  <option value="">Select Category</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-black text-scms-text">Medicine Description</span>
                <textarea
                  placeholder="Usage instructions, side effects warnings, etc."
                  className="textarea textarea-bordered rounded-xl text-sm w-full min-h-16"
                  value={form.description}
                  onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-black text-scms-text">Upload Medicine Image</span>
                <input
                  id="medicine-image-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <label
                  htmlFor="medicine-image-upload"
                  className="scms-btn-outline h-11 flex items-center justify-center gap-2"
                >
                  <Upload size={16} />
                  Attach Image
                  {imageFile && (
                    <span className="ml-auto max-w-[170px] truncate text-left text-scms-muted">{imageFile.name}</span>
                  )}
                </label>
              </label>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="scms-btn-primary w-full h-11 font-black text-sm"
            >
              {saving && <span className="loading loading-spinner loading-xs" />}
              Save Medicine Info
            </button>
          </form>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}

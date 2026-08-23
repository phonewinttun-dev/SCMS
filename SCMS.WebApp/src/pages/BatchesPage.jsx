import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayersIcon,
  PlusIcon,
  GridIcon,
  ListBulletIcon,
  Pencil1Icon,
  TrashIcon,
  Cross2Icon,
  ChevronLeftIcon,
  MagnifyingGlassIcon,
} from "@radix-ui/react-icons";
import PageHeader from "../components/PageHeader";
import PaginationControls from "../components/PaginationControls";
import DateInput from "../components/DateInput";
import SegmentedControl from "../components/SegmentedControl";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { medicinesApi } from "../services/scmsApi";
import { showError, showConfirm, showSuccess } from "../services/dialogs";
import { useLanguage } from "../context/LanguageContext";
import { sanitizeText, validateNumberRange } from "../utils/validation";
import { formatDate } from "../utils/format";
import useScrollLock from "../hooks/useScrollLock";
import ModalPortal from "../components/ModalPortal";

const toArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.result)) return data.result;
  return [];
};

export default function BatchesPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const pageSize = 8;
  const [batches, setBatches] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [selectedMedId, setSelectedMedId] = useState("");
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState("table");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);

  useScrollLock(modalOpen);
  const [form, setForm] = useState({
    medicineId: "",
    batchNumber: "",
    quantity: "",
    expiryDate: "",
    manufactureDate: "",
    supplierName: "",
  });

  const loadBatches = async (pageNum = page, currentQuery = query) => {
    try {
      setLoading(true);
      const trimmed = (currentQuery || "").trim();
      const res = trimmed
        ? await medicinesApi.searchBatches({
            query: trimmed,
            medicineId: selectedMedId ? Number(selectedMedId) : undefined,
            pageNumber: pageNum,
            pageSize,
          })
        : await medicinesApi.batches({
            pageNumber: pageNum,
            pageSize,
            medicineId: selectedMedId ? Number(selectedMedId) : undefined,
          });

      if (res) {
        setBatches(toArray(res));
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages || 1);
          setTotalCount(res.pagination.totalCount || 0);
        }
      }
    } catch (error) {
      console.error("Batches loading error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    medicinesApi.list({ pageSize: 100 }).then((res) => {
      setMedicines(toArray(res));
    });
  }, []);

  useEffect(() => {
    loadBatches(page, query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, selectedMedId]);

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    setPage(1);
    loadBatches(1, query);
  };

  const openCreateModal = () => {
    setEditingBatch(null);
    setForm({
      medicineId: selectedMedId || "",
      batchNumber: `B-${Date.now().toString().slice(-4)}`,
      quantity: "100",
      expiryDate: "",
      manufactureDate: new Date().toISOString().slice(0, 10),
      supplierName: "",
    });
    setModalOpen(true);
  };

  const openEditModal = (batch) => {
    setEditingBatch(batch);
    setForm({
      medicineId: batch.medicineId || "",
      batchNumber: batch.batchNumber || batch.batchNo || "",
      quantity: batch.quantity || batch.currentQuantity || "",
      expiryDate: batch.expiryDate ? String(batch.expiryDate).slice(0, 10) : "",
      manufactureDate: batch.manufactureDate ? String(batch.manufactureDate).slice(0, 10) : "",
      supplierName: batch.supplierName || "",
    });
    setModalOpen(true);
  };

  const handleSaveBatch = async (e) => {
    e.preventDefault();
    if (!form.medicineId) {
      showError("Please select a medicine for this batch.", "Medicine Required");
      return;
    }

    const cleanBatchNo = sanitizeText(form.batchNumber);
    if (!cleanBatchNo || cleanBatchNo.length < 2) {
      showError("Batch number / Lot code is required (at least 2 characters).", "Invalid Batch Number");
      return;
    }

    const qtyValidation = validateNumberRange(form.quantity, {
      label: "Batch Quantity",
      min: 1,
      max: 10000000,
      isInteger: true,
      isRequired: true,
    });
    if (!qtyValidation.isValid) {
      showError(qtyValidation.error, "Invalid Quantity");
      return;
    }

    if (!form.expiryDate) {
      showError("Batch expiry date is required.", "Expiry Date Required");
      return;
    }

    const expDate = new Date(form.expiryDate);
    if (isNaN(expDate.getTime())) {
      showError("Invalid expiry date format.", "Invalid Expiry Date");
      return;
    }

    if (form.manufactureDate) {
      const mfgDate = new Date(form.manufactureDate);
      if (!isNaN(mfgDate.getTime()) && mfgDate > expDate) {
        showError("Manufacture date cannot be after the expiry date.", "Invalid Date Sequence");
        return;
      }
    }

    try {
      setSaving(true);
      const payload = {
        medicineId: Number(form.medicineId),
        batchNumber: cleanBatchNo,
        quantity: qtyValidation.value,
        expiryDate: `${form.expiryDate}T00:00:00`,
        manufactureDate: form.manufactureDate ? `${form.manufactureDate}T00:00:00` : null,
        supplierName: sanitizeText(form.supplierName) || undefined,
      };

      if (editingBatch) {
        const id = editingBatch.id || editingBatch.batchId;
        await medicinesApi.updateBatch(id, payload);
        showSuccess("Batch updated successfully.");
      } else {
        await medicinesApi.createBatch(payload);
        showSuccess("New batch added to inventory.");
      }

      setModalOpen(false);
      loadBatches(page);
    } catch (err) {
      showError(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e, batch) => {
    e.stopPropagation();
    const confirmed = await showConfirm(
      `Are you sure you want to delete batch "${batch.batchNumber || batch.batchNo}"?`,
      "Delete Batch"
    );
    if (!confirmed) return;

    try {
      setLoading(true);
      const id = batch.id || batch.batchId;
      await medicinesApi.deleteBatch(id);
      showSuccess("Batch removed.");
      loadBatches(page);
    } catch (err) {
      showError(err, "Cannot Delete Batch");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader
        title={t.batches}
        subtitle="Medicine batch lots, manufacture & expiration tracking, and supplier records."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/app/medicines")}
              className="scms-btn-outline flex items-center gap-1.5 text-xs font-bold btn-target shadow-xs"
            >
              <ChevronLeftIcon className="w-4 h-4 shrink-0" />
              <span>Back to Medicines</span>
            </button>
            <button
              onClick={openCreateModal}
              className="scms-btn-primary flex items-center gap-1.5 text-xs font-bold btn-target shadow-xs"
            >
              <PlusIcon className="w-4 h-4 shrink-0" />
              <span>Add Batch</span>
            </button>
          </div>
        }
      />

      {/* Filter & Layout Switcher */}
      <div className="relative z-10 flex flex-col sm:flex-row justify-between items-center gap-4 rounded-3xl border border-border/80 bg-card/90 backdrop-blur-md p-4 shadow-scms">
        <form onSubmit={handleSearch} className="flex-1 w-full max-w-sm flex items-center gap-2">
          <Input
            type="text"
            startIcon={<MagnifyingGlassIcon className="w-4 h-4 shrink-0" />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onClear={() => {
              setQuery("");
              loadBatches(1, "");
            }}
            placeholder="Search batches by number or supplier..."
            className="flex-1"
          />
          <button type="submit" className="scms-btn-search">
            <span>{t.search || "Search"}</span>
          </button>
        </form>

        <div className="w-full sm:w-auto min-w-[220px]">
          <Select
            value={selectedMedId}
            onChange={(val) => {
              setSelectedMedId(val);
              setPage(1);
            }}
            placeholder="All Medicines"
            options={[
              { value: "", label: "All Medicines" },
              ...medicines.map((m) => ({
                value: String(m.id || m.medicineId),
                label: m.name || m.medicineName,
              })),
            ]}
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

      {/* Main Table / Grid View */}
      {loading ? (
        <div className="grid place-items-center h-64 rounded-3xl border border-border/80 bg-card">
          <span className="loading loading-spinner loading-md text-orange-600 dark:text-orange-400" />
        </div>
      ) : batches.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-3xl border border-dashed border-border/80 bg-card">
          <LayersIcon className="w-12 h-12 text-muted-foreground/40 mb-2 animate-pulse" />
          <h3 className="text-base font-bold text-foreground">No Batches Cataloged</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            Add a new batch of pharmaceuticals to monitor expiry dates and stock levels.
          </p>
        </div>
      ) : viewMode === "table" ? (
        <div className="overflow-hidden rounded-3xl border border-border/80 bg-card/95 backdrop-blur-md shadow-scms">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="border-b border-border/80 bg-secondary/50 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3.5 w-12 text-center">No.</th>
                  <th className="px-4 py-3.5">Batch Number</th>
                  <th className="px-4 py-3.5">Medicine</th>
                  <th className="px-4 py-3.5">Quantity</th>
                  <th className="px-4 py-3.5">Expiry Date</th>
                  <th className="px-4 py-3.5">Supplier</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {batches.map((b, index) => (
                  <tr
                    key={b.id || b.batchId || index}
                    className="hover:bg-secondary/60 transition-colors"
                  >
                    <td className="px-4 py-3.5 text-center font-mono text-xs text-muted-foreground font-semibold">
                      {(page - 1) * pageSize + index + 1}
                    </td>
                    <td className="px-4 py-3.5 font-mono font-bold text-orange-600 dark:text-orange-400">
                      {b.batchNumber || b.batchNo}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-foreground">
                      {b.medicineName || b.medicine?.name || `Medicine #${b.medicineId}`}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs font-semibold text-foreground">
                      {b.quantity || b.currentQuantity || 0} units
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">
                      {formatDate(b.expiryDate)}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">
                      {b.supplierName || "-"}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(b)}
                          className="scms-btn-icon"
                          title="Edit Batch"
                          aria-label="Edit Batch"
                        >
                          <Pencil1Icon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, b)}
                          className="scms-btn-icon-danger"
                          title="Delete Batch"
                          aria-label="Delete Batch"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Card Grid View */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {batches.map((b, index) => (
            <div
              key={b.id || b.batchId || index}
              className="rounded-3xl border border-border/80 bg-card/95 p-5 shadow-scms hover:shadow-scms-raised transition space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-orange-600 dark:text-orange-400">
                  {b.batchNumber || b.batchNo}
                </span>
                <span className="font-mono text-xs font-bold text-foreground bg-secondary px-2.5 py-0.5 rounded-full border border-border/80">
                  {b.quantity || b.currentQuantity || 0} qty
                </span>
              </div>

              <div>
                <h3 className="font-bold text-foreground">
                  {b.medicineName || b.medicine?.name || `Medicine #${b.medicineId}`}
                </h3>
                <p className="text-xs text-muted-foreground">Supplier: {b.supplierName || "Direct"}</p>
              </div>

              <div className="text-xs text-muted-foreground font-mono">
                Expires: {formatDate(b.expiryDate)}
              </div>

              <div className="pt-2 border-t border-border/70 flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => openEditModal(b)}
                  className="scms-btn-icon"
                  title="Edit Batch"
                >
                  <Pencil1Icon className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => handleDelete(e, b)}
                  className="scms-btn-icon-danger"
                  title="Delete Batch"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <PaginationControls
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        label="batches"
        onPageChange={setPage}
      />

      {/* Create / Edit Batch Modal */}
      <ModalPortal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <div className="w-full max-w-md rounded-3xl border border-border/80 bg-card text-card-foreground p-6 shadow-scms-modal space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingBatch ? "Edit Batch Record" : "Add Inventory Batch"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <Cross2Icon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBatch} className="space-y-3.5 text-xs">
              <div>
                <span className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                  Select Medicine <span className="text-rose-500">*</span>
                </span>
                <Select
                  value={String(form.medicineId || "")}
                  onChange={(val) => setForm({ ...form, medicineId: val })}
                  placeholder="Select Medicine"
                  options={medicines.map((m) => ({
                    value: String(m.id || m.medicineId),
                    label: m.name || m.medicineName,
                  }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                    Batch Number <span className="text-rose-500">*</span>
                  </span>
                  <input
                    className="scms-input w-full text-xs font-mono"
                    value={form.batchNumber}
                    onChange={(e) => setForm({ ...form, batchNumber: e.target.value })}
                    placeholder="e.g. B-2024"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                    Quantity <span className="text-rose-500">*</span>
                  </span>
                  <input
                    type="number"
                    className="scms-input w-full text-xs font-mono"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    placeholder="e.g. 500"
                    required
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                    Expiry Date
                  </span>
                  <DateInput
                    className="scms-input w-full text-xs font-mono"
                    value={form.expiryDate}
                    onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                    Manufacture Date
                  </span>
                  <DateInput
                    className="scms-input w-full text-xs font-mono"
                    value={form.manufactureDate}
                    onChange={(e) => setForm({ ...form, manufactureDate: e.target.value })}
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                  Supplier / Distributor Name
                </span>
                <input
                  className="scms-input w-full text-xs"
                  value={form.supplierName}
                  onChange={(e) => setForm({ ...form, supplierName: e.target.value })}
                  placeholder="e.g. Mega Lifesciences"
                />
              </label>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="scms-btn-outline text-xs"
                >
                  {t.cancel}
                </button>
                <button type="submit" disabled={saving} className="scms-btn-primary text-xs">
                  {saving ? <span className="loading loading-spinner loading-xs" /> : t.save}
                </button>
              </div>
            </form>
          </div>
      </ModalPortal>
    </div>
  );
}

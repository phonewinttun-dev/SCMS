import { useState, useEffect } from "react";
import {
  Activity,
  Plus,
  RefreshCcw,
  LayoutGrid,
  List,
  FolderOpen,
  Edit,
  Trash2,
  FileText,
  Trash,
  X,
  Pill
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import ModalPortal from "../components/ModalPortal";
import PaginationControls from "../components/PaginationControls";
import SearchForm from "../components/SearchForm";
import { diseasesApi, prescriptionsApi, medicinesApi } from "../services/scmsApi";
import { showAlert, showError, showConfirm } from "../services/dialogs";
import { useLanguage } from "../context/LanguageContext";
import { calculateQuantity, commonDosageValues, dosageOptions } from "../utils/clinical";

const toArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.result)) return data.result;
  return [];
};

export default function DiseasesPage() {
  const { t } = useLanguage();
  const pageSize = 10;

  const [diseases, setDiseases] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState("table"); // "table" or "card"
  
  // Search & Filter State
  const [query, setQuery] = useState("");

  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // CRUD Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDisease, setEditingDisease] = useState(null);
  const [form, setForm] = useState({
    name: "",
    description: ""
  });

  // Template Management Drawer / Modal State
  const [templateDrawerOpen, setTemplateDrawerOpen] = useState(false);
  const [selectedDisease, setSelectedDisease] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // New Template Form inside Drawer
  const [newTemplateName, setNewTemplateName] = useState("");
  const [templateItems, setTemplateItems] = useState([]);
  const [selectedMedicineId, setSelectedMedicineId] = useState("");
  const [dosage, setDosage] = useState("Twice daily");
  const [days, setDays] = useState(5);
  const [quantity, setQuantity] = useState(10);
  const [instruction, setInstruction] = useState("After meal");
  const [savingTemplate, setSavingTemplate] = useState(false);

  const loadMedicines = async () => {
    try {
      const res = await medicinesApi.list({ pageSize: 100 });
      setMedicines(toArray(res));
    } catch (e) {
      console.error("Failed to load medicines", e);
    }
  };

  const loadDiseases = async (pageNum = page) => {
    try {
      setLoading(true);
      const res = await diseasesApi.list({
        query: query.trim() || undefined,
        pageNumber: pageNum,
        pageSize: 10
      });

      if (res) {
        setDiseases(toArray(res));
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages || 1);
          setTotalCount(res.pagination.totalCount || toArray(res).length);
        }
      }
    } catch (error) {
      showError("Failed to fetch diseases data.");
    } finally {
      setLoading(false);
    }
  };

  const loadTemplatesForDisease = async (disease) => {
    if (!disease) return;
    try {
      setLoadingTemplates(true);
      const diseaseId = disease.diseaseId || disease.id;
      const res = await prescriptionsApi.templates({ diseaseId });
      setTemplates(toArray(res));
    } catch (e) {
      console.error("Failed to load disease prescription templates", e);
    } finally {
      setLoadingTemplates(false);
    }
  };

  useEffect(() => {
    loadMedicines();
    loadDiseases(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadDiseases(1);
  };

  const openCreate = () => {
    setEditingDisease(null);
    setForm({ name: "", description: "" });
    setModalOpen(true);
  };

  const openEdit = (e, d) => {
    e.stopPropagation();
    setEditingDisease(d);
    setForm({
      name: d.name || d.diseaseName || "",
      description: d.description || ""
    });
    setModalOpen(true);
  };

  const handleDelete = async (e, d) => {
    e.stopPropagation();
    const ok = await showConfirm(`Are you sure you want to delete "${d.name || d.diseaseName}"?`);
    if (!ok) return;

    try {
      await diseasesApi.remove(d.diseaseId || d.id);
      await showAlert("Disease deleted successfully.");
      loadDiseases(page);
    } catch (error) {
      showError("Failed to delete disease record.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    try {
      setSaving(true);
      const payload = {
        name: form.name.trim(),
        description: form.description.trim()
      };

      if (editingDisease) {
        payload.id = editingDisease.diseaseId || editingDisease.id;
        await diseasesApi.update(payload);
        await showAlert("Disease details updated successfully.");
      } else {
        await diseasesApi.create(payload);
        await showAlert("New disease registered successfully.");
      }

      setModalOpen(false);
      setPage(1);
      loadDiseases(1);
    } catch (error) {
      showError(error?.response?.data?.message || "Failed to save disease record.");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenTemplates = (d) => {
    setSelectedDisease(d);
    setNewTemplateName("");
    setTemplateItems([]);
    setTemplateDrawerOpen(true);
    loadTemplatesForDisease(d);
  };

  // Add Item to Template local state
  const addTemplateItem = () => {
    if (!selectedMedicineId) return;
    const med = medicines.find(m => String(m.medicineId || m.id) === String(selectedMedicineId));
    if (!med) return;

    if (templateItems.some(item => item.medicineId === med.medicineId)) {
      showAlert("Medicine already added to template.");
      return;
    }

    setTemplateItems(prev => [
      ...prev,
      {
        medicineId: med.medicineId || med.id,
        medicineName: med.name,
        dosage,
        days: Number(days),
        quantity: Number(quantity),
        instruction
      }
    ]);
  };

  const removeTemplateItem = (medId) => {
    setTemplateItems(prev => prev.filter(i => i.medicineId !== medId));
  };

  const saveTemplateSubmit = async (e) => {
    e.preventDefault();
    if (!newTemplateName.trim()) {
      showAlert("Please enter a template name.");
      return;
    }
    if (templateItems.length === 0) {
      showAlert("Please add at least one medicine to the template.");
      return;
    }

    try {
      setSavingTemplate(true);
      await prescriptionsApi.saveTemplate({
        name: newTemplateName.trim(),
        diseaseId: Number(selectedDisease.diseaseId || selectedDisease.id),
        items: templateItems.map(item => ({
          medicineId: item.medicineId,
          dosage: item.dosage,
          days: item.days,
          quantity: item.quantity,
          instruction: item.instruction
        }))
      });

      setNewTemplateName("");
      setTemplateItems([]);
      await showAlert("Prescription template saved successfully!");
      loadTemplatesForDisease(selectedDisease);
    } catch (err) {
      showError(err?.response?.data?.message || "Failed to save prescription template.");
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    const ok = await showConfirm("Are you sure you want to delete this template?");
    if (!ok) return;

    try {
      await prescriptionsApi.deleteTemplate(templateId);
      await showAlert("Prescription template deleted.");
      loadTemplatesForDisease(selectedDisease);
    } catch (e) {
      showError("Failed to delete template.");
    }
  };

  return (
    <div className="space-y-6 ">
      {/* Page Header */}
      <PageHeader
        title={t.diseases}
        subtitle="Diagnosis dictionary, disease indexes, and linked prescription templates."
        actions={
          <button onClick={openCreate} className="scms-btn-primary">
            <Plus size={16} />
            Add Disease
          </button>
        }
      />

      {/* Advanced Filters */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white border border-scms-border rounded-2xl p-4 shadow-sm">
        <SearchForm
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onSubmit={handleSearchSubmit}
          placeholder="Search diseases catalog..."
          submitLabel={t.search}
          className="w-full max-w-2xl flex-1"
        />

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
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

      {/* Main content listing */}
      {loading ? (
        <div className="grid place-items-center h-60 bg-white rounded-2xl border border-scms-border">
          <span className="loading loading-spinner loading-md text-scms-primary" />
        </div>
      ) : diseases.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-scms-border">
          <Activity size={48} className="text-slate-300 mb-2 animate-pulse" />
          <p className="text-sm font-bold text-scms-muted">No diseases registered in database.</p>
        </div>
      ) : viewMode === "table" ? (
        /* TABLE VIEW */
        <div className="scms-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full font-sans">
              <thead className="bg-[#F9FAFB] text-xs uppercase text-scms-muted">
                <tr>
                  <th>No.</th>
                  <th>Disease Name</th>
                  <th>Clinical Description</th>
                  <th className="text-right">Templates & Actions</th>
                </tr>
              </thead>
              <tbody>
                {diseases.map((d, index) => {
                  const rowNo = ((page - 1) * pageSize) + index + 1;
                  return (
                  <tr
                    key={d.diseaseId || d.id}
                    onClick={() => handleOpenTemplates(d)}
                    className="hover:bg-slate-50/70 cursor-pointer transition"
                  >
                    <td className="font-black text-xs text-scms-muted">{rowNo}</td>
                    <td className="font-extrabold text-scms-text text-sm">
                      {d.name || d.diseaseName}
                    </td>
                    <td className="text-xs text-scms-muted max-w-lg truncate font-medium">
                      {d.description || "No clinical description loaded."}
                    </td>
                    <td className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenTemplates(d)}
                          className="btn btn-xs rounded-lg bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 flex items-center gap-1 font-black"
                          title="Prescription Templates"
                        >
                          <FileText size={12} />
                          Templates
                        </button>
                        <button
                          onClick={(e) => openEdit(e, d)}
                          className="btn btn-xs rounded-lg border-slate-200 bg-white text-slate-700"
                        >
                          <Edit size={12} />
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, d)}
                          className="btn btn-xs rounded-lg bg-rose-50 border-0 text-rose-600 hover:bg-rose-100"
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
          {diseases.map((d, index) => {
            const rowNo = ((page - 1) * pageSize) + index + 1;
            return (
            <div
              key={d.diseaseId || d.id}
              onClick={() => handleOpenTemplates(d)}
              className="bg-white border border-scms-border hover:border-scms-primary rounded-3xl p-5 hover:shadow-lg cursor-pointer transition flex flex-col justify-between"
            >
              <div>
                <div className="grid h-10 w-10 place-items-center bg-scms-primaryLight text-scms-primary rounded-2xl">
                  <Activity size={20} />
                </div>
                <span className="mt-2 inline-block text-[10px] font-black text-scms-muted">No. {rowNo}</span>
                <h4 className="font-black text-scms-text text-md mt-4">{d.name || d.diseaseName}</h4>
                <p className="text-xs text-scms-muted line-clamp-3 mt-2 font-medium leading-relaxed">
                  {d.description || "No clinical description available for this catalog entry."}
                </p>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-100 flex justify-between items-center" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => handleOpenTemplates(d)}
                  className="btn btn-sm btn-ghost rounded-xl text-xs font-black text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
                >
                  <FileText size={14} />
                  Manage Templates
                </button>

                <div className="flex gap-1">
                  <button
                    onClick={(e) => openEdit(e, d)}
                    className="btn btn-sm btn-ghost btn-square rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100"
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, d)}
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
        label="diseases"
        loading={loading}
        onPageChange={setPage}
      />

      {/* --- ADD / EDIT DISEASE MODAL --- */}
      {modalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm ">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md bg-white rounded-3xl border border-scms-border p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-black text-scms-text flex items-center gap-2">
                <Activity size={20} className="text-scms-primary" />
                {editingDisease ? "Edit Diagnosis details" : "Add Diagnosis Index"}
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
                  Disease/Diagnosis Name <span className="scms-required">*</span>
                </span>
                <input
                  required
                  placeholder="e.g. Essential Hypertension"
                  className="input input-bordered h-11 rounded-xl text-sm w-full"
                  value={form.name}
                  onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-black text-scms-text">Clinical Description</span>
                <textarea
                  placeholder="Clinical diagnostic standards, symptoms list, ICD keys..."
                  className="textarea textarea-bordered rounded-xl text-sm w-full min-h-24"
                  value={form.description}
                  onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="scms-btn-primary w-full h-11 font-black text-sm"
            >
              {saving && <span className="loading loading-spinner loading-xs" />}
              Save Disease Index
            </button>
          </form>
          </div>
        </ModalPortal>
      )}

      {/* --- CLINICAL PRESCRIPTION TEMPLATE Drawer/Modal (Redesigned as Centered Side-by-Side Modal) --- */}
      {templateDrawerOpen && selectedDisease && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm ">
          <div className="w-full max-w-5xl bg-white rounded-3xl border border-scms-border p-6 shadow-2xl relative max-h-[90vh] overflow-hidden flex flex-col justify-between font-sans">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="text-md font-black text-scms-text flex items-center gap-2">
                  <FolderOpen size={18} className="text-indigo-600" />
                  Prescription Templates
                </h3>
                <span className="text-xs font-semibold text-scms-muted">
                  Diagnosis: <strong className="text-scms-text font-black">{selectedDisease.name || selectedDisease.diseaseName}</strong>
                </span>
              </div>
              <button
                onClick={() => setTemplateDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Split Grid Content pane */}
            <div className="flex-grow overflow-y-auto py-5 grid gap-8 md:grid-cols-2 min-h-[400px]">
              
              {/* Left Column: Configured Disease Templates List */}
              <div className="space-y-4 md:border-r md:border-slate-100 md:pr-6 flex flex-col">
                <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider shrink-0">
                  Configured Disease Templates
                </h4>
                {loadingTemplates ? (
                  <div className="grid place-items-center flex-grow py-12">
                    <span className="loading loading-spinner loading-md text-indigo-600" />
                  </div>
                ) : templates.length === 0 ? (
                  <div className="text-center py-16 text-slate-400 text-xs font-semibold flex-grow flex flex-col justify-center">
                    <FolderOpen size={32} className="mx-auto mb-2 opacity-40 animate-pulse" />
                    No templates registered for this diagnosis.
                  </div>
                ) : (
                  <div className="grid gap-3 overflow-y-auto max-h-[50vh] pr-1">
                    {templates.map((tpl) => (
                      <div key={tpl.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-start text-xs">
                        <div className="space-y-1">
                          <strong className="text-slate-800 font-extrabold text-sm">{tpl.name}</strong>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {tpl.items?.map((item, idx) => (
                              <span key={idx} className="bg-white border border-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md">
                                {item.medicineName || `Med #${item.medicineId}`}: {item.dosage} ({item.days}d)
                              </span>
                            ))}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteTemplate(tpl.id)}
                          className="p-1.5 rounded bg-rose-50 text-rose-600 hover:bg-rose-100 border-0 transition shrink-0"
                          title="Delete Template"
                        >
                          <Trash size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Add New Template Form */}
              <form onSubmit={saveTemplateSubmit} className="space-y-4 md:pl-2 flex flex-col justify-between">
                <div className="space-y-4 overflow-y-auto max-h-[52vh] pr-1">
                  <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                    Create Custom Disease Template
                  </h4>

                  <label className="block">
                    <span className="mb-2 block text-xs font-black text-slate-600">
                      Template Name <span className="scms-required">*</span>
                    </span>
                    <input
                      required
                      placeholder="e.g. Standard 5-day Hypertension block"
                      className="input input-bordered h-10 rounded-xl text-xs w-full bg-white"
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                    />
                  </label>

                  {/* Sub-form: Add medicine to template */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                    <span className="text-xs font-black text-indigo-700 block">Add Medicine to Local List</span>
                    
                    <div className="grid gap-3 sm:grid-cols-2 text-xs">
                      <label className="block sm:col-span-2">
                        <span className="mb-1 block font-bold text-slate-500">
                          Medicine <span className="scms-required">*</span>
                        </span>
                        <select
                          className="select select-bordered h-9 rounded-lg text-xs w-full bg-white border-slate-300 scms-select-no-arrow"
                          value={selectedMedicineId}
                          onChange={(e) => setSelectedMedicineId(e.target.value)}
                        >
                          <option value="">Select Medicine</option>
                          {medicines.map(m => (
                            <option key={m.medicineId || m.id} value={m.medicineId || m.id}>{m.name}</option>
                          ))}
                        </select>
                      </label>

                      <label className="block">
                        <span className="mb-1 block font-bold text-slate-500">How often?</span>
                        <select
                          className="select select-bordered h-9 rounded-lg text-xs w-full bg-white border-slate-300 font-semibold"
                          value={commonDosageValues.includes(dosage) ? dosage : "Custom"}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDosage(val === "Custom" ? "Every 8 hours" : val);
                            setQuantity(calculateQuantity(val, days));
                          }}
                        >
                          {dosageOptions.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>

                        {!commonDosageValues.includes(dosage) && (
                          <input
                            type="text"
                            className="input input-bordered h-8 rounded-lg mt-1 text-xs w-full text-center"
                            value={dosage}
                            onChange={(e) => setDosage(e.target.value)}
                            placeholder="e.g. Every 8 hours"
                          />
                        )}
                      </label>

                      <label className="block">
                        <span className="mb-1 block font-bold text-slate-500">
                          Days <span className="scms-required">*</span>
                        </span>
                        <input
                          type="number"
                          min="1"
                          placeholder="5"
                          className="input input-bordered h-9 rounded-lg text-xs w-full bg-white"
                          value={days}
                          onChange={(e) => {
                            setDays(e.target.value);
                            setQuantity(calculateQuantity(dosage, e.target.value));
                          }}
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1 block font-bold text-slate-500">
                          Quantity <span className="scms-required">*</span>
                        </span>
                        <input
                          type="number"
                          min="1"
                          placeholder="10"
                          className="input input-bordered h-9 rounded-lg text-xs w-full bg-white"
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1 block font-bold text-slate-500">Instruction</span>
                        <input
                          placeholder="e.g. After meal"
                          className="input input-bordered h-9 rounded-lg text-xs w-full bg-white"
                          value={instruction}
                          onChange={(e) => setInstruction(e.target.value)}
                        />
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={addTemplateItem}
                      className="btn btn-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg w-full font-bold mt-2 border-0"
                    >
                      Add medicine to template
                    </button>
                  </div>

                  {/* Local template items checklist */}
                  {templateItems.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-black text-slate-600 block">Template Medicines Checklist:</span>
                      <div className="border border-slate-100 rounded-2xl overflow-hidden divide-y divide-slate-100">
                        {templateItems.map((item) => (
                          <div key={item.medicineId} className="flex justify-between items-center p-3 text-xs bg-white">
                            <div>
                              <span className="font-extrabold text-slate-800">{item.medicineName}</span>
                              <div className="text-[10px] text-slate-500 font-medium">
                                Dosage: {item.dosage} | Days: {item.days} | Qty: {item.quantity} | {item.instruction}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeTemplateItem(item.medicineId)}
                              className="p-1 rounded bg-rose-50 text-rose-600 border-0 hover:bg-rose-100"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={savingTemplate}
                  className="scms-btn-primary w-full h-11 font-black text-sm shrink-0 flex items-center justify-center gap-1.5"
                >
                  {savingTemplate && <span className="loading loading-spinner loading-xs" />}
                  Save New Template
                </button>
              </form>
            </div>

            {/* Actions Footer */}
            <div className="pt-4 border-t border-slate-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setTemplateDrawerOpen(false)}
                className="scms-btn-outline h-10 w-10 p-0 min-w-0 flex items-center justify-center"
                aria-label="Close Template Workspace"
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

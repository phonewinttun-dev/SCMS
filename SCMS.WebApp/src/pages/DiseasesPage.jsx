import { useState, useEffect } from "react";
import {
  ActivityLogIcon,
  PlusIcon,
  GridIcon,
  ListBulletIcon,
  Pencil1Icon,
  TrashIcon,
  Cross2Icon,
  BookmarkIcon,
  MagnifyingGlassIcon,
} from "@radix-ui/react-icons";
import PageHeader from "../components/PageHeader";
import PaginationControls from "../components/PaginationControls";
import SegmentedControl from "../components/SegmentedControl";
import { Input } from "../components/ui/input";
import { diseasesApi, prescriptionsApi } from "../services/scmsApi";
import { showError, showConfirm, showSuccess } from "../services/dialogs";
import { useLanguage } from "../context/LanguageContext";
import { sanitizeText } from "../utils/validation";
import useScrollLock from "../hooks/useScrollLock";
import ModalPortal from "../components/ModalPortal";

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
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState("table");
  const [query, setQuery] = useState("");

  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDisease, setEditingDisease] = useState(null);
  const [form, setForm] = useState({
    name: "",
    icdCode: "",
    category: "General",
    description: "",
    treatmentGuidelines: "",
  });

  // Protocol Templates Management Modal State
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [selectedDiseaseForTemplate, setSelectedDiseaseForTemplate] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [templateLoading, setTemplateLoading] = useState(false);

  useScrollLock(modalOpen || templateModalOpen);

  const loadDiseases = async (pageNum = page, currentQuery = query) => {
    try {
      setLoading(true);
      const trimmed = (currentQuery || "").trim();
      const res = trimmed
        ? await diseasesApi.search({
            query: trimmed,
            pageNumber: pageNum,
            pageSize: pageSize,
          })
        : await diseasesApi.list({
            pageNumber: pageNum,
            pageSize: pageSize,
          });

      setDiseases(toArray(res));
      if (res?.pagination) {
        setTotalPages(res.pagination.totalPages || 1);
        setTotalCount(res.pagination.totalCount || 0);
      }
    } catch (err) {
      console.error(err);
      showError("Failed to load disease diagnoses.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDiseases(page, query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    setPage(1);
    loadDiseases(1, query);
  };

  const openCreateModal = () => {
    setEditingDisease(null);
    setForm({
      name: "",
      icdCode: "",
      category: "General",
      description: "",
      treatmentGuidelines: "",
    });
    setModalOpen(true);
  };

  const openEditModal = (disease) => {
    setEditingDisease(disease);
    setForm({
      name: disease.name || "",
      icdCode: disease.icdCode || "",
      category: disease.category || "General",
      description: disease.description || "",
      treatmentGuidelines: disease.treatmentGuidelines || "",
    });
    setModalOpen(true);
  };

  const handleDelete = async (e, disease) => {
    if (e) e.stopPropagation();
    const ok = await showConfirm(`Are you sure you want to delete "${disease.name}"?`);
    if (!ok) return;
    try {
      await diseasesApi.delete(disease.diseaseId || disease.id);
      showSuccess("Disease diagnosis deleted.");
      loadDiseases();
    } catch (err) {
      console.error(err);
      showError(err, "Cannot Delete Disease");
    }
  };

  const handleSaveDisease = async (e) => {
    e.preventDefault();
    const cleanName = sanitizeText(form.name);
    if (!cleanName || cleanName.length < 2) {
      showError("Disease / Diagnosis name is required (at least 2 characters).", "Invalid Input");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: cleanName,
        icdCode: sanitizeText(form.icdCode) || null,
        category: sanitizeText(form.category) || "General",
        description: sanitizeText(form.description) || null,
      };

      if (editingDisease) {
        await diseasesApi.update(editingDisease.diseaseId || editingDisease.id, payload);
        showSuccess("Disease updated successfully.");
      } else {
        await diseasesApi.create(payload);
        showSuccess("Disease created successfully.");
      }
      setModalOpen(false);
      loadDiseases();
    } catch (err) {
      console.error(err);
      showError(err);
    } finally {
      setSaving(false);
    }
  };

  const openTemplateManager = async (disease) => {
    setSelectedDiseaseForTemplate(disease);
    setTemplateModalOpen(true);
    try {
      setTemplateLoading(true);
      const res = await prescriptionsApi.templates({ diseaseId: disease.diseaseId || disease.id });
      setTemplates(toArray(res));
    } catch (err) {
      console.error(err);
      showError("Failed to load prescription protocol templates.");
    } finally {
      setTemplateLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader
        title={t.diseases}
        subtitle="Manage diagnostic catalog, ICD-10 codification, and standard clinical treatment protocol templates."
        actions={
          <button
            onClick={openCreateModal}
            className="scms-btn-primary flex items-center gap-1.5 text-xs font-bold btn-target shadow-xs"
          >
            <PlusIcon className="w-4 h-4 shrink-0" />
            <span>Add Disease</span>
          </button>
        }
      />

      {/* Search & Layout Toggles */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 rounded-3xl border border-border/80 bg-card/90 backdrop-blur-md p-4 shadow-scms">
        <form onSubmit={handleSearch} className="flex-1 w-full flex items-center gap-2">
          <Input
            type="text"
            startIcon={<MagnifyingGlassIcon className="w-4 h-4 shrink-0" />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onClear={() => {
              setQuery("");
              loadDiseases(1, "");
            }}
            placeholder="Search diagnoses by name, category, or ICD code..."
            className="flex-1"
          />
          <button type="submit" className="scms-btn-search">
            <span>{t.search || "Search"}</span>
          </button>
        </form>

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
      ) : diseases.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-3xl border border-dashed border-border/80 bg-card">
          <ActivityLogIcon className="w-12 h-12 text-muted-foreground/40 mb-2 animate-pulse" />
          <h3 className="text-base font-bold text-foreground">No Diseases Cataloged</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            Add clinical diagnosis profiles to streamline doctor consultation workflows.
          </p>
        </div>
      ) : viewMode === "table" ? (
        <div className="overflow-hidden rounded-3xl border border-border/80 bg-card/95 backdrop-blur-md shadow-scms">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="border-b border-border/80 bg-secondary/50 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3.5 w-12 text-center">No.</th>
                  <th className="px-4 py-3.5">Disease / Diagnosis</th>
                  <th className="px-4 py-3.5">ICD Code</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Clinical Protocol Notes</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {diseases.map((d, index) => (
                  <tr
                    key={d.id || d.diseaseId || index}
                    className="hover:bg-secondary/60 transition-colors"
                  >
                    <td className="px-4 py-3.5 text-center font-mono text-xs text-muted-foreground font-semibold">
                      {(page - 1) * pageSize + index + 1}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-foreground">
                      {d.name || d.diseaseName}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs font-semibold text-orange-600 dark:text-orange-400">
                      {d.icdCode || "Clinical"}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">
                      <span className="rounded-full bg-secondary px-2.5 py-0.5 font-semibold text-secondary-foreground">
                        {d.category || "General"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground max-w-xs truncate">
                      {d.description || "Standard protocol"}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openTemplateManager(d)}
                          className="scms-btn-icon text-orange-600 dark:text-orange-400"
                          title="Prescription Templates"
                          aria-label="Prescription Templates"
                        >
                          <BookmarkIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(d)}
                          className="scms-btn-icon"
                          title="Edit Diagnosis"
                          aria-label="Edit Diagnosis"
                        >
                          <Pencil1Icon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, d)}
                          className="scms-btn-icon-danger"
                          title="Delete Diagnosis"
                          aria-label="Delete Diagnosis"
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
          {diseases.map((d, index) => (
            <div
              key={d.id || d.diseaseId || index}
              className="rounded-3xl border border-border/80 bg-card/95 p-5 shadow-scms hover:shadow-scms-raised transition space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">
                  {d.category || "Diagnosis"}
                </span>
                <span className="font-mono text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/60 px-2.5 py-0.5 rounded-full border border-orange-200/60 dark:border-orange-900/40">
                  {d.icdCode || "Clinical"}
                </span>
              </div>

              <div>
                <h3 className="font-bold text-foreground">{d.name || d.diseaseName}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  {d.description || "No specific advice noted."}
                </p>
              </div>

              <div className="pt-2 border-t border-border/70 flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => openTemplateManager(d)}
                  className="scms-btn-icon text-orange-600 dark:text-orange-400"
                  title="Templates"
                >
                  <BookmarkIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => openEditModal(d)}
                  className="scms-btn-icon"
                  title="Edit"
                >
                  <Pencil1Icon className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => handleDelete(e, d)}
                  className="scms-btn-icon-danger"
                  title="Delete"
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
        label="diseases"
        onPageChange={setPage}
      />

      {/* Create / Edit Disease Modal */}
      <ModalPortal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <div className="w-full max-w-md rounded-3xl border border-border/80 bg-card text-card-foreground p-6 shadow-scms-modal space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingDisease ? "Edit Disease Record" : "Add Disease to Catalog"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <Cross2Icon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDisease} className="space-y-3.5 text-xs">
              <label className="block">
                <span className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                  Disease / Condition Name <span className="text-rose-500">*</span>
                </span>
                <input
                  className="scms-input w-full text-xs"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Acute Upper Respiratory Infection"
                  required
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                    ICD-10 Code
                  </span>
                  <input
                    className="scms-input w-full text-xs font-mono"
                    value={form.icdCode}
                    onChange={(e) => setForm({ ...form, icdCode: e.target.value })}
                    placeholder="e.g. J06.9"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                    Category
                  </span>
                  <input
                    className="scms-input w-full text-xs"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    placeholder="e.g. Respiratory"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                  Clinical Protocol Notes
                </span>
                <textarea
                  className="scms-textarea w-full text-xs"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Standard treatment guidelines and recommendations..."
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

      {/* Template Manager Modal */}
      <ModalPortal
        isOpen={templateModalOpen && Boolean(selectedDiseaseForTemplate)}
        onClose={() => setTemplateModalOpen(false)}
      >
        {selectedDiseaseForTemplate && (
          <div className="w-full max-w-lg rounded-3xl border border-border/80 bg-card text-card-foreground p-6 shadow-scms-modal space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Prescription Templates
                </h3>
                <span className="text-xs text-slate-500">
                  Linked to {selectedDiseaseForTemplate.name}
                </span>
              </div>
              <button
                onClick={() => setTemplateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <Cross2Icon className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto text-xs">
              {templateLoading ? (
                <div className="py-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                  <span className="loading loading-spinner loading-sm text-primary" />
                  <span>Loading templates...</span>
                </div>
              ) : templates.length === 0 ? (
                <p className="text-slate-400 italic py-6 text-center">
                  No saved templates available yet. Templates can be saved during doctor consultation.
                </p>
              ) : (
                templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center"
                  >
                    <div>
                      <strong className="text-slate-800 dark:text-slate-200 block">
                        {tpl.templateName || tpl.name}
                      </strong>
                      <span className="text-slate-400 text-[11px]">
                        {tpl.items?.length || 0} medications configured
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setTemplateModalOpen(false)}
                className="scms-btn-primary text-xs"
              >
                {t.close}
              </button>
            </div>
          </div>
        )}
      </ModalPortal>
    </div>
  );
}

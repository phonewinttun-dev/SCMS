import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  PersonIcon,
  PlusIcon,
  EyeOpenIcon,
  GridIcon,
  ListBulletIcon,
  TrashIcon,
  DownloadIcon,
  Pencil1Icon,
  Cross2Icon,
  MagnifyingGlassIcon,
} from "@radix-ui/react-icons";
import PageHeader from "../components/PageHeader";
import PaginationControls from "../components/PaginationControls";
import SegmentedControl from "../components/SegmentedControl";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { patientsApi, downloadBlob } from "../services/scmsApi";
import { showError, showSuccess, showConfirm } from "../services/dialogs";
import { useLanguage } from "../context/LanguageContext";
import {
  validatePatientProfile,
} from "../utils/validation";
import useScrollLock from "../hooks/useScrollLock";
import ModalPortal from "../components/ModalPortal";
import PatientEhrModal from "../components/PatientEhrModal";

const toArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.result)) return data.result;
  return [];
};

export default function PatientsPage() {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const pageSize = 8;
  const [patients, setPatients] = useState([]);
  const [query, setQuery] = useState(initialQuery);
  const [viewMode, setViewMode] = useState("table"); // "table" or "card"
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Detail Modal State
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Form State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);

  useScrollLock(modalOpen || detailOpen);
  const [form, setForm] = useState({
    name: "",
    gender: "Male",
    dateOfBirth: "",
    bloodType: "A+",
    mobileNo: "",
    phone: "",
    age: "",
    allergies: "",
    chronicConditions: "",
    actualAddress: "",
    emergencyContact: "",
    emergencyPhone: "",
    medicalAlertNotes: "",
    nrcOrIdNumber: "",
  });

  const [errors, setErrors] = useState({});

  const loadPatients = async (pageNum = page, currentQuery = query) => {
    try {
      setLoading(true);
      const trimmed = (currentQuery || "").trim();
      const res = trimmed
        ? await patientsApi.search({
            query: trimmed,
            pageNumber: pageNum,
            pageSize,
          })
        : await patientsApi.list({
            pageNumber: pageNum,
            pageSize,
          });

      setPatients(toArray(res));
      if (res?.pagination) {
        setTotalPages(res.pagination.totalPages || 1);
        setTotalCount(res.pagination.totalCount || 0);
      }
    } catch (err) {
      console.error(err);
      showError("Failed to load patients.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients(page, query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setPage(1);
    loadPatients(1, query);
  };

  const openDetail = (patient) => {
    setSelectedPatient(patient);
    setDetailOpen(true);
  };

  const openCreateModal = () => {
    setEditingPatient(null);
    setForm({
      name: "",
      gender: "Male",
      dateOfBirth: "",
      bloodType: "A+",
      mobileNo: "",
      phone: "",
      age: "",
      allergies: "",
      chronicConditions: "",
      actualAddress: "",
      emergencyContact: "",
      emergencyPhone: "",
      medicalAlertNotes: "",
      nrcOrIdNumber: "",
    });
    setModalOpen(true);
  };

  const openEditModal = (patient) => {
    setEditingPatient(patient);
    setForm({
      name: patient.name || patient.fullName || "",
      gender: patient.gender || "Male",
      dateOfBirth: patient.dateOfBirth ? patient.dateOfBirth.split("T")[0] : "",
      bloodType: patient.bloodType || "A+",
      mobileNo: patient.mobileNo || patient.phone || "",
      phone: patient.phone || patient.mobileNo || "",
      age: patient.age || "",
      allergies: patient.allergies || "",
      chronicConditions: patient.chronicConditions || "",
      actualAddress: patient.actualAddress || patient.address || "",
      emergencyContact: patient.emergencyContact || "",
      emergencyPhone: patient.emergencyPhone || "",
      medicalAlertNotes: patient.medicalAlertNotes || "",
      nrcOrIdNumber: patient.nrcOrIdNumber || "",
    });
    setModalOpen(true);
  };

  const handleDelete = async (e, patient) => {
    if (e?.stopPropagation) e.stopPropagation();
    const target = patient || e;
    const ok = await showConfirm(
      `Are you sure you want to archive patient record for ${target.name || target.fullName}?`,
      "Archive Patient"
    );
    if (!ok) return;
    try {
      await patientsApi.remove(target.patientId || target.id);
      showSuccess("Patient record archived.");
      loadPatients(page, query);
      if (selectedPatient?.patientId === (target.patientId || target.id)) {
        setDetailOpen(false);
      }
    } catch (err) {
      console.error(err);
      showError(err, "Cannot Delete Patient Profile");
    }
  };

  const handleDownloadSummary = async (e, patient) => {
    if (e?.stopPropagation) e.stopPropagation();
    const target = patient || e;
    try {
      const pId = target.patientId || target.id;
      const blob = await patientsApi.summaryPdf(pId);
      downloadBlob(blob, `medical-summary-${pId}.pdf`);
      showSuccess("Clinical Summary PDF downloaded.");
    } catch (err) {
      console.error(err);
      showError("Failed to export patient summary PDF.");
    }
  };
  const downloadSummary = handleDownloadSummary;

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validation = validatePatientProfile(form);
    if (!validation.isValid) {
      setErrors(validation.errors);
      showError(validation.firstError, "Validation Error");
      return;
    }

    setErrors({});

    try {
      setSaving(true);
      const payload = validation.sanitized;

      if (editingPatient) {
        const pId = editingPatient.patientId || editingPatient.id;
        await patientsApi.update(pId, payload);
        showSuccess("Patient record updated successfully.");
        setModalOpen(false);
        await loadPatients(page, query);
        if (selectedPatient?.patientId === pId) {
          setSelectedPatient((prev) => ({ ...prev, ...payload }));
        }
      } else {
        await patientsApi.create(payload);
        showSuccess("Patient registered successfully.");
        setModalOpen(false);
        setQuery("");
        setPage(1);
        await loadPatients(1, "");
      }
    } catch (err) {
      console.error("Save patient error:", err);
      showError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader
        title={t.patients}
        subtitle="Manage clinic electronic health records (EHR), demographics, and clinical summaries."
        actions={
          <div className="flex items-center gap-2">
            <button
              className="scms-btn-primary flex items-center gap-1.5 btn-target shadow-xs"
              onClick={() => openCreateModal()}
            >
              <PlusIcon className="w-4 h-4 shrink-0" />
              <span>{t.create}</span>
            </button>
          </div>
        }
      />

      {/* Search & Layout Toggles */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 rounded-3xl border border-border/80 bg-card/90 backdrop-blur-md p-4 shadow-scms">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
          <Input
            type="text"
            startIcon={<MagnifyingGlassIcon className="w-4 h-4 shrink-0" />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onClear={() => {
              setQuery("");
              loadPatients(1, "");
            }}
            placeholder="Search patients by name or phone..."
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

      {/* Content Rendering */}
      {loading ? (
        <div className="grid place-items-center h-64 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <span className="loading loading-spinner loading-md text-indigo-600 dark:text-indigo-400" />
        </div>
      ) : patients.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <PersonIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-2 animate-pulse" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Patient Records</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
            No patients found matching your search. Register a new patient to get started.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="scms-btn-primary mt-4 flex items-center gap-1.5 text-xs btn-target"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Register Patient</span>
          </button>
        </div>
      ) : viewMode === "table" ? (
        <div className="overflow-hidden rounded-3xl border border-border/80 bg-card/95 backdrop-blur-md shadow-scms">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="border-b border-border/80 bg-secondary/50 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3.5 w-12 text-center">No.</th>
                  <th className="px-4 py-3.5">Patient Details</th>
                  <th className="px-4 py-3.5">Contact</th>
                  <th className="px-4 py-3.5">Blood Type</th>
                  <th className="px-4 py-3.5">Allergies & Conditions</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {patients.map((p, index) => (
                  <tr
                    key={p.patientId || p.id || index}
                    onClick={() => openDetail(p)}
                    className="hover:bg-secondary/60 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3.5 text-center font-mono text-xs text-muted-foreground font-semibold">
                      {(page - 1) * pageSize + index + 1}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-foreground">
                        {p.name || p.fullName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {p.gender || "Patient"} {p.age ? `• ${p.age} yrs` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">
                      <div className="font-mono">{p.phone || p.mobileNo || "-"}</div>
                      <div>{p.email || ""}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 px-2.5 py-0.5 rounded-full border border-orange-200/60 dark:border-orange-900/40 text-xs">
                        {p.bloodType || "O+"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground max-w-xs truncate">
                      {p.allergies ? (
                        <span className="text-rose-600 dark:text-rose-400 font-medium">
                          Allergy: {p.allergies}
                        </span>
                      ) : p.chronicConditions ? (
                        <span>{p.chronicConditions}</span>
                      ) : (
                        <span className="text-muted-foreground/60">None noted</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openDetail(p)}
                          className="scms-btn-icon"
                          title="View Patient EHR Profile"
                          aria-label="View Patient EHR Profile"
                        >
                          <EyeOpenIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(p)}
                          className="scms-btn-icon"
                          title="Edit Patient"
                          aria-label="Edit Patient"
                        >
                          <Pencil1Icon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => downloadSummary(e, p)}
                          className="scms-btn-icon"
                          title="Download Medical Summary PDF"
                          aria-label="Download Summary"
                        >
                          <DownloadIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, p)}
                          className="scms-btn-icon-danger"
                          title="Delete Patient"
                          aria-label="Delete Patient"
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
          {patients.map((p, index) => (
            <div
              key={p.patientId || p.id || index}
              onClick={() => openDetail(p)}
              className="rounded-3xl border border-border/80 bg-card/95 p-5 shadow-scms hover:shadow-scms-raised cursor-pointer transition-all space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold text-muted-foreground">
                  PA-{String(p.patientId || p.id || index + 1).padStart(4, "0")}
                </span>
                <span className="font-bold text-orange-600 dark:text-orange-400 text-xs bg-orange-50 dark:bg-orange-950/50 px-2.5 py-0.5 rounded-full border border-orange-200/60 dark:border-orange-900/40">
                  {p.bloodType || "O+"}
                </span>
              </div>

              <div>
                <h3 className="font-bold text-foreground">{p.name || p.fullName}</h3>
                <p className="text-xs text-muted-foreground">{p.gender || "Patient"} • {p.phone || "-"}</p>
              </div>

              {p.allergies && (
                <div className="text-[11px] text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-xl truncate">
                  Allergy: {p.allergies}
                </div>
              )}

              <div className="pt-2 border-t border-border/70 flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => openDetail(p)}
                  className="scms-btn-icon"
                  title="View Patient EHR Profile"
                  aria-label="View Patient EHR Profile"
                >
                  <EyeOpenIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => openEditModal(p)}
                  className="scms-btn-icon"
                  title="Edit Patient"
                  aria-label="Edit Patient"
                >
                  <Pencil1Icon className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => downloadSummary(e, p)}
                  className="scms-btn-icon"
                  title="Download Summary"
                  aria-label="Download Summary"
                >
                  <DownloadIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => handleDelete(e, p)}
                  className="scms-btn-icon-danger"
                  title="Delete"
                  aria-label="Delete Patient"
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
        label="patients"
        onPageChange={setPage}
      />

      {/* Create / Edit Patient Modal */}
      <ModalPortal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <div className="w-full max-w-xl rounded-3xl border border-border/80 bg-card text-card-foreground p-6 shadow-scms-modal space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border/70">
              <h3 className="text-lg font-bold text-foreground">
                {editingPatient ? "Edit Patient Profile" : "Register New Patient"}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-xl text-muted-foreground hover:bg-secondary">
                <Cross2Icon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                    Full Name <span className="text-rose-500">*</span>
                  </span>
                  <input
                    className="scms-input w-full text-xs"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Daw Khin Khin"
                    required
                  />
                  {errors.name && <p className="text-rose-500 text-[10px] mt-1">{errors.name}</p>}
                </label>

                <div>
                  <span className="mb-1 block font-bold text-slate-700 dark:text-slate-300">Gender</span>
                  <Select
                    value={form.gender}
                    onChange={(val) => setForm({ ...form, gender: val })}
                    options={[
                      { value: "Male", label: "Male" },
                      { value: "Female", label: "Female" },
                      { value: "Other", label: "Other" },
                    ]}
                  />
                </div>

                <div>
                  <span className="mb-1 block font-bold text-slate-700 dark:text-slate-300">Blood Type</span>
                  <Select
                    value={form.bloodType}
                    onChange={(val) => setForm({ ...form, bloodType: val })}
                    options={["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"].map((bt) => ({
                      value: bt,
                      label: bt,
                    }))}
                  />
                </div>

                <label className="block">
                  <span className="mb-1 block font-bold text-slate-700 dark:text-slate-300">Phone Number</span>
                  <input
                    className="scms-input w-full text-xs"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="09 123 456 789"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block font-bold text-slate-700 dark:text-slate-300">Age</span>
                  <input
                    type="number"
                    className="scms-input w-full text-xs font-mono"
                    value={form.age}
                    onChange={(e) => setForm({ ...form, age: e.target.value })}
                    placeholder="e.g. 35"
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="mb-1 block font-bold text-slate-700 dark:text-slate-300">Known Allergies</span>
                  <input
                    className="scms-input w-full text-xs"
                    value={form.allergies}
                    onChange={(e) => setForm({ ...form, allergies: e.target.value })}
                    placeholder="e.g. Penicillin, Aspirin, Peanuts"
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="mb-1 block font-bold text-slate-700 dark:text-slate-300">Chronic Conditions</span>
                  <input
                    className="scms-input w-full text-xs"
                    value={form.chronicConditions}
                    onChange={(e) => setForm({ ...form, chronicConditions: e.target.value })}
                    placeholder="e.g. Hypertension, Diabetes Type II"
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="mb-1 block font-bold text-slate-700 dark:text-slate-300">Residential Address</span>
                  <textarea
                    className="scms-textarea w-full text-xs"
                    rows={2}
                    value={form.actualAddress}
                    onChange={(e) => setForm({ ...form, actualAddress: e.target.value })}
                    placeholder="e.g. No 45, Bogyoke Road, Yangon"
                  />
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button type="button" onClick={() => setModalOpen(false)} className="scms-btn-outline text-xs">
                  {t.cancel}
                </button>
                <button type="submit" disabled={saving} className="scms-btn-primary text-xs">
                  {saving ? <span className="loading loading-spinner loading-xs" /> : t.save}
                </button>
              </div>
            </form>
          </div>
      </ModalPortal>

      {/* Full Patient EHR Profile Modal */}
      <PatientEhrModal
        isOpen={detailOpen && Boolean(selectedPatient)}
        patient={selectedPatient}
        onClose={() => setDetailOpen(false)}
        onEdit={(pat) => openEditModal(pat)}
      />
    </div>
  );
}

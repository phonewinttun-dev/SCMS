import { useState, useEffect } from "react";
import {
  Users,
  Plus,
  RefreshCcw,
  LayoutGrid,
  List,
  Eye,
  Trash2,
  Droplet,
  Download,
  User,
  Activity,
  X
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import ModalPortal from "../components/ModalPortal";
import PaginationControls from "../components/PaginationControls";
import SearchForm from "../components/SearchForm";
import { patientsApi, downloadBlob } from "../services/scmsApi";
import { showError, showSuccess, showConfirm } from "../services/dialogs";
import { useLanguage } from "../context/LanguageContext";

export default function PatientsPage() {
  const { t } = useLanguage();
  const pageSize = 8;
  const [patients, setPatients] = useState([]);
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState("table"); // "table" or "card"
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Create Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    gender: "Male",
    age: "",
    bloodType: "O+",
    allergies: "",
    chronicConditions: "",
    actualAddress: "",
  });

  // Detail Modal State
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const loadPatients = async (pageNum = page) => {
    try {
      setLoading(true);
      const res = await patientsApi.list({
        pageNumber: pageNum,
        pageSize: 8,
        query: query.trim() || undefined,
      });

      if (res) {
        setPatients(res.data || []);
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages || 1);
          setTotalCount(res.pagination.totalCount || (res.data || []).length);
        }
      }
    } catch {
      showError("Failed to load patient directory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadPatients(1);
  };

  const updateFormField = (key, val) => {
    setForm(p => ({ ...p, [key]: val }));
    if (errors[key]) {
      setErrors(p => ({ ...p, [key]: false }));
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    
    // Strict inline required validations
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = true;
    if (!form.age) newErrors.age = true;
    if (!form.gender) newErrors.gender = true;
    if (!form.phone.trim()) newErrors.phone = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showError("Please fill out all required fields highlighted in red.");
      return;
    }

    try {
      setSaving(true);
      // Calculate DateOfBirth based on entered Age
      let dobString = null;
      if (form.age) {
        const birthYear = new Date().getFullYear() - Number(form.age);
        dobString = `${birthYear}-01-01`;
      }

      await patientsApi.create({
        name: form.name.trim(),
        email: form.email.trim() || null,
        mobileNo: form.phone.trim() || null,
        gender: form.gender,
        bloodType: form.bloodType,
        dateOfBirth: dobString,
        actualAddress: form.actualAddress.trim() || null,
        allergies: form.allergies.trim() || null,
        chronicConditions: form.chronicConditions.trim() || null,
      });

      setModalOpen(false);
      setErrors({});
      setForm({
        name: "",
        email: "",
        phone: "",
        gender: "Male",
        age: "",
        bloodType: "O+",
        allergies: "",
        chronicConditions: "",
        actualAddress: "",
      });
      await showSuccess("Patient profile created successfully.");
      setPage(1);
      loadPatients(1);
    } catch (error) {
      showError(error?.response?.data?.message || "Failed to create patient profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e, patient) => {
    e.stopPropagation();
    const confirmed = await showConfirm(
      `Are you sure you want to delete patient ${patient.name}? This will perform a soft delete.`,
      "Confirm Deletion"
    );
    if (!confirmed) return;

    try {
      setLoading(true);
      await patientsApi.delete(patient.patientId || patient.id);
      await showSuccess("Patient profile soft-deleted successfully.");
      loadPatients(page);
    } catch (error) {
      showError(error?.response?.data?.message || "Failed to delete patient profile.");
    } finally {
      setLoading(false);
    }
  };

  const downloadSummary = async (e, patient) => {
    e.stopPropagation();
    try {
      const response = await patientsApi.summaryPdf(patient.patientId || patient.id);
      downloadBlob(response, `medical-summary-${patient.name}.pdf`);
      showSuccess("Medical summary downloaded successfully.");
    } catch {
      showError("Failed to download PDF summary.");
    }
  };

  const openDetail = (patient) => {
    setSelectedPatient(patient);
    setDetailOpen(true);
  };

  const calculateAge = (dob) => {
    if (!dob) return "-";
    const birth = new Date(dob);
    if (isNaN(birth.getTime())) return "-";
    return new Date().getFullYear() - birth.getFullYear();
  };

  const formatPatientNo = (id) => {
    return `PA-${String(id).padStart(4, "0")}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.patients}
        subtitle="Patient records, allergy registers, and clinical EMR history cards."
        actions={
          <div className="flex gap-2">
            <button className="scms-btn-outline" onClick={() => loadPatients(page)}>
              <RefreshCcw size={16} />
              {t.refresh}
            </button>
            <button className="scms-btn-primary" onClick={() => setModalOpen(true)}>
              <Plus size={16} />
              {t.create}
            </button>
          </div>
        }
      />

      {/* Search & Layout Toggles */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white border border-scms-border rounded-2xl p-4 shadow-sm">
        <SearchForm
          value={query}
          onSubmit={handleSearchSubmit}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value === "") {
              setPage(1);
              patientsApi.list({ pageNumber: 1, pageSize: 8 }).then(res => {
                if (res) {
                  setPatients(res.data || []);
                  if (res.pagination) {
                    setTotalPages(res.pagination.totalPages || 1);
                    setTotalCount(res.pagination.totalCount || 0);
                  }
                }
              });
            }
          }}
          onClear={() => {
            setQuery("");
            setPage(1);
            patientsApi.list({ pageNumber: 1, pageSize: 8 }).then(res => {
              if (res) {
                setPatients(res.data || []);
                if (res.pagination) {
                  setTotalPages(res.pagination.totalPages || 1);
                  setTotalCount(res.pagination.totalCount || 0);
                }
              }
            });
          }}
          clearable
          placeholder="Search by name, email, or mobile..."
          submitLabel={t.search}
          className="w-full max-w-2xl flex-1"
        />

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode("table")}
              className={`p-2 rounded-lg transition ${viewMode === "table" ? "bg-white text-scms-primary shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              title="List Table view"
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

      {/* Loading Shimmer */}
      {loading ? (
        <div className="grid place-items-center h-60 bg-white rounded-2xl border border-scms-border">
          <span className="loading loading-spinner loading-md text-scms-primary" />
        </div>
      ) : patients.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-scms-border">
          <Users size={48} className="text-slate-300 mb-2 animate-pulse" />
          <p className="text-sm font-bold text-scms-muted">No patient records found.</p>
        </div>
      ) : viewMode === "table" ? (
        /* TABLE VIEW */
        <div className="scms-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead className="bg-[#F9FAFB] text-xs uppercase text-scms-muted">
                <tr>
                  <th>No.</th>
                  <th>Patient No.</th>
                  <th>Patient Name</th>
                  <th>Age (Yrs)</th>
                  <th>Blood Type</th>
                  <th>Contact Info</th>
                  <th>Chronic Conditions</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p, index) => {
                  const rowNo = ((page - 1) * pageSize) + index + 1;
                  return (
                  <tr
                    key={p.patientId || p.id}
                    onClick={() => openDetail(p)}
                    className="hover:bg-slate-50/70 cursor-pointer transition"
                  >
                    <td className="font-black text-xs text-scms-muted">{rowNo}</td>
                    <td className="font-mono text-xs text-scms-primary font-bold">
                      {formatPatientNo(p.patientId || p.id)}
                    </td>
                    <td className="font-extrabold text-scms-text flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center bg-scms-primaryLight text-xs font-black text-scms-primary rounded-full shrink-0">
                        {p.name?.slice(0, 2).toUpperCase()}
                      </div>
                      {p.name}
                    </td>
                    <td className="font-semibold">{calculateAge(p.dateOfBirth)}</td>
                    <td>
                      {p.bloodType ? (
                        <span className="inline-flex items-center gap-1 bg-red-50 border border-red-100 text-red-700 text-xs font-extrabold px-2 py-0.5 rounded-full">
                          <Droplet size={11} className="fill-current" />
                          {p.bloodType}
                        </span>
                      ) : "-"}
                    </td>
                    <td className="text-xs">
                      <div className="font-semibold text-scms-text">{p.mobileNo || p.phone || "-"}</div>
                      <div className="text-scms-muted">{p.email || "-"}</div>
                    </td>
                    <td className="text-xs max-w-xs truncate text-scms-muted font-medium">
                      {p.chronicConditions || p.addressMeta?.chronicConditions || "-"}
                    </td>
                    <td className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => openDetail(p)}
                          className="btn btn-xs rounded-lg border-scms-border bg-white text-scms-text"
                          title="View complete records"
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          onClick={(e) => downloadSummary(e, p)}
                          className="btn btn-xs rounded-lg bg-scms-primaryLight text-scms-primary border-0"
                          title="Download summary PDF"
                        >
                          <Download size={13} />
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, p)}
                          className="btn btn-xs rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border-0"
                          title="Delete patient profile"
                        >
                          <Trash2 size={13} />
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {patients.map((p, index) => {
            const rowNo = ((page - 1) * pageSize) + index + 1;
            return (
            <div
              key={p.patientId || p.id}
              onClick={() => openDetail(p)}
              className="bg-white border border-scms-border hover:border-scms-primary rounded-2xl p-5 hover:shadow-md cursor-pointer transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center bg-indigo-50 text-xs font-black text-scms-primary rounded-full shrink-0">
                    {p.name?.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="truncate">
                    <h4 className="font-black text-scms-text truncate text-sm">{p.name}</h4>
                    <span className="text-[11px] font-black text-scms-muted">No. {rowNo}</span>
                    <span className="text-xs font-black text-scms-primary font-mono">{formatPatientNo(p.patientId || p.id)}</span>
                    <span className="block text-[11px] font-semibold text-scms-muted mt-0.5">{calculateAge(p.dateOfBirth)} Years Old</span>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-xs">
                  {p.bloodType && (
                    <div className="flex items-center justify-between text-slate-500 font-semibold">
                      <span>Blood Group:</span>
                      <strong className="text-red-700 font-extrabold inline-flex items-center gap-0.5">
                        <Droplet size={11} className="fill-current" />
                        {p.bloodType}
                      </strong>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-slate-500 font-semibold">
                    <span>Contact:</span>
                    <strong className="text-scms-text">{p.mobileNo || p.phone || "-"}</strong>
                  </div>
                  <div className="text-slate-500 font-semibold mt-1">
                    <span>Allergies:</span>
                    <p className="text-scms-muted truncate text-[11px] font-medium leading-relaxed mt-0.5">
                      {p.allergies || p.addressMeta?.allergies || "None"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => openDetail(p)}
                  className="btn btn-sm btn-ghost rounded-xl text-xs font-extrabold text-scms-primary bg-scms-primaryLight/30"
                >
                  EMR Records
                </button>
                <button
                  onClick={(e) => downloadSummary(e, p)}
                  className="btn btn-sm btn-ghost btn-square rounded-xl border border-scms-border"
                  title="Download summary PDF"
                >
                  <Download size={14} />
                </button>
                <button
                  onClick={(e) => handleDelete(e, p)}
                  className="btn btn-sm btn-ghost btn-square rounded-xl border border-red-200 text-red-600 hover:bg-red-50"
                  title="Delete patient profile"
                >
                  <Trash2 size={14} />
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
        label="patients"
        loading={loading}
        onPageChange={setPage}
      />

      {/* --- CREATE PATIENT PROFILE MODAL --- */}
      {modalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm ">
          <form
            onSubmit={handleCreate}
            className="w-full max-w-lg bg-white rounded-3xl border border-scms-border p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-black text-scms-text flex items-center gap-2">
                <Users size={20} className="text-scms-primary" />
                Add Patient Profile
              </h3>
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  setErrors({});
                }}
                className="text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-2 block text-xs font-black text-scms-text">
                  Full Name <span className="text-red-500">*</span>
                </span>
                <input
                  placeholder="e.g. Aung Min"
                  className={`input input-bordered h-11 rounded-xl text-sm w-full ${
                    errors.name ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500" : ""
                  }`}
                  value={form.name}
                  onChange={(e) => updateFormField("name", e.target.value)}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-black text-scms-text">
                  Age (Years) <span className="text-red-500">*</span>
                </span>
                <input
                  type="number"
                  min="0"
                  max="120"
                  placeholder="e.g. 28"
                  className={`input input-bordered h-11 rounded-xl text-sm w-full ${
                    errors.age ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500" : ""
                  }`}
                  value={form.age}
                  onChange={(e) => updateFormField("age", e.target.value)}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-black text-scms-text">Blood Type</span>
                <select
                  className="select select-bordered h-11 rounded-xl text-sm w-full"
                  value={form.bloodType}
                  onChange={(e) => updateFormField("bloodType", e.target.value)}
                >
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-black text-scms-text">
                  Gender <span className="text-red-500">*</span>
                </span>
                <select
                  className={`select select-bordered h-11 rounded-xl text-sm w-full ${
                    errors.gender ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500" : ""
                  }`}
                  value={form.gender}
                  onChange={(e) => updateFormField("gender", e.target.value)}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-black text-scms-text">
                  Phone / Mobile <span className="text-red-500">*</span>
                </span>
                <input
                  type="tel"
                  placeholder="e.g. 091234567"
                  className={`input input-bordered h-11 rounded-xl text-sm w-full ${
                    errors.phone ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500" : ""
                  }`}
                  value={form.phone}
                  onChange={(e) => updateFormField("phone", e.target.value)}
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="mb-2 block text-xs font-black text-scms-text">Email Address</span>
                <input
                  type="email"
                  placeholder="e.g. patient@example.com"
                  className="input input-bordered h-11 rounded-xl text-sm w-full"
                  value={form.email}
                  onChange={(e) => updateFormField("email", e.target.value)}
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="mb-2 block text-xs font-black text-scms-text">Allergies (Medical warning)</span>
                <input
                  placeholder="e.g. Penicillin, Pollen, Nuts (comma separated)"
                  className="input input-bordered h-11 rounded-xl text-sm w-full"
                  value={form.allergies}
                  onChange={(e) => updateFormField("allergies", e.target.value)}
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="mb-2 block text-xs font-black text-scms-text">Chronic Health Conditions</span>
                <input
                  placeholder="e.g. Hypertension, Diabetes, Asthma"
                  className="input input-bordered h-11 rounded-xl text-sm w-full"
                  value={form.chronicConditions}
                  onChange={(e) => updateFormField("chronicConditions", e.target.value)}
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="mb-2 block text-xs font-black text-scms-text">Actual Contact Address</span>
                <textarea
                  placeholder="Street address, City, Region..."
                  className="textarea textarea-bordered rounded-xl text-sm w-full min-h-16"
                  value={form.actualAddress}
                  onChange={(e) => updateFormField("actualAddress", e.target.value)}
                />
              </label>
            </div>

            {/* Repositioned Save and Cancel buttons together as a row at the bottom of the modal form */}
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  setErrors({});
                }}
                className="scms-btn-outline px-5 h-11 text-xs font-black"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="scms-btn-primary px-5 h-11 text-xs font-black flex items-center gap-1.5"
              >
                {saving && <span className="loading loading-spinner loading-xs" />}
                Save Patient Profile
              </button>
            </div>
          </form>
          </div>
        </ModalPortal>
      )}

      {/* --- PATIENT PROFILE DETAILS POPUP --- */}
      {detailOpen && selectedPatient && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm ">
          <div className="w-full max-w-2xl bg-white rounded-3xl border border-scms-border p-6 shadow-2xl relative max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => setDetailOpen(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition"
            >
              <X size={18} />
            </button>

            {/* Profile Brief */}
            <div className="flex gap-4 items-center border-b border-slate-100 pb-4 mb-4">
              <div className="grid h-14 w-14 place-items-center bg-indigo-50 text-sm font-black text-scms-primary rounded-2xl shrink-0">
                {selectedPatient.name?.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-xl font-black text-scms-text flex items-center gap-2.5">
                  {selectedPatient.name}
                  <span className="text-xs font-mono font-bold bg-indigo-50 text-scms-primary px-2.5 py-1 rounded-lg">
                    {formatPatientNo(selectedPatient.patientId || selectedPatient.id)}
                  </span>
                </h3>
                <p className="text-xs font-semibold text-scms-muted mt-1.5">
                  Age: <strong className="text-scms-text">{calculateAge(selectedPatient.dateOfBirth)} Years</strong> | Gender: <strong className="text-scms-text">{selectedPatient.gender || "Not Specified"}</strong>
                </p>
              </div>
            </div>

            {/* Structured Medical Grid */}
            <div className="grid gap-6 sm:grid-cols-2 text-xs">
              <div className="space-y-4">
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <h4 className="font-extrabold text-slate-800 flex items-center gap-1.5 mb-2">
                    <User size={14} className="text-scms-primary" />
                    Demographics Info
                  </h4>
                  <div className="space-y-1.5">
                    {selectedPatient.bloodType && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-bold">Blood Group:</span>
                        <span className="text-red-700 font-black flex items-center gap-0.5">
                          <Droplet size={11} className="fill-current" />
                          {selectedPatient.bloodType}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-bold">Contact:</span>
                      <span className="text-scms-text font-semibold">{selectedPatient.mobileNo || selectedPatient.phone || "-"}</span>
                    </div>
                    {/* Display the email field in patient preview only if it exists */}
                    {selectedPatient.email && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-bold">Email:</span>
                        <span className="text-scms-text font-semibold truncate max-w-44" title={selectedPatient.email}>
                          {selectedPatient.email}
                        </span>
                      </div>
                    )}
                    <div className="mt-2 pt-2 border-t border-slate-200">
                      <span className="text-slate-500 font-bold block mb-1">Contact Address:</span>
                      <p className="text-scms-text leading-relaxed font-semibold">
                        {selectedPatient.actualAddress || selectedPatient.addressMeta?.actualAddress || selectedPatient.address || "-"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-rose-50/50 rounded-2xl p-4 border border-rose-100/60">
                  <h4 className="font-extrabold text-rose-800 flex items-center gap-1.5 mb-2">
                    <Activity size={14} className="text-rose-600" />
                    Medical History & Warnings
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <span className="text-rose-700 font-black block mb-0.5">Allergies:</span>
                      <p className="text-scms-text font-semibold bg-white p-2 rounded-lg border border-rose-100">
                        {selectedPatient.allergies || selectedPatient.addressMeta?.allergies || "No active allergies registered."}
                      </p>
                    </div>
                    <div>
                      <span className="text-rose-700 font-black block mb-0.5">Chronic Health Conditions:</span>
                      <p className="text-scms-text font-semibold bg-white p-2 rounded-lg border border-rose-100">
                        {selectedPatient.chronicConditions || selectedPatient.addressMeta?.chronicConditions || "No chronic illnesses registered."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={(e) => downloadSummary(e, selectedPatient)}
                className="scms-btn-primary h-10 text-xs font-black flex items-center gap-2"
              >
                <Download size={14} />
                Download EMR Summary PDF
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
        </ModalPortal>
      )}
    </div>
  );
}

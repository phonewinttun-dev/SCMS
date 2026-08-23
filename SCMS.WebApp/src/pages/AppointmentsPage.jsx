import { useState, useEffect } from "react";
import {
  CalendarIcon,
  PlusIcon,
  GridIcon,
  ListBulletIcon,
  ActivityLogIcon,
  HeartIcon,
  MagicWandIcon,
  FileTextIcon,
  ArchiveIcon,
  TrashIcon,
  BookmarkIcon,
  Cross2Icon,
} from "@radix-ui/react-icons";
import PageHeader from "../components/PageHeader";
import DateInput from "../components/DateInput";
import PaginationControls from "../components/PaginationControls";
import SearchForm from "../components/SearchForm";
import {
  appointmentsApi,
  diseasesApi,
  medicinesApi,
  prescriptionsApi,
  followUpsApi,
  downloadBlob
} from "../services/scmsApi";
import { showAlert, showError, showConfirm } from "../services/dialogs";
import { useLanguage } from "../context/LanguageContext";
import { calculateQuantity, commonDosageValues, dosageOptions, fahrenheitToCelsius } from "../utils/clinical";
import { sanitizeText, validateClinicalVitals, validateNumberRange } from "../utils/validation";
import { formatDateTime } from "../utils/format";
import useScrollLock from "../hooks/useScrollLock";
import ModalPortal from "../components/ModalPortal";

const toArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.result)) return data.result;
  return [];
};

export default function AppointmentsPage() {
  const { t } = useLanguage();
  const pageSize = 8;
  const [appointments, setAppointments] = useState([]);
  const [viewMode, setViewMode] = useState("table"); // "table" or "card"
  const [loading, setLoading] = useState(false);

  // Search & Filter State
  const [patientSearch, setPatientSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("all"); // "today", "week", "month", "all"

  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Details Modal State
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState(null);

  // EMR Consulting Workspace Modal State
  const [emrOpen, setEmrOpen] = useState(false);
  const [activeAppt, setActiveAppt] = useState(null);
  
  useScrollLock(detailOpen || emrOpen);

  // Vitals & Consultation Notes
  const [vitals, setVitals] = useState({
    weightKg: "",
    heightCm: "",
    bloodPressureSystolic: "",
    bloodPressureDiastolic: "",
    temperatureF: "",
    pulseBpm: "",
    spo2Percent: "",
    notes: "",
  });

  // Diseases & Medicines catalog
  const [diseases, setDiseases] = useState([]);
  const [selectedDiseaseId, setSelectedDiseaseId] = useState("");
  
  const [medicines, setMedicines] = useState([]);
  const [prescribedItems, setPrescribedItems] = useState([]);
  const [selectedMedicineId, setSelectedMedicineId] = useState("");

  const [savingConsult, setSavingConsult] = useState(false);

  // Template State
  const [templates, setTemplates] = useState([]);
  const [templateName, setTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Follow-up State
  const [scheduleFollowUp, setScheduleFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpNotes, setFollowUpNotes] = useState("");

  useEffect(() => {
    if (selectedDiseaseId) {
      const fetchTemplates = async () => {
        try {
          const res = await prescriptionsApi.templates({ diseaseId: selectedDiseaseId });
          setTemplates(toArray(res));
        } catch (e) {
          console.error("Failed to load templates", e);
        }
      };
      fetchTemplates();
    } else {
      setTemplates([]);
    }
  }, [selectedDiseaseId]);

  const loadCatalog = async () => {
    try {
      const [diseasesRes, medicinesRes] = await Promise.all([
        diseasesApi.list({ pageSize: 100 }),
        medicinesApi.list({ pageSize: 100 }),
      ]);
      setDiseases(toArray(diseasesRes));
      setMedicines(toArray(medicinesRes));
    } catch (e) {
      console.error("Failed to load catalog data", e);
    }
  };

  const getLocalDateStr = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const loadAppointments = async (pageNum = page) => {
    try {
      setLoading(true);
      
      // Calculate date ranges for filters
      let startDateStr = undefined;
      let endDateStr = undefined;
      const today = new Date();

      if (dateFilter === "today") {
        startDateStr = getLocalDateStr(today);
        endDateStr = `${getLocalDateStr(today)}T23:59:59`;
      } else if (dateFilter === "week") {
        const first = today.getDate() - today.getDay();
        const last = first + 6;
        startDateStr = getLocalDateStr(new Date(new Date().setDate(first)));
        endDateStr = `${getLocalDateStr(new Date(new Date().setDate(last)))}T23:59:59`;
      } else if (dateFilter === "month") {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        startDateStr = getLocalDateStr(firstDay);
        endDateStr = `${getLocalDateStr(lastDay)}T23:59:59`;
      }

      const res = await appointmentsApi.list({
        pageNumber: pageNum,
        pageSize: 8,
        startDate: startDateStr,
        endDate: endDateStr,
      });

      if (res) {
        let items = toArray(res);
        
        // Search by patient name
        if (patientSearch.trim()) {
          items = items.filter(appt =>
            appt.patientName?.toLowerCase().includes(patientSearch.toLowerCase()) ||
            appt.patient?.name?.toLowerCase().includes(patientSearch.toLowerCase())
          );
        }

        // Sort chronologically by appointment date/time
        items.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));

        setAppointments(items);
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages || 1);
          setTotalCount(res.pagination.totalCount || items.length);
        }
      }
    } catch {
      showError("Failed to fetch appointments list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  useEffect(() => {
    loadAppointments(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, dateFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadAppointments(1);
  };

  const getStatusClass = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "completed" || s === "paid" || s === "success") {
      return "bg-[#ECFDF3] text-[#027A48] border-[#A9EFC5]";
    }
    if (s === "confirmed" || s === "active") {
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

  // EMR: Add selected medicine to prescription list
  const addPrescribedMedicine = () => {
    if (!selectedMedicineId) return;
    const med = medicines.find(m => String(m.medicineId || m.id) === String(selectedMedicineId));
    if (!med) return;

    const stock = med.totalStock ?? med.stock ?? 0;
    if (stock <= 0) {
      showAlert("Cannot prescribe this medication because it is out of stock (Stock: 0).");
      return;
    }

    // Avoid duplicates
    if (prescribedItems.some(i => i.medicineId === med.medicineId)) {
      showAlert("Medicine already added to prescription.");
      return;
    }

    setPrescribedItems(prev => [
      ...prev,
      {
        medicineId: med.medicineId,
        medicineName: med.name,
        dosage: "Twice daily",
        days: 5,
        quantity: 10,
        instruction: "After meal",
        stockLeft: med.totalStock ?? med.stock ?? 100,
        // Schedule helpers
        doseTime: "custom",
        doseQuantity: 1.0,
        doseUnit: "tablet",
        mealTiming: "after_meal",
        route: "oral",
      }
    ]);
    setSelectedMedicineId("");
  };

  const removePrescribedMedicine = (medId) => {
    setPrescribedItems(prev => prev.filter(i => i.medicineId !== medId));
  };

  const updateItemField = (medId, field, val) => {
    setPrescribedItems(prev =>
      prev.map(item => {
        if (item.medicineId === medId) {
          const updated = { ...item, [field]: val };
          // Auto calculate total quantity from frequency and days.
          if (field === "days" || field === "dosage") {
            const days = field === "days" ? Number(val) : item.days;
            const dosage = field === "dosage" ? String(val) : item.dosage;
            updated.quantity = calculateQuantity(dosage, days);
          }
          return updated;
        }
        return item;
      })
    );
  };

  // Auto calculated BMI
  const calculateBmi = () => {
    const w = Number(vitals.weightKg);
    const h = Number(vitals.heightCm);
    if (w > 0 && h > 0) {
      const heightInMeters = h / 100;
      return (w / (heightInMeters * heightInMeters)).toFixed(2);
    }
    return "-";
  };

  const openConsulting = (appt) => {
    setActiveAppt(appt);
    setVitals({
      weightKg: "",
      heightCm: "",
      bloodPressureSystolic: "",
      bloodPressureDiastolic: "",
      temperatureF: "",
      pulseBpm: "",
      spo2Percent: "",
      notes: "",
    });
    setPrescribedItems([]);
    setSelectedDiseaseId("");
    setTemplates([]);
    setTemplateName("");
    setScheduleFollowUp(false);
    setFollowUpDate("");
    setFollowUpNotes("");
    setEmrOpen(true);
  };

  const handleSaveConsult = async () => {
    if (!activeAppt) return;
    
    // Validate physiological limits of clinical vitals
    const vitalsValidation = validateClinicalVitals({
      systolic: vitals.bloodPressureSystolic,
      diastolic: vitals.bloodPressureDiastolic,
      temperature: vitals.temperatureF,
      pulse: vitals.pulseBpm,
      spO2: vitals.spo2Percent,
      weight: vitals.weightKg,
      height: vitals.heightCm,
    });

    if (!vitalsValidation.isValid) {
      showError(vitalsValidation.error, "Clinical Vitals Out of Range");
      return;
    }

    if (scheduleFollowUp && !followUpDate) {
      showError("Please select a due date for the scheduled follow-up visit.", "Missing Follow-up Date");
      return;
    }

    // Validate medication quantities and days
    for (const item of prescribedItems) {
      const qVal = validateNumberRange(item.quantity, { label: `${item.medicineName} Quantity`, min: 1, max: 10000, isInteger: true });
      if (!qVal.isValid) {
        showError(qVal.error, "Invalid Medication Quantity");
        return;
      }
      const dVal = validateNumberRange(item.days, { label: `${item.medicineName} Days`, min: 1, max: 365, isInteger: true });
      if (!dVal.isValid) {
        showError(dVal.error, "Invalid Treatment Days");
        return;
      }
    }

    try {
      setSavingConsult(true);
      
      const tempC = vitals.temperatureF ? fahrenheitToCelsius(vitals.temperatureF) : null;

      const payload = {
        appointmentId: Number(activeAppt.appointmentId || activeAppt.id),
        patientId: Number(activeAppt.patientId),
        diseaseId: selectedDiseaseId ? Number(selectedDiseaseId) : null,
        weightKg: vitals.weightKg ? Number(vitals.weightKg) : null,
        heightCm: vitals.heightCm ? Number(vitals.heightCm) : null,
        bloodPressureSystolic: vitals.bloodPressureSystolic ? Number(vitals.bloodPressureSystolic) : null,
        bloodPressureDiastolic: vitals.bloodPressureDiastolic ? Number(vitals.bloodPressureDiastolic) : null,
        temperatureC: tempC,
        pulseBpm: vitals.pulseBpm ? Number(vitals.pulseBpm) : null,
        spo2Percent: vitals.spo2Percent ? Number(vitals.spo2Percent) : null,
        notes: sanitizeText(vitals.notes) || null,
        items: prescribedItems.map(item => ({
          medicineId: item.medicineId,
          dosage: sanitizeText(item.dosage) || "Once daily",
          days: Number(item.days),
          quantity: Number(item.quantity),
          instruction: sanitizeText(item.instruction) || "As directed",
          doseTime: item.doseTime,
          doseQuantity: Number(item.doseQuantity) || 1,
          doseUnit: item.doseUnit || "tablet",
          mealTiming: item.mealTiming || "after_meal",
          route: item.route || "oral",
        }))
      };

      const res = await prescriptionsApi.create(payload);

      if (res) {
        // Schedule follow-up if active
        if (scheduleFollowUp) {
          try {
            await followUpsApi.create({
              appointmentId: Number(activeAppt.appointmentId || activeAppt.id),
              patientId: Number(activeAppt.patientId),
              dueDate: followUpDate,
              note: followUpNotes.trim() || "Routine clinical follow-up.",
              notes: followUpNotes.trim() || "Routine clinical follow-up."
            });
          } catch (followUpErr) {
            console.error("Integrated follow-up scheduling failed", followUpErr);
          }
        }

        setEmrOpen(false);
        await showAlert("Consultation recorded and completed!");
        
        // Auto download PDF
        try {
          const rxId = res.id || res.data?.id;
          if (rxId) {
            const pdfBlob = await prescriptionsApi.pdf(rxId);
            downloadBlob(pdfBlob, `prescription-${rxId}.pdf`);
          }
        } catch (pdfErr) {
          console.error("Auto download failed", pdfErr);
        }

        loadAppointments(page);
      }
    } catch (err) {
      showError(err?.response?.data?.message || "Failed to complete consultation.");
    } finally {
      setSavingConsult(false);
    }
  };

  const applyTemplate = (tpl) => {
    if (!tpl || !tpl.items) return;
    setPrescribedItems(tpl.items.map(item => {
      const med = medicines.find(m => String(m.medicineId || m.id) === String(item.medicineId));
      return {
        medicineId: item.medicineId,
        medicineName: item.medicineName,
        dosage: item.dosage || "Twice daily",
        days: item.days || 5,
        quantity: item.quantity || 10,
        instruction: item.instruction || "After meal",
        stockLeft: med ? (med.totalStock ?? med.stock ?? 100) : 100,
        doseTime: "custom",
        doseQuantity: 1.0,
        doseUnit: "tablet",
        mealTiming: "after_meal",
        route: "oral"
      };
    }));
  };

  const handleSaveTemplate = async () => {
    const cleanTplName = sanitizeText(templateName);
    if (!cleanTplName || cleanTplName.length < 2) {
      showError("Please enter a valid template name (at least 2 characters).", "Invalid Template Name");
      return;
    }
    if (!selectedDiseaseId) {
      showError("Please select a disease / diagnosis first before saving a template.", "Disease Required");
      return;
    }
    if (prescribedItems.length === 0) {
      showError("Please add at least one medication to save in this prescription template.", "No Medications");
      return;
    }

    try {
      setSavingTemplate(true);
      await prescriptionsApi.saveTemplate({
        name: cleanTplName,
        diseaseId: Number(selectedDiseaseId),
        items: prescribedItems.map(item => ({
          medicineId: item.medicineId,
          dosage: sanitizeText(item.dosage) || "Once daily",
          days: Number(item.days),
          quantity: Number(item.quantity),
          instruction: sanitizeText(item.instruction) || "As directed",
        })),
      });
      setTemplateName("");
      showAlert("Prescription protocol template saved successfully!", "Template Saved");
      const res = await prescriptionsApi.templates({ diseaseId: selectedDiseaseId });
      setTemplates(toArray(res));
    } catch (err) {
      console.error(err);
      showError(err);
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleUpdateStatus = async (apptId, status) => {
    const ok = await showConfirm(`Are you sure you want to ${status} this appointment?`);
    if (!ok) return;

    try {
      await appointmentsApi.updateStatus(apptId, { status, notes: "" });
      await showAlert(`Appointment status changed to ${status}`);
      loadAppointments(page);
    } catch (e) {
      showError(e?.response?.data?.message || "Failed to update appointment status.");
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader
        title={t.appointments}
        subtitle="Manage slots, EMR patient consultation flow, and real-time medical prescriptions."
      />

      {/* Advanced Filters */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-card/90 backdrop-blur-md border border-border/80 rounded-3xl p-4 shadow-scms">
        <SearchForm
          value={patientSearch}
          onChange={(val) => setPatientSearch(val)}
          onSubmit={handleSearchSubmit}
          placeholder="Search by patient name..."
          className="w-full max-w-2xl flex-1 border-0 bg-transparent p-0 shadow-none"
        />

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Date Filter Buttons */}
          <div className="flex items-center gap-1 bg-secondary/80 p-1 rounded-2xl w-full sm:w-auto border border-border/60">
            {["all", "today", "week", "month"].map(f => (
              <button
                key={f}
                onClick={() => { setDateFilter(f); setPage(1); }}
                className={`flex-1 sm:flex-initial text-xs font-semibold px-3 py-1.5 rounded-xl transition-all capitalize ${dateFilter === f ? "bg-card text-foreground font-bold shadow-xs ring-1 ring-border" : "text-muted-foreground hover:text-foreground"}`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-secondary/80 p-1 rounded-2xl ml-auto md:ml-0 shrink-0 border border-border/60">
            <button
              onClick={() => setViewMode("table")}
              className={`p-2 rounded-xl transition btn-target ${viewMode === "table" ? "bg-card text-foreground font-bold shadow-xs ring-1 ring-border" : "text-muted-foreground hover:text-foreground"}`}
              title="Table view"
            >
              <ListBulletIcon className="w-4 h-4 shrink-0" />
            </button>
            <button
              onClick={() => setViewMode("card")}
              className={`p-2 rounded-xl transition btn-target ${viewMode === "card" ? "bg-card text-foreground font-bold shadow-xs ring-1 ring-border" : "text-muted-foreground hover:text-foreground"}`}
              title="Slot Cards view"
            >
              <GridIcon className="w-4 h-4 shrink-0" />
            </button>
          </div>
        </div>
      </div>

      {/* Main content view */}
      {loading ? (
        <div className="grid place-items-center h-60 bg-card rounded-3xl border border-border/80">
          <span className="loading loading-spinner loading-md text-orange-600 dark:text-orange-400" />
        </div>
      ) : appointments.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-card rounded-3xl border border-dashed border-border/80">
          <CalendarIcon className="w-12 h-12 text-muted-foreground/40 mb-2 animate-pulse" />
          <p className="text-sm font-bold text-muted-foreground">No appointments found for the selected query.</p>
        </div>
      ) : viewMode === "table" ? (
        /* TABLE LAYOUT */
        <div className="overflow-hidden rounded-3xl border border-border/80 bg-card/95 backdrop-blur-md shadow-scms">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="border-b border-border/80 bg-secondary/50 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3.5 w-12 text-center">No.</th>
                  <th className="px-4 py-3.5">Appointment Code</th>
                  <th className="px-4 py-3.5">Patient Name</th>
                  <th className="px-4 py-3.5">Appointment Date</th>
                  <th className="px-4 py-3.5">Queue Token</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Consulting Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {appointments.map((appt, index) => {
                  const rowNo = ((page - 1) * pageSize) + index + 1;
                  return (
                  <tr
                    key={appt.appointmentId || appt.id}
                    onClick={() => { setSelectedAppt(appt); setDetailOpen(true); }}
                    className="hover:bg-secondary/60 cursor-pointer transition"
                  >
                    <td className="px-4 py-3.5 text-center font-mono text-xs text-muted-foreground font-semibold">{rowNo}</td>
                    <td className="px-4 py-3.5 font-extrabold text-orange-600 dark:text-orange-400 font-mono text-sm">{appt.appointmentCode}</td>
                    <td className="px-4 py-3.5 font-bold text-foreground">{appt.patientName || appt.patient?.name || appt.patientId}</td>
                    <td className="px-4 py-3.5 font-medium text-muted-foreground">{formatDateTime(appt.datetime)}</td>
                    <td className="px-4 py-3.5 font-bold text-orange-600 dark:text-orange-400 font-mono text-center sm:text-left">{appt.tokenNumber || "-"}</td>
                    <td className="px-4 py-3.5">
                      <span className={`text-[10px] font-bold border px-2.5 py-0.5 rounded-full ${getStatusClass(appt.status)}`}>
                        {String(appt.status).toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1.5">
                        {appt.status !== "completed" && appt.status !== "cancelled" ? (
                          <>
                            <button
                              onClick={() => openConsulting(appt)}
                              className="scms-btn-primary px-3 py-1 text-xs font-bold flex items-center gap-1 btn-target rounded-xl"
                              title="EMR Consultation Wizard"
                            >
                              <ActivityLogIcon className="w-3.5 h-3.5" />
                              EMR
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(appt.appointmentId || appt.id, "cancelled")}
                              className="scms-btn-outline px-2.5 py-1 text-xs text-destructive hover:bg-destructive/10 rounded-xl btn-target"
                              title="Cancel slot"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <span className="text-xs font-semibold text-muted-foreground py-1 px-2.5 bg-secondary rounded-xl">
                            Consulted
                          </span>
                        )}
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
            {appointments.map((appt, index) => {
              const rowNo = ((page - 1) * pageSize) + index + 1;
              return (
            <div
              key={appt.appointmentId || appt.id}
              onClick={() => { setSelectedAppt(appt); setDetailOpen(true); }}
              className="bg-card/95 border border-border/80 hover:border-orange-300 dark:hover:border-orange-800 rounded-3xl p-5 shadow-scms hover:shadow-scms-raised cursor-pointer transition flex flex-col justify-between min-h-[186px] h-full space-y-3"
            >
              <div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-[11px] font-bold text-muted-foreground">No. {rowNo}</span>
                  <span className="text-xs font-extrabold text-orange-600 dark:text-orange-400 font-mono">{appt.appointmentCode}</span>
                  <span className={`text-[9px] font-bold border px-2 py-0.5 rounded-full ${getStatusClass(appt.status)}`}>
                    {String(appt.status).toUpperCase()}
                  </span>
                </div>
                <div className="mt-4">
                  <h4 className="font-bold text-foreground text-sm">{appt.patientName || appt.patient?.name || appt.patientId}</h4>
                  <div className="mt-2 text-xs flex items-center gap-1 text-muted-foreground font-medium">
                    <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
                    {formatDateTime(appt.datetime)}
                  </div>
                  {appt.tokenNumber > 0 && (
                    <div className="mt-2 text-xs font-semibold text-orange-600 dark:text-orange-400">
                      Queue Token: <strong className="font-mono">{appt.tokenNumber}</strong>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-border/70 flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                {appt.status !== "completed" && appt.status !== "cancelled" ? (
                  <>
                    <button
                      onClick={() => openConsulting(appt)}
                      className="scms-btn-primary w-full py-2 text-xs font-bold rounded-2xl flex items-center justify-center gap-1 btn-target"
                    >
                      <ActivityLogIcon className="w-3.5 h-3.5" />
                      Consult EMR
                    </button>
                  </>
                ) : (
                  <span className="text-xs font-semibold text-muted-foreground py-1 px-2 bg-secondary rounded-xl w-full text-center">
                    Consultation Completed
                  </span>
                )}
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
        label="slots"
        loading={loading}
        onPageChange={setPage}
      />

      {/* --- APPOINTMENT DETAILS MODAL --- */}
      <ModalPortal
        isOpen={detailOpen && Boolean(selectedAppt)}
        onClose={() => setDetailOpen(false)}
      >
        {selectedAppt && (
          <div className="w-full max-w-md rounded-3xl border border-border/80 bg-card text-card-foreground p-6 shadow-scms-modal relative">
            <div className="flex justify-between items-start gap-3 border-b border-slate-100 pb-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 font-mono">Slot {selectedAppt.appointmentCode}</span>
                  <span className={`text-[10px] font-black border px-2.5 py-0.5 rounded-full ${getStatusClass(selectedAppt.status)}`}>
                    {String(selectedAppt.status).toUpperCase()}
                  </span>
                </div>
                <h3 className="text-lg font-black text-scms-text mt-1.5">{selectedAppt.patientName || selectedAppt.patient?.name}</h3>
              </div>
              <button
                onClick={() => setDetailOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition btn-target"
              >
                <Cross2Icon className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed">
              <div className="flex justify-between text-slate-500 font-semibold">
                <span>Appointment Date:</span>
                <strong className="text-scms-text">{formatDateTime(selectedAppt.datetime)}</strong>
              </div>
              {selectedAppt.tokenNumber > 0 && (
                <div className="flex justify-between text-slate-500 font-semibold">
                  <span>Queue Position:</span>
                  <strong className="text-indigo-600 font-mono">{selectedAppt.tokenNumber}</strong>
                </div>
              )}
              {selectedAppt.notes && (
                <div className="mt-2 pt-2 border-t border-slate-100">
                  <span className="text-slate-500 font-bold block mb-1">Doctor/Visit Notes:</span>
                  <p className="text-scms-muted font-medium bg-slate-50 border border-slate-100 p-2.5 rounded-lg italic">
                    &ldquo;{selectedAppt.notes}&rdquo;
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </ModalPortal>

      {/* --- EMR CLINICAL CONSULT WORKSPACE MODAL (Wizard/Single-Screen EHR Layout) --- */}
      <ModalPortal
        isOpen={emrOpen && Boolean(activeAppt)}
        onClose={() => setEmrOpen(false)}
      >
        {activeAppt && (
          <div className="w-full max-w-6xl rounded-3xl border border-border/80 bg-card text-card-foreground p-6 shadow-scms-modal relative max-h-[92vh] overflow-hidden flex flex-col justify-between">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center bg-indigo-50 text-indigo-600 rounded-xl">
                  <ActivityLogIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-md font-black text-scms-text">
                    Clinical Consulting Workspace
                  </h3>
                  <span className="text-xs font-semibold text-scms-muted">
                    Active Patient: <strong className="text-scms-text font-black">{activeAppt.patientName || activeAppt.patient?.name}</strong> | Slot: {activeAppt.appointmentCode}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEmrOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition btn-target"
                aria-label="Close"
              >
                <Cross2Icon className="w-4 h-4" />
              </button>
            </div>

            {/* Split consulting panels */}
            <div className="flex-1 overflow-y-auto py-5 grid gap-6 lg:grid-cols-[1.1fr_1.1fr] pr-1">
              
              {/* LEFT COLUMN: Vitals, Symptoms, Diagnosis */}
              <div className="space-y-5">
                <div className="bg-slate-50/50 rounded-2xl border border-slate-200/60 p-4 space-y-4">
                  <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                    <HeartIcon className="w-4 h-4 text-rose-500" />
                    Patient Vitals & Measurements
                  </h4>
                  
                  <div className="grid gap-3 grid-cols-3 text-xs">
                    <label className="block">
                      <span className="mb-1 block font-bold text-slate-500">Weight (kg)</span>
                      <input
                        type="text"
                        placeholder="e.g. 70"
                        className="input input-bordered h-9 rounded-lg text-xs w-full"
                        value={vitals.weightKg}
                        onChange={(e) => setVitals(p => ({ ...p, weightKg: e.target.value }))}
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1 block font-bold text-slate-500">Height (cm)</span>
                      <input
                        type="text"
                        placeholder="e.g. 175"
                        className="input input-bordered h-9 rounded-lg text-xs w-full"
                        value={vitals.heightCm}
                        onChange={(e) => setVitals(p => ({ ...p, heightCm: e.target.value }))}
                      />
                    </label>

                    <div className="block">
                      <span className="mb-1 block font-bold text-slate-500">BMI (Auto)</span>
                      <div className="h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center px-3 font-extrabold text-indigo-700">
                        {calculateBmi()}
                      </div>
                    </div>

                    <label className="block">
                      <span className="mb-1 block font-bold text-slate-500">BP Systolic</span>
                      <input
                        type="text"
                        placeholder="e.g. 120"
                        className="input input-bordered h-9 rounded-lg text-xs w-full"
                        value={vitals.bloodPressureSystolic}
                        onChange={(e) => setVitals(p => ({ ...p, bloodPressureSystolic: e.target.value }))}
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1 block font-bold text-slate-500">BP Diastolic</span>
                      <input
                        type="text"
                        placeholder="e.g. 80"
                        className="input input-bordered h-9 rounded-lg text-xs w-full"
                        value={vitals.bloodPressureDiastolic}
                        onChange={(e) => setVitals(p => ({ ...p, bloodPressureDiastolic: e.target.value }))}
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1 block font-bold text-slate-500">Temp (°F)</span>
                      <input
                        type="text"
                        placeholder="e.g. 98.6"
                        className="input input-bordered h-9 rounded-lg text-xs w-full"
                        value={vitals.temperatureF}
                        onChange={(e) => setVitals(p => ({ ...p, temperatureF: e.target.value }))}
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1 block font-bold text-slate-500">Pulse (BPM)</span>
                      <input
                        type="text"
                        placeholder="e.g. 72"
                        className="input input-bordered h-9 rounded-lg text-xs w-full"
                        value={vitals.pulseBpm}
                        onChange={(e) => setVitals(p => ({ ...p, pulseBpm: e.target.value }))}
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1 block font-bold text-slate-500">Spo2 (%)</span>
                      <input
                        type="text"
                        placeholder="e.g. 98"
                        className="input input-bordered h-9 rounded-lg text-xs w-full"
                        value={vitals.spo2Percent}
                        onChange={(e) => setVitals(p => ({ ...p, spo2Percent: e.target.value }))}
                      />
                    </label>
                  </div>
                </div>

                <div className="bg-slate-50/50 rounded-2xl border border-slate-200/60 p-4 space-y-4">
                  <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                    <FileTextIcon className="w-4 h-4 text-indigo-600" />
                    Consultation & Diagnosis
                  </h4>

                  <label className="block text-xs">
                    <span className="mb-1.5 block font-bold text-slate-500">Select Diagnosed Disease</span>
                    <select
                      className="select select-bordered h-10 rounded-xl text-xs w-full bg-white"
                      value={selectedDiseaseId}
                      onChange={(e) => setSelectedDiseaseId(e.target.value)}
                    >
                      <option value="">Select Disease</option>
                      {diseases.map(d => (
                        <option key={d.id || d.diseaseId} value={d.id || d.diseaseId}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  {/* Disease-Linked Templates Quick-Load */}
                  {selectedDiseaseId && templates.length > 0 && (
                    <div className="mt-2 text-xs bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100/50">
                      <span className="block font-black text-indigo-950 mb-2">Quick Load Prescription Template:</span>
                      <div className="flex flex-wrap gap-2">
                        {templates.map(tpl => (
                          <button
                            key={tpl.id}
                            type="button"
                            onClick={() => applyTemplate(tpl)}
                            className="px-3 py-1.5 bg-white hover:bg-indigo-600 hover:text-white border border-indigo-200 hover:border-indigo-600 text-indigo-700 font-extrabold rounded-xl transition shadow-sm text-xs flex items-center gap-1"
                          >
                            <BookmarkIcon className="w-3 h-3" />
                            {tpl.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <label className="block text-xs">
                    <span className="mb-1.5 block font-bold text-slate-500">Consultation Notes / Patient Complaints</span>
                    <textarea
                      placeholder="Enter chief complaints, physical exam details, or diagnostic notes..."
                      className="textarea textarea-bordered rounded-xl text-xs w-full min-h-24 bg-white"
                      value={vitals.notes}
                      onChange={(e) => setVitals(p => ({ ...p, notes: e.target.value }))}
                    />
                  </label>
                </div>

                {/* Optional Follow-up Scheduling Section */}
                <div className="mt-4 pt-3 border-t border-slate-200 text-xs space-y-3 bg-indigo-50/30 p-3.5 rounded-2xl border border-indigo-100/50">
                  <label className="flex items-center gap-2.5 cursor-pointer font-extrabold text-scms-text">
                    <input
                      type="checkbox"
                      checked={scheduleFollowUp}
                      onChange={(e) => setScheduleFollowUp(e.target.checked)}
                      className="checkbox checkbox-sm checkbox-primary rounded-lg"
                    />
                    <span className="text-xs">Schedule Follow-up Revisit?</span>
                  </label>
                  {scheduleFollowUp && (
                    <div className="space-y-3 animate-fadeIn">
                      <label className="block">
                        <span className="block font-bold text-slate-500 mb-1">Follow-up Due Date</span>
                        <DateInput
                          className="input input-bordered h-9 text-xs w-full bg-white rounded-lg"
                          value={followUpDate}
                          onChange={(e) => setFollowUpDate(e.target.value)}
                        />
                      </label>
                      <label className="block">
                        <span className="block font-bold text-slate-500 mb-1">Follow-up Instructions & Advice</span>
                        <textarea
                          placeholder="Instructions for follow-up review, home blood pressure monitoring, glucose checks, etc..."
                          className="textarea textarea-bordered text-xs w-full bg-white min-h-16 rounded-xl"
                          value={followUpNotes}
                          onChange={(e) => setFollowUpNotes(e.target.value)}
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: Prescription Items */}
              <div className="bg-slate-50/50 rounded-2xl border border-slate-200/60 p-4 flex flex-col justify-between min-h-[350px]">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2 mb-4">
                    <ArchiveIcon className="w-4 h-4 text-emerald-600" />
                    Prescribe Medication
                  </h4>

                  {/* Add Medication dropdown */}
                  <div className="flex gap-2 mb-4">
                    <select
                      className="select select-bordered h-10 rounded-xl text-xs flex-1 bg-white"
                      value={selectedMedicineId}
                      onChange={(e) => setSelectedMedicineId(e.target.value)}
                    >
                      <option value="">Select Medicine to Add</option>
                      {medicines.filter(m => (m.totalStock ?? m.stock ?? 0) > 0).map(m => (
                        <option key={m.medicineId} value={m.medicineId}>
                          {m.name} (Stock: {m.totalStock ?? m.stock ?? 0})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={addPrescribedMedicine}
                      className="btn btn-sm bg-scms-primary hover:bg-scms-primaryDark text-white h-10 px-4 rounded-xl border-0 font-extrabold text-xs flex items-center gap-1 btn-target"
                    >
                      <PlusIcon className="w-3.5 h-3.5" />
                      Add
                    </button>
                  </div>

                  {/* Added medicines list */}
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {prescribedItems.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 text-xs font-semibold">
                        <ArchiveIcon className="w-8 h-8 mx-auto mb-2 opacity-40 animate-pulse" />
                        No medicines added to this prescription yet.
                      </div>
                    ) : (
                      prescribedItems.map((item) => (
                        <div key={item.medicineId} className="bg-white border border-slate-100 p-3 rounded-2xl space-y-2.5 relative">
                          <button
                            type="button"
                            onClick={() => removePrescribedMedicine(item.medicineId)}
                            className="absolute right-2 top-2 p-1 text-red-500 hover:bg-red-50 rounded-lg btn-target"
                            title="Remove item"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>

                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs text-scms-text block pr-6 truncate">{item.medicineName}</span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${item.stockLeft < 20 ? "bg-red-100 text-red-800" : "bg-emerald-50 text-emerald-800"}`}>
                              Stock: {item.stockLeft}
                            </span>
                          </div>

                          <div className="grid gap-2 grid-cols-4 text-[11px]">
                            <label className="block col-span-1">
                              <span className="block text-slate-400 font-bold mb-0.5">How often?</span>
                              <select
                                className="select select-bordered select-xs h-7 rounded w-full font-semibold"
                                value={commonDosageValues.includes(item.dosage) ? item.dosage : "Custom"}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  updateItemField(item.medicineId, "dosage", val === "Custom" ? "Every 8 hours" : val);
                                }}
                              >
                                {dosageOptions.map((option) => (
                                  <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                              </select>
                              
                              {!commonDosageValues.includes(item.dosage) && (
                                <input
                                  type="text"
                                  className="input input-bordered input-xs h-6 rounded mt-1 text-center w-full text-[10px]"
                                  value={item.dosage}
                                  onChange={(e) => updateItemField(item.medicineId, "dosage", e.target.value)}
                                  placeholder="e.g. Every 8 hours"
                                />
                              )}
                            </label>

                            <label className="block">
                              <span className="block text-slate-400 font-bold mb-0.5">Days</span>
                              <input
                                type="number"
                                className="input input-bordered input-xs h-7 rounded text-center w-full"
                                value={item.days}
                                onChange={(e) => updateItemField(item.medicineId, "days", e.target.value)}
                              />
                            </label>

                            <label className="block col-span-2">
                              <span className="block text-slate-400 font-bold mb-0.5">Instruction</span>
                              <select
                                className="select select-bordered select-xs h-7 rounded w-full"
                                value={item.instruction}
                                onChange={(e) => updateItemField(item.medicineId, "instruction", e.target.value)}
                              >
                                <option value="After meal">After meal</option>
                                <option value="Before meal">Before meal</option>
                                <option value="With meal">With meal</option>
                                <option value="Bedtime">Bedtime</option>
                                <option value="Anytime / As needed">Anytime</option>
                              </select>
                            </label>
                          </div>

                          <div className="flex items-center justify-between text-[10px] pt-1 text-scms-muted border-t border-slate-100 font-semibold">
                            <span>Total quantity: <strong className="text-scms-text font-black">{item.quantity} units</strong></span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Save Template Section */}
                  {prescribedItems.length > 0 && selectedDiseaseId && (
                    <div className="mt-4 pt-3.5 border-t border-slate-200 bg-emerald-50/20 p-3.5 rounded-2xl border border-emerald-100/40 text-xs">
                      <span className="block font-extrabold text-emerald-950 mb-1.5">Save Current Prescription as Template:</span>
                      <div className="flex gap-2">
                        <input
                          placeholder="Template name, e.g. URI Fever Routine"
                          className="input input-bordered input-sm text-xs flex-1 bg-white h-9 rounded-lg"
                          value={templateName}
                          onChange={(e) => setTemplateName(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={handleSaveTemplate}
                          disabled={savingTemplate}
                          className="btn btn-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg border-0 px-3 flex items-center gap-1 font-black h-9 text-xs"
                        >
                          {savingTemplate ? "Saving..." : "Save"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Actions Footer */}
            <div className="pt-4 border-t border-slate-100 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={handleSaveConsult}
                disabled={savingConsult}
                className="scms-btn-primary h-11 px-8 flex items-center gap-2 font-black text-sm"
              >
                {savingConsult ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  <>
                    <MagicWandIcon className="w-4 h-4" />
                    Complete consult & download prescription PDF
                  </>
                )}
              </button>
            </div>

          </div>
        )}
      </ModalPortal>
    </div>
  );
}

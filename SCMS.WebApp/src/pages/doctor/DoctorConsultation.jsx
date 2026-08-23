import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronLeftIcon,
  HeartIcon,
  ActivityLogIcon,
  FileTextIcon,
  PlusIcon,
  TrashIcon,
  BookmarkIcon,
  CheckCircledIcon,
  Cross2Icon,
  ClockIcon,
  ExclamationTriangleIcon,
} from "@radix-ui/react-icons";
import {
  appointmentsApi,
  patientsApi,
  diseasesApi,
  medicinesApi,
  prescriptionsApi,
  followUpsApi,
  downloadBlob,
} from "../../services/scmsApi";
import { showAlert, showError, showSuccess } from "../../services/dialogs";
import { useLanguage } from "../../context/LanguageContext";
import {
  calculateQuantity,
  commonDosageValues,
  parsePrescriptionNotes,
} from "../../utils/clinical";
import {
  sanitizeText,
  validateClinicalVitals,
  validateNumberRange,
} from "../../utils/validation";
import { formatDate } from "../../utils/format";
import DateInput from "../../components/DateInput";
import { Select } from "../../components/ui/select";
import useScrollLock from "../../hooks/useScrollLock";
import ModalPortal from "../../components/ModalPortal";

const toArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.result)) return data.result;
  return [];
};

export default function DoctorConsultation() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [appointment, setAppointment] = useState(null);
  const [patient, setPatient] = useState(null);

  // Vitals State
  const [vitals, setVitals] = useState({
    weightKg: "",
    heightCm: "",
    bloodPressureSystolic: "",
    bloodPressureDiastolic: "",
    temperatureF: "98.6",
    pulseBpm: "72",
    spo2Percent: "98",
    notes: "",
  });
  const [tempUnit, setTempUnit] = useState("F"); // "F" or "C"

  // Diagnosis & Prescription State
  const [diseases, setDiseases] = useState([]);
  const [selectedDiseaseId, setSelectedDiseaseId] = useState("");
  const [diagnosisNotes, setDiagnosisNotes] = useState("");

  const [medicines, setMedicines] = useState([]);
  const [selectedMedId, setSelectedMedId] = useState("");
  const [currentDosage, setCurrentDosage] = useState("1-0-1");
  const [currentDays, setCurrentDays] = useState(5);
  const [currentInstructions, setCurrentInstructions] = useState("After meals");

  // Prescription items state
  const [prescribedItems, setPrescribedItems] = useState([]);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");

  // Patient History Drawer State
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [patientHistory, setPatientHistory] = useState(null);

  useScrollLock(templateModalOpen || historyDrawerOpen);

  // Template State
  const [templates, setTemplates] = useState([]);

  // Follow-up State
  const [hasFollowUp, setHasFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpNotes, setFollowUpNotes] = useState("");

  // Load Appointment, Patient, Catalog Data
  useEffect(() => {
    const loadAll = async () => {
      try {
        setLoading(true);
        const [medsRes, diseasesRes, templatesRes] = await Promise.allSettled([
          medicinesApi.list({ pageSize: 100 }),
          diseasesApi.list({ pageSize: 100 }),
          prescriptionsApi.templates(),
        ]);

        setMedicines(medsRes.status === "fulfilled" ? toArray(medsRes.value) : []);
        setDiseases(diseasesRes.status === "fulfilled" ? toArray(diseasesRes.value) : []);
        setTemplates(templatesRes.status === "fulfilled" ? toArray(templatesRes.value) : []);

        // Load appointment info
        if (appointmentId) {
          const apptList = await appointmentsApi.list({ pageSize: 100 });
          const allAppts = toArray(apptList);
          const matched = allAppts.find(
            (a) =>
              String(a.id) === String(appointmentId) ||
              String(a.appointmentId) === String(appointmentId) ||
              String(a.appointmentCode) === String(appointmentId)
          );

          if (matched) {
            setAppointment(matched);
            if (matched.notes) setDiagnosisNotes(matched.notes);

            // Fetch patient details
            if (matched.patientId) {
              const pData = await patientsApi.get(matched.patientId);
              const pObj = pData?.data || pData || matched.patient;
              setPatient(pObj);
            }
          }
        }
      } catch (err) {
        console.error("Consultation initialization error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, [appointmentId]);

  // Load Patient Medical History
  const handleOpenHistoryDrawer = async () => {
    setHistoryDrawerOpen(true);
    const pId = appointment?.patientId || patient?.id || patient?.patientId;
    if (!pId) return;

    try {
      setHistoryLoading(true);
      const res = await patientsApi.history(pId);
      setPatientHistory(res?.data || res || {});
    } catch (err) {
      console.error("Fetch patient history error:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Compute BMI
  const bmi = useMemo(() => {
    const w = parseFloat(vitals.weightKg);
    const h = parseFloat(vitals.heightCm);
    if (!w || !h || h <= 0) return null;
    const heightInMeters = h / 100;
    const val = w / (heightInMeters * heightInMeters);
    let category = "Normal";
    if (val < 18.5) category = "Underweight";
    else if (val >= 25 && val < 30) category = "Overweight";
    else if (val >= 30) category = "Obese";
    return { val: val.toFixed(1), category };
  }, [vitals.weightKg, vitals.heightCm]);

  // Add Item to Prescription
  const handleAddMedicine = () => {
    if (!selectedMedId) return;
    const med = medicines.find((m) => String(m.id || m.medicineId) === String(selectedMedId));
    if (!med) return;

    const qty = calculateQuantity(currentDosage, currentDays);
    const newItem = {
      medicineId: med.id || med.medicineId,
      medicineName: med.name,
      dosage: currentDosage,
      days: Number(currentDays),
      quantity: qty,
      instructions: currentInstructions,
    };

    setPrescribedItems((prev) => [...prev, newItem]);
    setSelectedMedId("");
  };

  const handleRemoveItem = (index) => {
    setPrescribedItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Set quick follow-up timeframe
  const setQuickFollowUp = (days) => {
    setHasFollowUp(true);
    const d = new Date();
    d.setDate(d.getDate() + days);
    setFollowUpDate(d.toISOString().slice(0, 10));
  };

  // Load Template
  const handleLoadTemplate = (tItem) => {
    if (!tItem?.items) return;
    setPrescribedItems(tItem.items);
    if (tItem.notes) setDiagnosisNotes(tItem.notes);
    showSuccess(`Template "${tItem.templateName || tItem.name}" loaded successfully.`);
  };

  // Save Prescription as Template
  const handleSaveTemplate = async () => {
    const cleanTplName = sanitizeText(templateName);
    if (!cleanTplName || cleanTplName.length < 2) {
      showError("Please enter a valid template name (at least 2 characters).", "Invalid Template Name");
      return;
    }
    if (prescribedItems.length === 0) {
      showError("Please add at least one medication to the prescription template.", "No Medications");
      return;
    }

    try {
      await prescriptionsApi.saveTemplate({
        name: cleanTplName,
        templateName: cleanTplName,
        notes: sanitizeText(diagnosisNotes) || null,
        items: prescribedItems.map((p) => ({
          medicineId: Number(p.medicineId),
          dosage: sanitizeText(p.dosage) || "Once daily",
          quantity: Number(p.quantity),
          days: Number(p.days),
          durationDays: Number(p.days),
          instructions: sanitizeText(p.instructions) || "As directed",
        })),
      });
      setTemplateModalOpen(false);
      setTemplateName("");
      showSuccess("Prescription template saved successfully.");
      const updated = await prescriptionsApi.templates();
      setTemplates(toArray(updated));
    } catch (err) {
      showError(err);
    }
  };

  // Submit and Complete Consult
  const handleCompleteConsultation = async () => {
    if (!appointment) return;
    const pId = appointment.patientId || patient?.id || patient?.patientId;

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

    if (hasFollowUp && !followUpDate) {
      showError("Please select a due date for the scheduled follow-up visit.", "Missing Follow-up Date");
      return;
    }

    // Validate prescription items
    for (const item of prescribedItems) {
      const qVal = validateNumberRange(item.quantity, {
        label: `${item.medicineName} Quantity`,
        min: 1,
        max: 10000,
        isInteger: true,
      });
      if (!qVal.isValid) {
        showError(qVal.error, "Invalid Medication Quantity");
        return;
      }
      const dVal = validateNumberRange(item.days, {
        label: `${item.medicineName} Days`,
        min: 1,
        max: 365,
        isInteger: true,
      });
      if (!dVal.isValid) {
        showError(dVal.error, "Invalid Treatment Days");
        return;
      }
    }

    try {
      setSaving(true);

      // 1. Create Prescription if any items added
      let presId = null;
      if (prescribedItems.length > 0) {
        const presRes = await prescriptionsApi.create({
          appointmentId: appointment.id || appointment.appointmentId,
          patientId: pId,
          diseaseId: selectedDiseaseId ? Number(selectedDiseaseId) : null,
          notes: sanitizeText(diagnosisNotes) || null,
          items: prescribedItems.map((p) => ({
            medicineId: Number(p.medicineId),
            dosage: sanitizeText(p.dosage) || "Once daily",
            quantity: Number(p.quantity),
            durationDays: Number(p.days),
            days: Number(p.days),
            instructions: sanitizeText(p.instructions) || "As directed",
          })),
        });
        presId = presRes?.id || presRes?.data?.id;
      }

      // 2. Schedule Follow-up if active
      if (hasFollowUp && followUpDate) {
        await followUpsApi.create({
          patientId: Number(pId),
          appointmentId: Number(appointment.id || appointment.appointmentId),
          followUpDate: `${followUpDate}T09:00:00`,
          notes: sanitizeText(followUpNotes) || "Post-consultation follow up",
        });
      }

      // 3. Mark appointment completed
      const apptId = appointment.id || appointment.appointmentId;
      await appointmentsApi.updateStatus(apptId, { status: "Completed" });

      await showAlert(
        "Consultation finished and digital prescription issued successfully.",
        "Consultation Complete"
      );

      // Offer PDF download
      if (presId) {
        try {
          const pdfBlob = await prescriptionsApi.pdf(presId);
          downloadBlob(pdfBlob, `prescription-${presId}.pdf`);
        } catch {
          console.log("Auto-download skipped");
        }
      }

      navigate("/doctor/dashboard");
    } catch (err) {
      showError(
        err?.response?.data?.message || err?.message || "Failed to complete clinical consultation."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="grid place-items-center h-64 rounded-3xl border border-border/80 bg-card">
        <span className="loading loading-spinner loading-md text-orange-600 dark:text-orange-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={() => navigate("/doctor/dashboard")}
          className="scms-btn-outline flex items-center gap-2 text-xs font-bold btn-target"
        >
          <ChevronLeftIcon className="w-4 h-4" />
          <span>Back to Patient Queue</span>
        </button>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleOpenHistoryDrawer}
            className="scms-btn-outline flex items-center gap-1.5 text-xs font-bold btn-target text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-900/60"
          >
            <ClockIcon className="w-4 h-4" />
            <span>Patient EMR History</span>
          </button>

          {templates.length > 0 && (
            <div className="w-44">
              <Select
                placeholder={t.loadTemplate || "Load Template"}
                options={templates.map((tpl) => ({
                  value: String(tpl.id),
                  label: tpl.templateName || tpl.name || `Template #${tpl.id}`,
                }))}
                onChange={(val) => {
                  const tItem = templates.find((t) => String(t.id) === String(val));
                  if (tItem) handleLoadTemplate(tItem);
                }}
              />
            </div>
          )}

          <button
            onClick={() => setTemplateModalOpen(true)}
            className="scms-btn-outline flex items-center gap-1.5 text-xs font-bold btn-target"
          >
            <BookmarkIcon className="w-4 h-4" />
            <span>{t.saveAsTemplate || "Save As Template"}</span>
          </button>
        </div>
      </div>

      {/* Patient Header Card */}
      <section className="rounded-3xl border border-border/80 bg-card p-6 shadow-scms">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-orange-500 text-white font-bold text-lg shrink-0 shadow-2xs">
              {patient?.name?.[0] || "P"}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-foreground">
                  {patient?.name || appointment?.patientName || "Patient Record"}
                </h1>
                <span className="font-mono text-xs font-bold bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 px-2.5 py-0.5 rounded-full border border-orange-200 dark:border-orange-900">
                  {appointment?.tokenNumber ? `Token #${appointment.tokenNumber}` : "In Consultation"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {patient?.gender || "Patient"} • {patient?.phone || "No phone registered"} • Blood Type:{" "}
                <strong className="text-rose-600 dark:text-rose-400 font-bold">
                  {patient?.bloodType || "O+"}
                </strong>
              </p>
            </div>
          </div>

          {patient?.allergies ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 dark:bg-rose-950/40 p-3.5 text-xs text-rose-800 dark:text-rose-300 max-w-sm">
              <div className="flex items-center gap-1.5 font-bold mb-0.5">
                <ExclamationTriangleIcon className="w-3.5 h-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>Known Allergies:</span>
              </div>
              {patient.allergies}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground italic bg-secondary/40 px-3.5 py-2 rounded-2xl">
              No drug or food allergies on record
            </div>
          )}
        </div>
      </section>

      {/* Main Consultation Layout */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Vitals & Diagnosis */}
        <div className="lg:col-span-5 space-y-6">
          {/* Vitals Matrix */}
          <section className="rounded-3xl border border-border/80 bg-card/95 p-6 shadow-scms space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <HeartIcon className="w-4 h-4 text-orange-500" />
                <span>{t.vitalsMatrix || "Patient Vitals Matrix"}</span>
              </h2>
              {bmi && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    bmi.category === "Normal"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                  }`}
                >
                  BMI: {bmi.val} ({bmi.category})
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <label className="block">
                <span className="mb-1 block font-semibold text-muted-foreground">
                  {t.weight || "Weight (kg)"}
                </span>
                <input
                  type="number"
                  step="0.1"
                  className="scms-input w-full text-xs font-mono"
                  value={vitals.weightKg}
                  onChange={(e) => setVitals((v) => ({ ...v, weightKg: e.target.value }))}
                  placeholder="e.g. 65"
                />
              </label>

              <label className="block">
                <span className="mb-1 block font-semibold text-muted-foreground">
                  {t.height || "Height (cm)"}
                </span>
                <input
                  type="number"
                  className="scms-input w-full text-xs font-mono"
                  value={vitals.heightCm}
                  onChange={(e) => setVitals((v) => ({ ...v, heightCm: e.target.value }))}
                  placeholder="e.g. 170"
                />
              </label>

              <label className="block">
                <span className="mb-1 block font-semibold text-muted-foreground">
                  BP (Systolic / Diastolic)
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    className="scms-input w-full text-xs font-mono text-center"
                    value={vitals.bloodPressureSystolic}
                    onChange={(e) =>
                      setVitals((v) => ({ ...v, bloodPressureSystolic: e.target.value }))
                    }
                    placeholder="120"
                  />
                  <span className="text-muted-foreground font-bold">/</span>
                  <input
                    type="number"
                    className="scms-input w-full text-xs font-mono text-center"
                    value={vitals.bloodPressureDiastolic}
                    onChange={(e) =>
                      setVitals((v) => ({ ...v, bloodPressureDiastolic: e.target.value }))
                    }
                    placeholder="80"
                  />
                </div>
              </label>

              <label className="block">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-muted-foreground">
                    {t.temperature || "Temperature"} (°{tempUnit})
                  </span>
                  <button
                    type="button"
                    onClick={() => setTempUnit((u) => (u === "F" ? "C" : "F"))}
                    className="text-[10px] font-bold text-orange-600 dark:text-orange-400 hover:underline"
                  >
                    Switch to °{tempUnit === "F" ? "C" : "F"}
                  </button>
                </div>
                <input
                  type="number"
                  step="0.1"
                  className="scms-input w-full text-xs font-mono"
                  value={vitals.temperatureF}
                  onChange={(e) => setVitals((v) => ({ ...v, temperatureF: e.target.value }))}
                  placeholder="98.6"
                />
              </label>

              <label className="block">
                <span className="mb-1 block font-semibold text-muted-foreground">
                  {t.pulse || "Pulse (bpm)"}
                </span>
                <input
                  type="number"
                  className="scms-input w-full text-xs font-mono"
                  value={vitals.pulseBpm}
                  onChange={(e) => setVitals((v) => ({ ...v, pulseBpm: e.target.value }))}
                  placeholder="72"
                />
              </label>

              <label className="block">
                <span className="mb-1 block font-semibold text-muted-foreground">
                  {t.oxygenSpO2 || "Oxygen SpO2 (%)"}
                </span>
                <input
                  type="number"
                  className="scms-input w-full text-xs font-mono"
                  value={vitals.spo2Percent}
                  onChange={(e) => setVitals((v) => ({ ...v, spo2Percent: e.target.value }))}
                  placeholder="98"
                />
              </label>
            </div>
          </section>

          {/* Primary Diagnosis & Notes */}
          <section className="rounded-3xl border border-border/80 bg-card/95 p-6 shadow-scms space-y-4">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <ActivityLogIcon className="w-4 h-4 text-orange-500" />
              <span>{t.diagnosisNotes || "Clinical Diagnosis & Findings"}</span>
            </h2>

            <div>
              <span className="mb-1.5 block text-xs font-bold text-foreground">
                {t.selectDisease || "Select Primary Diagnosis"}
              </span>
              <Select
                value={selectedDiseaseId}
                onChange={setSelectedDiseaseId}
                placeholder="Select Disease / Diagnosis"
                options={[
                  { value: "", label: "General Clinical Examination" },
                  ...diseases.map((d) => ({
                    value: String(d.id || d.diseaseId),
                    label: `${d.name || d.diseaseName} (${d.icdCode || "Clinical"})`,
                  })),
                ]}
              />
            </div>

            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-foreground">
                Clinical Observations & Examination Notes
              </span>
              <textarea
                className="scms-textarea w-full text-xs"
                rows={4}
                value={diagnosisNotes}
                onChange={(e) => setDiagnosisNotes(e.target.value)}
                placeholder="Enter physical examination findings, symptom progress, patient complaints..."
              />
            </label>
          </section>

          {/* Follow-up Scheduling */}
          <section className="rounded-3xl border border-border/80 bg-card/95 p-6 shadow-scms space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">
                {t.scheduleFollowUp || "Schedule Follow-up Visit"}
              </h3>
              <input
                type="checkbox"
                className="checkbox checkbox-sm checkbox-primary rounded-md"
                checked={hasFollowUp}
                onChange={(e) => setHasFollowUp(e.target.checked)}
                aria-label="Enable follow-up visit"
              />
            </div>

            {hasFollowUp && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2">
                  {[
                    { label: t.oneWeek || "1 Week", days: 7 },
                    { label: t.twoWeeks || "2 Weeks", days: 14 },
                    { label: t.oneMonth || "1 Month", days: 30 },
                  ].map((p) => (
                    <button
                      key={p.days}
                      type="button"
                      onClick={() => setQuickFollowUp(p.days)}
                      className="scms-btn-outline flex-1 text-xs py-1 h-8 min-h-8 font-bold btn-target"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <DateInput
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                />

                <input
                  type="text"
                  className="scms-input w-full text-xs"
                  placeholder="Instructions for follow-up visit..."
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                />
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Smart Prescription Builder */}
        <div className="lg:col-span-7 space-y-6">
          <section className="rounded-3xl border border-border/80 bg-card/95 p-6 shadow-scms space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border/70">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <FileTextIcon className="w-4 h-4 text-orange-500" />
                <span>Smart Prescription Builder</span>
              </h2>
              <span className="text-xs font-bold text-muted-foreground">
                {prescribedItems.length} medications added
              </span>
            </div>

            {/* Add Medication Control Bar */}
            <div className="rounded-2xl border border-border/80 bg-secondary/30 p-4 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                {t.addMedicine || "Add Prescribed Medication"}
              </span>

              <div className="grid gap-3 sm:grid-cols-12">
                <div className="sm:col-span-6">
                  <Select
                    value={selectedMedId}
                    onChange={setSelectedMedId}
                    placeholder="Select Medication"
                    options={medicines.map((m) => {
                      const stock = m.stockQuantity ?? m.stock ?? 0;
                      return {
                        value: String(m.id || m.medicineId),
                        label: `${m.name || m.medicineName} (${stock > 0 ? `${stock} in stock` : "Out of stock"})`,
                      };
                    })}
                  />
                </div>

                <div className="sm:col-span-3">
                  <Select
                    value={currentDosage}
                    onChange={setCurrentDosage}
                    placeholder="Dosage"
                    options={commonDosageValues.map((d) => ({
                      value: d,
                      label: d,
                    }))}
                  />
                </div>

                <div className="sm:col-span-3">
                  <input
                    type="number"
                    min="1"
                    className="scms-input w-full text-xs font-mono"
                    value={currentDays}
                    onChange={(e) => setCurrentDays(e.target.value)}
                    placeholder="Days"
                    title="Duration in days"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  className="scms-input flex-1 text-xs"
                  value={currentInstructions}
                  onChange={(e) => setCurrentInstructions(e.target.value)}
                  placeholder="Instructions (e.g. After meals, avoid driving)"
                />

                <button
                  type="button"
                  onClick={handleAddMedicine}
                  disabled={!selectedMedId}
                  className="scms-btn-primary flex items-center gap-1.5 text-xs font-bold btn-target"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* Prescribed Items Table */}
            {prescribedItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/80 p-8 text-center text-xs text-muted-foreground">
                No medications added yet. Select a medicine above to include in this digital prescription.
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-border/80">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-secondary/60 font-bold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="p-3">Medicine</th>
                      <th className="p-3">Dosage</th>
                      <th className="p-3">Days</th>
                      <th className="p-3">Total Qty</th>
                      <th className="p-3">Instructions</th>
                      <th className="p-3 text-right">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {prescribedItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-secondary/40">
                        <td className="p-3 font-bold text-foreground">
                          {item.medicineName}
                        </td>
                        <td className="p-3 font-mono font-semibold text-orange-600 dark:text-orange-400">
                          {item.dosage}
                        </td>
                        <td className="p-3 font-mono">{item.days} days</td>
                        <td className="p-3 font-mono font-bold text-foreground">
                          {item.quantity} units
                        </td>
                        <td className="p-3 text-muted-foreground italic">
                          {item.instructions}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg btn-target"
                            aria-label="Remove item"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Issue Prescription Button */}
            <div className="pt-4 border-t border-border/70 flex justify-end">
              <button
                type="button"
                onClick={handleCompleteConsultation}
                disabled={saving}
                className="scms-btn-primary bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 shadow-md btn-target text-sm font-bold px-8 h-12"
              >
                {saving ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  <CheckCircledIcon className="w-5 h-5" />
                )}
                <span>{t.issuePrescription || "Issue Prescription & Complete Visit"}</span>
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Patient Clinical History Drawer */}
      <ModalPortal isOpen={historyDrawerOpen} onClose={() => setHistoryDrawerOpen(false)}>
        <div className="w-full max-w-2xl rounded-3xl border border-border/80 bg-card p-6 shadow-scms-modal space-y-4 max-h-[85vh] overflow-y-auto">
          <div className="flex items-center justify-between pb-3 border-b border-border/70">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-orange-500 text-white font-bold">
                {patient?.name?.[0] || "P"}
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {patient?.name || "Patient"} &mdash; Clinical Records History
                </h3>
                <span className="text-xs text-muted-foreground">
                  Longitudinal past diagnoses and prescriptions
                </span>
              </div>
            </div>
            <button
              onClick={() => setHistoryDrawerOpen(false)}
              className="p-1.5 rounded-xl text-muted-foreground hover:bg-secondary"
            >
              <Cross2Icon className="w-4 h-4" />
            </button>
          </div>

          {historyLoading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              <span className="loading loading-spinner loading-sm text-orange-500" />
              <p className="mt-2">Loading patient past records...</p>
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-secondary/30 p-4 rounded-2xl">
                <div>
                  <span className="font-semibold text-muted-foreground block">Known Allergies:</span>
                  <strong className="text-foreground">
                    {patient?.allergies || "None recorded"}
                  </strong>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground block">Chronic Conditions:</span>
                  <strong className="text-foreground">
                    {patient?.chronicConditions || "None recorded"}
                  </strong>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-foreground mb-2">Past Prescriptions & Diagnoses</h4>
                {patientHistory?.prescriptions?.length ? (
                  <div className="space-y-2">
                    {patientHistory.prescriptions.map((pres, i) => (
                      <div
                        key={i}
                        className="p-3.5 rounded-2xl border border-border/80 bg-card space-y-1.5"
                      >
                        <div className="flex justify-between font-bold text-foreground">
                          <span>Prescription #{pres.id || i + 1}</span>
                          <span className="text-muted-foreground font-mono text-[11px]">
                            {formatDate(pres.prescribedAt || pres.createdAt)}
                          </span>
                        </div>
                        {pres.diseaseName && (
                          <span className="inline-block text-[11px] font-bold text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/60 px-2 py-0.5 rounded-md">
                            {pres.diseaseName}
                          </span>
                        )}
                        {pres.notes && (
                          <p className="text-muted-foreground italic text-xs">
                            &ldquo;{parsePrescriptionNotes(pres.notes)}&rdquo;
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground italic text-center py-6">
                    No past prescriptions found for this patient.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </ModalPortal>

      {/* Save Template Modal */}
      <ModalPortal isOpen={templateModalOpen} onClose={() => setTemplateModalOpen(false)}>
        <div className="w-full max-w-md rounded-3xl border border-border/80 bg-card text-card-foreground p-6 shadow-scms-modal space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/70">
            <h3 className="text-base font-bold text-foreground">
              {t.saveAsTemplate || "Save As Template"}
            </h3>
            <button
              onClick={() => setTemplateModalOpen(false)}
              className="p-1.5 rounded-xl text-muted-foreground hover:bg-secondary"
            >
              <Cross2Icon className="w-4 h-4" />
            </button>
          </div>

          <label className="block text-xs">
            <span className="mb-1 block font-bold text-foreground">Template Name</span>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g. Standard Cold & Fever Regimen"
              className="scms-input w-full text-xs"
            />
          </label>

          <div className="text-xs text-muted-foreground">
            This will save {prescribedItems.length} current medications into a reusable template.
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setTemplateModalOpen(false)}
              className="scms-btn-outline text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveTemplate}
              className="scms-btn-primary text-xs font-bold"
            >
              Save Template
            </button>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
}

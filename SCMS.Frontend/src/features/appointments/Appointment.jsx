import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import scmsApi from "../../services/scmsApi";

const PRIMARY = "#0052CC";
const PRIMARY_LIGHT = "#EBF2FF";
const SUCCESS = "#027A48";
const WARNING = "#B54708";
const DANGER = "#D92D20";
const BG = "#F6F8FB";
const CARD = "#FFFFFF";
const TEXT = "#1D2939";
const MUTED = "#667085";
const BORDER = "#E4E7EC";

const steps = ["Patient", "Schedule", "Review"];

const emptyForm = {
  patientId: "",
  datetime: "",
  notes: "",
  status: "pending",
};

const emptyPrescription = {
  diseaseId: "",
  weightKg: "",
  bloodPressureSystolic: "",
  bloodPressureDiastolic: "",
  notes: "",
  followUpNote: "",
};

const defaultMedicineRow = {
  medicineId: "",
  quantity: 1,
  days: 3,
  dose: "",
  timing: "after_meal",
};

const toArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.value)) return data.value;
  return [];
};

const getPatientId = (p) => p?.patientId || p?.patient_id || p?.id;

const getPatientName = (p) =>
  p?.name || p?.fullName || p?.patientName || "Unknown Patient";

const getMedicineId = (m) => m?.medicineId || m?.medicine_id || m?.id;

const getDiseaseId = (d) => d?.diseaseId || d?.disease_id || d?.id;

export default function Appointments() {
  const outlet = useOutletContext();
  const lang = outlet?.lang || localStorage.getItem("lang") || "en";

  const [showWizard, setShowWizard] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [diseases, setDiseases] = useState([]);
  const [medicines, setMedicines] = useState([]);

  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [emrOpen, setEmrOpen] = useState(false);
  const [emrStep, setEmrStep] = useState(0);
  const [emrAppointment, setEmrAppointment] = useState(null);

  const [prescriptionForm, setPrescriptionForm] = useState(emptyPrescription);
  const [medicineRows, setMedicineRows] = useState([defaultMedicineRow]);
  const [noMedicine, setNoMedicine] = useState(false);
  const [newDiagnosis, setNewDiagnosis] = useState("");
  const [savingPrescription, setSavingPrescription] = useState(false);

  const t = {
    title: lang === "mm" ? "ချိန်းဆိုမှုများ" : "Appointments",
    subtitle:
      lang === "mm"
        ? "လူနာချိန်းဆိုမှုများ၊ queue နှင့် EMR မှတ်တမ်းများကို စီမံပါ"
        : "Manage appointments, queue, and EMR records",
    newAppointment: lang === "mm" ? "ချိန်းဆိုမှုအသစ်" : "New Appointment",
    patient: lang === "mm" ? "လူနာ" : "Patient",
    schedule: lang === "mm" ? "အချိန်ဇယား" : "Schedule",
    review: lang === "mm" ? "ပြန်စစ်ရန်" : "Review",
    selectPatient: lang === "mm" ? "လူနာရွေးပါ" : "Select patient",
    dateTime: lang === "mm" ? "နေ့ရက်နှင့်အချိန်" : "Date & Time",
    notes: lang === "mm" ? "မှတ်ချက်" : "Notes",
    status: lang === "mm" ? "အခြေအနေ" : "Status",
    back: lang === "mm" ? "နောက်သို့" : "Back",
    next: lang === "mm" ? "ရှေ့သို့" : "Next",
    create: lang === "mm" ? "ချိန်းဆိုမှုလုပ်မည်" : "Create Appointment",
    list: lang === "mm" ? "ချိန်းဆိုမှုစာရင်း" : "Appointment List",
    callNext: lang === "mm" ? "နောက်လူနာခေါ်မည် / EMR" : "Call Next / EMR",
    search: lang === "mm" ? "လူနာအမည်ဖြင့်ရှာပါ..." : "Search appointments...",
    emr: lang === "mm" ? "EMR စနစ်" : "Consultation EMR",
    prescription: lang === "mm" ? "ဆေးစာမှတ်တမ်း" : "Prescription Record",
    savePrescription: lang === "mm" ? "ဆေးစာသိမ်းမည်" : "Submit Prescription",
    noMedicine: lang === "mm" ? "ဆေးပေးစရာမရှိပါ" : "No Medicine Required",
  };

  const loadData = async () => {
    try {
      setLoading(true);

      const [appointmentRes, patientRes, diseaseRes, medicineRes] =
        await Promise.allSettled([
          scmsApi.appointments.list(),
          scmsApi.patients.list(),
          scmsApi.diseases.list(),
          scmsApi.medicines.list(),
        ]);

      if (appointmentRes.status === "fulfilled") {
        setAppointments(toArray(appointmentRes.value));
      }

      if (patientRes.status === "fulfilled") {
        setPatients(toArray(patientRes.value));
      }

      if (diseaseRes.status === "fulfilled") {
        setDiseases(toArray(diseaseRes.value));
      }

      if (medicineRes.status === "fulfilled") {
        setMedicines(toArray(medicineRes.value));
      }
    } catch (error) {
      console.error("Load Data Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedPatient = useMemo(() => {
    return patients.find(
      (p) => String(getPatientId(p)) === String(form.patientId),
    );
  }, [patients, form.patientId]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => {
      const name =
        a.patientName || a.patient?.name || a.patient?.fullName || a.name || "";

      return name.toLowerCase().includes(search.toLowerCase());
    });
  }, [appointments, search]);

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handlePrescriptionChange = (e) => {
    setPrescriptionForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const openWizard = () => {
    setShowWizard(true);
    setActiveStep(0);
    setForm(emptyForm);
  };

  const closeWizard = () => {
    setShowWizard(false);
    setActiveStep(0);
    setForm(emptyForm);
  };

  const createAppointment = async () => {
    try {
      setSaving(true);

      const appointmentCode = `APT-${Date.now()}`;

      const payload = {
        appointmentCode,
        patientId: Number(form.patientId),
        datetime:
          form.datetime.length === 16 ? `${form.datetime}:00` : form.datetime,
        status: form.status || "pending",
        notes: form.notes || "",
      };

      await scmsApi.appointments.create(payload);

      closeWizard();
      await loadData();
    } catch (error) {
      console.error("Create appointment error:", error);
      alert("Create appointment failed. Please check backend request body.");
    } finally {
      setSaving(false);
    }
  };

  const nextStep = () => {
    if (activeStep === 0 && !form.patientId) {
      alert(lang === "mm" ? "လူနာရွေးပါ" : "Please select a patient");
      return;
    }

    if (activeStep === 1 && !form.datetime) {
      alert(
        lang === "mm"
          ? "နေ့ရက်နှင့်အချိန်ထည့်ပါ"
          : "Please choose date and time",
      );
      return;
    }

    setActiveStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const prevStep = () => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  const updateStatus = async (appointment, status) => {
    try {
      const id = appointment.id || appointment.appointmentId;
      await scmsApi.appointments.updateStatus(id, { status });
      await loadData();
    } catch (error) {
      console.error("Status update error:", error);
      alert("Status update failed.");
    }
  };

  const resetEmrForm = () => {
    setEmrStep(0);
    setPrescriptionForm(emptyPrescription);
    setMedicineRows([defaultMedicineRow]);
    setNoMedicine(false);
    setNewDiagnosis("");
  };

  const openEmr = (appointment) => {
    setEmrAppointment(appointment);
    resetEmrForm();
    setEmrOpen(true);
  };

  const closeEmr = () => {
    setEmrOpen(false);
    setEmrAppointment(null);
    resetEmrForm();
  };

  const callNext = async () => {
    try {
      const result = await scmsApi.appointments.callNext();
      await loadData();

      const nextAppointment =
        result?.appointment ||
        result?.data ||
        toArray(result)[0] ||
        appointments.find((a) =>
          ["pending", "confirmed"].includes(
            String(a.status || a.appointmentStatus || "").toLowerCase(),
          ),
        ) ||
        null;

      if (!nextAppointment) {
        alert(
          lang === "mm"
            ? "ခေါ်ရန် appointment မရှိပါ"
            : "No appointment to call.",
        );
        return;
      }

      openEmr(nextAppointment);
    } catch (error) {
      console.error("Call next error:", error);
      alert("Call next failed.");
    }
  };

  const createNewDiagnosisIfNeeded = async () => {
    const trimmedName = newDiagnosis.trim();

    if (!trimmedName) return prescriptionForm.diseaseId || null;

    const matched = diseases.find(
      (d) =>
        String(d.name || d.diseaseName).toLowerCase() ===
        trimmedName.toLowerCase(),
    );

    if (matched) return getDiseaseId(matched);

    try {
      const created = await scmsApi.diseases.create({
        name: trimmedName,
        description: prescriptionForm.notes || "",
      });

      const createdDisease = created?.data || created?.result || created;

      await loadData();

      return getDiseaseId(createdDisease) || createdDisease?.id || null;
    } catch (error) {
      console.error("Create diagnosis error:", error);
      alert(
        "New diagnosis create failed. Existing diagnosis will be used if selected.",
      );
      return prescriptionForm.diseaseId || null;
    }
  };

  const savePrescription = async () => {
    if (!emrAppointment) return;

    try {
      setSavingPrescription(true);

      const appointmentId = emrAppointment.id || emrAppointment.appointmentId;
      const patientId =
        emrAppointment.patientId ||
        emrAppointment.patient_id ||
        emrAppointment.patient?.patientId ||
        emrAppointment.patient?.id;

      const diseaseId = await createNewDiagnosisIfNeeded();

      const validMedicineRows = noMedicine
        ? []
        : medicineRows.filter((row) => row.medicineId);

      const medicineNotes = noMedicine
        ? t.noMedicine
        : validMedicineRows
            .map((row, index) => {
              const med = medicines.find(
                (m) => String(getMedicineId(m)) === String(row.medicineId),
              );
              const medName =
                med?.name || med?.medicineName || `Medicine ${index + 1}`;

              return `${medName} | Qty: ${row.quantity || "-"} | Days: ${
                row.days || "-"
              } | Dose: ${row.dose || "-"} | Timing: ${row.timing || "-"}`;
            })
            .join("\n");

      const payload = {
        appointmentId: Number(appointmentId),
        patientId: Number(patientId),
        diseaseId: diseaseId ? Number(diseaseId) : null,
        weightKg: prescriptionForm.weightKg
          ? Number(prescriptionForm.weightKg)
          : null,
        bloodPressureSystolic: prescriptionForm.bloodPressureSystolic
          ? Number(prescriptionForm.bloodPressureSystolic)
          : null,
        bloodPressureDiastolic: prescriptionForm.bloodPressureDiastolic
          ? Number(prescriptionForm.bloodPressureDiastolic)
          : null,
        notes: [
          prescriptionForm.notes || "",
          medicineNotes,
          prescriptionForm.followUpNote
            ? `Follow-up: ${prescriptionForm.followUpNote}`
            : "",
        ]
          .filter(Boolean)
          .join("\n\n"),
      };

      await scmsApi.prescriptions.create(payload);
      await updateStatus(emrAppointment, "completed");

      closeEmr();

      alert(lang === "mm" ? "ဆေးစာသိမ်းပြီးပါပြီ" : "Prescription saved.");
    } catch (error) {
      console.error("Save prescription error:", error);
      alert("Prescription save failed. Please check backend DTO fields.");
    } finally {
      setSavingPrescription(false);
    }
  };

  const getStatusStyle = (status) => {
    const s = String(status || "pending").toLowerCase();

    if (s === "completed") {
      return { color: SUCCESS, bg: "#ECFDF3", border: "#A9EFC5" };
    }

    if (s === "confirmed") {
      return { color: PRIMARY, bg: PRIMARY_LIGHT, border: "#B2CCFF" };
    }

    if (s === "cancelled") {
      return { color: DANGER, bg: "#FFF1F0", border: "#FECDCA" };
    }

    return { color: WARNING, bg: "#FFFAEB", border: "#FEDF89" };
  };

  return (
    <div style={{ width: "100%" }}>
      <div style={pageHeader}>
        <div>
          <h1 style={titleStyle}>{t.title}</h1>
          <p style={subtitleStyle}>{t.subtitle}</p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={callNext} style={outlineBtn}>
            {t.callNext} ▶
          </button>

          <button onClick={openWizard} style={primaryBtn}>
            + {t.newAppointment}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ ...cardStyle, marginBottom: 16 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.search}
            style={inputStyle}
          />
        </div>

        <section style={cardStyle}>
          <div style={tableHeader}>
            <h2 style={sectionTitle}>{t.list}</h2>
            <button onClick={loadData} style={outlineBtn}>
              Refresh
            </button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F9FAFB" }}>
                  {["Code", "Patient", "Date & Time", "Status", "Actions"].map(
                    (head) => (
                      <th key={head} style={thStyle}>
                        {head}
                      </th>
                    ),
                  )}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" style={emptyCell}>
                      Loading...
                    </td>
                  </tr>
                ) : filteredAppointments.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={emptyCell}>
                      No appointments found.
                    </td>
                  </tr>
                ) : (
                  filteredAppointments.map((appointment) => {
                    const status =
                      appointment.status ||
                      appointment.appointmentStatus ||
                      "pending";
                    const style = getStatusStyle(status);

                    return (
                      <tr
                        key={appointment.id || appointment.appointmentId}
                        style={{ borderBottom: `1px solid ${BORDER}` }}
                      >
                        <td style={tdStyle}>
                          <strong style={{ color: PRIMARY }}>
                            {appointment.appointmentCode ||
                              appointment.appointment_code ||
                              `APT-${appointment.id}`}
                          </strong>
                        </td>

                        <td style={tdStyle}>
                          {appointment.patientName ||
                            appointment.patient?.name ||
                            appointment.name ||
                            "-"}
                        </td>

                        <td style={tdStyle}>
                          {formatDate(
                            appointment.datetime || appointment.dateTime,
                          )}
                        </td>

                        <td style={tdStyle}>
                          <span
                            style={{
                              padding: "5px 10px",
                              borderRadius: 999,
                              fontSize: 12,
                              fontWeight: 800,
                              color: style.color,
                              background: style.bg,
                              border: `1px solid ${style.border}`,
                            }}
                          >
                            {status}
                          </span>
                        </td>

                        <td style={tdStyle}>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              style={miniBtn}
                              onClick={() =>
                                updateStatus(appointment, "confirmed")
                              }
                            >
                              Confirm
                            </button>

                            <button
                              style={{
                                ...miniBtn,
                                color: SUCCESS,
                                background: "#ECFDF3",
                              }}
                              onClick={() => openEmr(appointment)}
                            >
                              EMR
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {showWizard && (
        <Modal onClose={closeWizard} width={720}>
          <h2 style={sectionTitle}>{t.newAppointment}</h2>

          <div style={{ display: "flex", gap: 8, margin: "18px 0" }}>
            {steps.map((step, index) => (
              <div
                key={step}
                style={{
                  flex: 1,
                  height: 8,
                  borderRadius: 999,
                  background: index <= activeStep ? PRIMARY : "#E4E7EC",
                }}
              />
            ))}
          </div>

          {activeStep === 0 && (
            <div style={{ display: "grid", gap: 12 }}>
              <label style={labelStyle}>
                {t.selectPatient}
                <select
                  name="patientId"
                  value={form.patientId}
                  onChange={handleChange}
                  style={inputStyle}
                >
                  <option value="">{t.selectPatient}</option>
                  {patients.map((patient) => (
                    <option
                      key={getPatientId(patient)}
                      value={getPatientId(patient)}
                    >
                      {getPatientName(patient)}
                    </option>
                  ))}
                </select>
              </label>

              {selectedPatient && (
                <div style={previewBox}>
                  <strong>{getPatientName(selectedPatient)}</strong>
                  <span>
                    {selectedPatient.mobileNo ||
                      selectedPatient.mobile_no ||
                      "-"}
                  </span>
                  <span>{selectedPatient.email || "-"}</span>
                </div>
              )}
            </div>
          )}

          {activeStep === 1 && (
            <div style={{ display: "grid", gap: 12 }}>
              <label style={labelStyle}>
                {t.dateTime}
                <input
                  type="datetime-local"
                  name="datetime"
                  value={form.datetime}
                  onChange={handleChange}
                  style={inputStyle}
                />
              </label>

              <label style={labelStyle}>
                {t.status}
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  style={inputStyle}
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="completed">Completed</option>
                </select>
              </label>

              <label style={labelStyle}>
                {t.notes}
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  rows={5}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </label>
            </div>
          )}

          {activeStep === 2 && (
            <div style={{ display: "grid", gap: 12 }}>
              <ReviewItem
                label={t.patient}
                value={getPatientName(selectedPatient)}
              />
              <ReviewItem label={t.dateTime} value={form.datetime || "-"} />
              <ReviewItem label={t.status} value={form.status} />
              <ReviewItem label={t.notes} value={form.notes || "-"} />
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            {activeStep > 0 && (
              <button onClick={prevStep} style={outlineBtn}>
                {t.back}
              </button>
            )}

            {activeStep < steps.length - 1 ? (
              <button onClick={nextStep} style={primaryBtn}>
                {t.next}
              </button>
            ) : (
              <button
                onClick={createAppointment}
                disabled={saving}
                style={primaryBtn}
              >
                {saving ? "Saving..." : t.create}
              </button>
            )}
          </div>
        </Modal>
      )}

      {emrOpen && emrAppointment && (
        <Modal onClose={closeEmr} width={1180}>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: TEXT }}>
            {t.emr}
          </h2>

          <p style={{ color: MUTED, marginTop: 6 }}>
            Patient history, vitals, diagnosis, prescription and follow-up.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.6fr 0.9fr",
              gap: 18,
              marginTop: 22,
            }}
          >
            <section style={cardStyle}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 12,
                  marginBottom: 24,
                }}
              >
                {[
                  "Vitals & History",
                  "Diagnosis & Notes",
                  "Prescription & Follow-up",
                ].map((label, index) => (
                  <button
                    key={label}
                    onClick={() => setEmrStep(index)}
                    style={{
                      border: `1px solid ${BORDER}`,
                      borderRadius: 12,
                      padding: "14px 16px",
                      background: emrStep === index ? PRIMARY_LIGHT : "#F9FAFB",
                      color: emrStep === index ? PRIMARY : MUTED,
                      fontWeight: 800,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    {index + 1} {label}
                  </button>
                ))}
              </div>

              <div style={{ ...previewBox, marginBottom: 18 }}>
                <strong>
                  {emrAppointment.patientName ||
                    emrAppointment.patient?.name ||
                    emrAppointment.name ||
                    "-"}
                </strong>

                <span>
                  Appointment:{" "}
                  {emrAppointment.appointmentCode ||
                    emrAppointment.appointment_code ||
                    `APT-${emrAppointment.id}`}
                </span>

                <span>
                  Date:{" "}
                  {formatDate(
                    emrAppointment.datetime || emrAppointment.dateTime,
                  )}
                </span>
              </div>

              {emrStep === 0 && (
                <>
                  <h3 style={sectionTitle}>Vitals & History</h3>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: 18,
                      marginTop: 12,
                    }}
                  >
                    <label style={labelStyle}>
                      Weight (kg)
                      <input
                        name="weightKg"
                        type="number"
                        value={prescriptionForm.weightKg}
                        onChange={handlePrescriptionChange}
                        style={inputStyle}
                      />
                    </label>

                    <label style={labelStyle}>
                      BP Systolic
                      <input
                        name="bloodPressureSystolic"
                        type="number"
                        value={prescriptionForm.bloodPressureSystolic}
                        onChange={handlePrescriptionChange}
                        style={inputStyle}
                      />
                    </label>

                    <label style={labelStyle}>
                      BP Diastolic
                      <input
                        name="bloodPressureDiastolic"
                        type="number"
                        value={prescriptionForm.bloodPressureDiastolic}
                        onChange={handlePrescriptionChange}
                        style={inputStyle}
                      />
                    </label>
                  </div>
                </>
              )}

              {emrStep === 1 && (
                <>
                  <h3 style={sectionTitle}>Diagnosis & Notes</h3>

                  <div style={{ display: "grid", gap: 14, marginTop: 12 }}>
                    <label style={labelStyle}>
                      Diagnosis
                      <select
                        name="diseaseId"
                        value={prescriptionForm.diseaseId}
                        onChange={handlePrescriptionChange}
                        style={inputStyle}
                      >
                        <option value="">General Consultation</option>
                        {diseases.map((d) => (
                          <option key={getDiseaseId(d)} value={getDiseaseId(d)}>
                            {d.name || d.diseaseName}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label style={labelStyle}>
                      New Diagnosis
                      <input
                        value={newDiagnosis}
                        onChange={(e) => setNewDiagnosis(e.target.value)}
                        style={inputStyle}
                        placeholder="Type new diagnosis if not in list..."
                      />
                    </label>

                    <label style={labelStyle}>
                      Doctor Notes
                      <textarea
                        name="notes"
                        value={prescriptionForm.notes}
                        onChange={handlePrescriptionChange}
                        rows={6}
                        style={{ ...inputStyle, resize: "vertical" }}
                        placeholder="Diagnosis notes, symptoms, treatment plan..."
                      />
                    </label>
                  </div>
                </>
              )}

              {emrStep === 2 && (
                <>
                  <h3 style={sectionTitle}>Prescription & Follow-up</h3>

                  {noMedicine ? (
                    <div style={{ ...previewBox, marginTop: 12 }}>
                      <strong style={{ color: DANGER }}>{t.noMedicine}</strong>
                      <span>
                        This consultation will be saved without medicine items.
                      </span>
                    </div>
                  ) : (
                    medicineRows.map((row, index) => (
                      <div
                        key={index}
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "1.4fr 0.45fr 0.45fr 0.8fr 1fr 44px",
                          gap: 14,
                          marginTop: 12,
                          alignItems: "end",
                        }}
                      >
                        <label style={labelStyle}>
                          Medicine
                          <select
                            value={row.medicineId}
                            onChange={(e) =>
                              setMedicineRows((prev) =>
                                prev.map((item, i) =>
                                  i === index
                                    ? { ...item, medicineId: e.target.value }
                                    : item,
                                ),
                              )
                            }
                            style={inputStyle}
                          >
                            <option value="">Select medicine</option>
                            {medicines.map((m) => (
                              <option
                                key={getMedicineId(m)}
                                value={getMedicineId(m)}
                              >
                                {m.name || m.medicineName}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label style={labelStyle}>
                          Qty
                          <input
                            type="number"
                            value={row.quantity}
                            onChange={(e) =>
                              setMedicineRows((prev) =>
                                prev.map((item, i) =>
                                  i === index
                                    ? { ...item, quantity: e.target.value }
                                    : item,
                                ),
                              )
                            }
                            style={inputStyle}
                          />
                        </label>

                        <label style={labelStyle}>
                          Days
                          <input
                            type="number"
                            value={row.days}
                            onChange={(e) =>
                              setMedicineRows((prev) =>
                                prev.map((item, i) =>
                                  i === index
                                    ? { ...item, days: e.target.value }
                                    : item,
                                ),
                              )
                            }
                            style={inputStyle}
                          />
                        </label>

                        <label style={labelStyle}>
                          Dose
                          <input
                            value={row.dose}
                            onChange={(e) =>
                              setMedicineRows((prev) =>
                                prev.map((item, i) =>
                                  i === index
                                    ? { ...item, dose: e.target.value }
                                    : item,
                                ),
                              )
                            }
                            style={inputStyle}
                            placeholder="1 tab"
                          />
                        </label>

                        <label style={labelStyle}>
                          Timing
                          <select
                            value={row.timing}
                            onChange={(e) =>
                              setMedicineRows((prev) =>
                                prev.map((item, i) =>
                                  i === index
                                    ? { ...item, timing: e.target.value }
                                    : item,
                                ),
                              )
                            }
                            style={inputStyle}
                          >
                            <option value="after_meal">after_meal</option>
                            <option value="before_meal">before_meal</option>
                            <option value="morning">morning</option>
                            <option value="night">night</option>
                          </select>
                        </label>

                        <button
                          type="button"
                          onClick={() => {
                            setMedicineRows([]);
                            setNoMedicine(true);
                          }}
                          style={{
                            ...outlineBtn,
                            padding: "12px 0",
                            color: DANGER,
                          }}
                          title="No Medicine Required"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setNoMedicine(false);
                      setMedicineRows((prev) =>
                        prev.length === 0
                          ? [defaultMedicineRow]
                          : [...prev, defaultMedicineRow],
                      );
                    }}
                    style={{ ...outlineBtn, marginTop: 14 }}
                  >
                    + Add Medicine
                  </button>

                  <div style={{ marginTop: 18 }}>
                    <label style={labelStyle}>
                      Follow-up Recommendation
                      <input
                        name="followUpNote"
                        value={prescriptionForm.followUpNote}
                        onChange={handlePrescriptionChange}
                        style={inputStyle}
                        placeholder="Follow-up advice or next visit note..."
                      />
                    </label>
                  </div>
                </>
              )}

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  justifyContent: "flex-end",
                  marginTop: 24,
                }}
              >
                {emrStep > 0 && (
                  <button
                    type="button"
                    onClick={() => setEmrStep((s) => s - 1)}
                    style={outlineBtn}
                  >
                    Previous
                  </button>
                )}

                {emrStep < 2 ? (
                  <button
                    type="button"
                    onClick={() => setEmrStep((s) => s + 1)}
                    style={primaryBtn}
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={savePrescription}
                    disabled={savingPrescription}
                    style={primaryBtn}
                  >
                    {savingPrescription ? "Saving..." : t.savePrescription}
                  </button>
                )}
              </div>
            </section>

            <aside style={cardStyle}>
              <h3 style={sectionTitle}>History</h3>

              <div style={{ display: "grid", gap: 18, marginTop: 18 }}>
                {[
                  "Appointment - Visit scheduled",
                  "Diagnosis - Previous diagnosis record",
                  "Prescription - Previous medicine record",
                  "Lab Request - Lab test requested",
                  "Follow-up - Review schedule",
                ].map((item, index) => (
                  <div
                    key={index}
                    style={{
                      borderLeft: `3px solid ${PRIMARY}`,
                      paddingLeft: 14,
                      color: TEXT,
                    }}
                  >
                    <strong>{item}</strong>
                    <p style={{ color: MUTED, fontSize: 13, marginTop: 4 }}>
                      {formatDate(new Date())}
                    </p>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, onClose, width = 700 }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: width,
          maxHeight: "90vh",
          overflowY: "auto",
          background: CARD,
          borderRadius: 22,
          padding: 24,
          boxShadow: "0 24px 60px rgba(16,24,40,0.25)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={closeBtn}>
            ✕
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

function ReviewItem({ label, value }) {
  return (
    <div style={previewBox}>
      <span style={{ color: MUTED, fontSize: 12, fontWeight: 800 }}>
        {label}
      </span>
      <strong style={{ color: TEXT }}>{value}</strong>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-MY", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const pageHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: 22,
  gap: 16,
};

const titleStyle = {
  color: TEXT,
  fontSize: 30,
  fontWeight: 800,
  letterSpacing: "-0.04em",
};

const subtitleStyle = {
  color: MUTED,
  marginTop: 6,
  fontSize: 14,
};

const cardStyle = {
  background: CARD,
  border: `1px solid ${BORDER}`,
  borderRadius: 18,
  padding: 18,
  boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
};

const tableHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 14,
};

const sectionTitle = {
  fontSize: 18,
  fontWeight: 800,
  color: TEXT,
};

const labelStyle = {
  display: "grid",
  gap: 7,
  fontSize: 13,
  fontWeight: 800,
  color: TEXT,
};

const inputStyle = {
  width: "100%",
  border: `1px solid ${BORDER}`,
  borderRadius: 12,
  padding: "12px 13px",
  outline: "none",
  fontSize: 14,
  background: CARD,
};

const primaryBtn = {
  border: 0,
  background: PRIMARY,
  color: "white",
  borderRadius: 12,
  padding: "12px 16px",
  fontWeight: 800,
  cursor: "pointer",
};

const outlineBtn = {
  border: `1px solid ${BORDER}`,
  background: CARD,
  color: TEXT,
  borderRadius: 12,
  padding: "12px 16px",
  fontWeight: 800,
  cursor: "pointer",
};

const miniBtn = {
  border: 0,
  background: PRIMARY_LIGHT,
  color: PRIMARY,
  borderRadius: 10,
  padding: "8px 10px",
  fontWeight: 800,
  cursor: "pointer",
};

const closeBtn = {
  border: 0,
  background: "#F2F4F7",
  borderRadius: 10,
  padding: "8px 12px",
  cursor: "pointer",
  fontWeight: 800,
};

const previewBox = {
  border: `1px solid ${BORDER}`,
  background: BG,
  borderRadius: 14,
  padding: 14,
  display: "grid",
  gap: 5,
  color: MUTED,
  fontSize: 13,
};

const thStyle = {
  padding: 12,
  textAlign: "left",
  color: MUTED,
  fontSize: 12,
  fontWeight: 800,
  borderBottom: `1px solid ${BORDER}`,
};

const tdStyle = {
  padding: 12,
  color: TEXT,
  fontSize: 13,
  verticalAlign: "middle",
};

const emptyCell = {
  padding: 24,
  textAlign: "center",
  color: MUTED,
};

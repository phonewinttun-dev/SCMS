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

const toArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.value)) return data.value;
  return [];
};

const getPrescriptionId = (p) => p.id || p.prescriptionId || p.prescription_id;

const getPatientName = (p) =>
  p.patientName ||
  p.patient?.name ||
  p.patient?.fullName ||
  p.name ||
  "Unknown Patient";

const getDiseaseName = (p) =>
  p.diseaseName || p.disease?.name || p.diagnosis || "General Consultation";

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("en-MY", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function Prescriptions() {
  const outlet = useOutletContext();
  const lang = outlet?.lang || localStorage.getItem("lang") || "en";

  const [prescriptions, setPrescriptions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [diseaseFilter, setDiseaseFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const t = {
    title: lang === "mm" ? "ဆေးစာမှတ်တမ်းများ" : "Prescriptions",
    subtitle:
      lang === "mm"
        ? "EMR မှ သိမ်းထားသော ဆေးစာ၊ လူနာမှတ်တမ်းနှင့် ဆရာဝန်မှတ်ချက်များ"
        : "Saved EMR prescriptions, patient records, and doctor notes",
    search:
      lang === "mm"
        ? "လူနာအမည် / ရောဂါအမည်ဖြင့်ရှာပါ..."
        : "Search by patient or diagnosis...",
    all: lang === "mm" ? "အားလုံး" : "All",
    total: lang === "mm" ? "စုစုပေါင်း" : "Total",
    withVitals: lang === "mm" ? "Vitals ပါသော" : "With Vitals",
    general: lang === "mm" ? "General" : "General",
    view: lang === "mm" ? "အသေးစိတ်" : "View Details",
    pdf: lang === "mm" ? "PDF ဒေါင်းမည်" : "Download PDF",
    patient: lang === "mm" ? "လူနာ" : "Patient",
    diagnosis: lang === "mm" ? "ရောဂါအမည်" : "Diagnosis",
    weight: lang === "mm" ? "ကိုယ်အလေးချိန်" : "Weight",
    bloodPressure: lang === "mm" ? "သွေးပေါင်ချိန်" : "Blood Pressure",
    notes: lang === "mm" ? "ဆရာဝန်မှတ်ချက်" : "Doctor Notes",
    appointment: lang === "mm" ? "ချိန်းဆိုမှု" : "Appointment",
    createdAt: lang === "mm" ? "သိမ်းသည့်နေ့" : "Created At",
    empty: lang === "mm" ? "ဆေးစာမှတ်တမ်းမတွေ့ပါ" : "No prescriptions found",
    details: lang === "mm" ? "ဆေးစာအသေးစိတ်" : "Prescription Details",
    close: lang === "mm" ? "ပိတ်မည်" : "Close",
  };

  const loadPrescriptions = async () => {
    try {
      setLoading(true);
      const data = await scmsApi.prescriptions.list();
      setPrescriptions(toArray(data));
    } catch (error) {
      console.error("Prescription load error:", error);
      setPrescriptions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrescriptions();
  }, []);

  const diseaseOptions = useMemo(() => {
    const names = prescriptions.map((p) => getDiseaseName(p)).filter(Boolean);

    return ["all", ...Array.from(new Set(names))];
  }, [prescriptions]);

  const filteredPrescriptions = useMemo(() => {
    return prescriptions.filter((p) => {
      const patientName = getPatientName(p).toLowerCase();
      const diseaseName = getDiseaseName(p).toLowerCase();
      const notes = String(p.notes || "").toLowerCase();

      const keyword = search.toLowerCase();

      const matchSearch =
        patientName.includes(keyword) ||
        diseaseName.includes(keyword) ||
        notes.includes(keyword);

      const matchDisease =
        diseaseFilter === "all" ||
        getDiseaseName(p).toLowerCase() === diseaseFilter.toLowerCase();

      return matchSearch && matchDisease;
    });
  }, [prescriptions, search, diseaseFilter]);

  const stats = useMemo(() => {
    const withVitals = prescriptions.filter(
      (p) =>
        p.weightKg ||
        p.weight_kg ||
        p.bloodPressureSystolic ||
        p.blood_pressure_systolic,
    ).length;

    const general = prescriptions.filter(
      (p) => getDiseaseName(p) === "General Consultation",
    ).length;

    return {
      total: prescriptions.length,
      withVitals,
      general,
    };
  }, [prescriptions]);

  const downloadPdf = async (prescription) => {
    try {
      const id = getPrescriptionId(prescription);
      const response = await scmsApi.prescriptions.pdf(id);

      const blob = new Blob([response.data], {
        type: "application/pdf",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `prescription-${id}.pdf`;
      document.body.appendChild(link);
      link.click();

      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("PDF download error:", error);
      alert("PDF download failed.");
    }
  };

  return (
    <div style={{ width: "100%" }}>
      <div style={pageHeader}>
        <div>
          <h1 style={titleStyle}>{t.title}</h1>
          <p style={subtitleStyle}>{t.subtitle}</p>
        </div>

        <button onClick={loadPrescriptions} style={outlineBtn}>
          Refresh
        </button>
      </div>

      <section style={statsGrid}>
        <StatCard label={t.total} value={stats.total} color={PRIMARY} />
        <StatCard
          label={t.withVitals}
          value={stats.withVitals}
          color={SUCCESS}
        />
        <StatCard label={t.general} value={stats.general} color={WARNING} />
      </section>

      <section style={filterCard}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.search}
          style={inputStyle}
        />

        <select
          value={diseaseFilter}
          onChange={(e) => setDiseaseFilter(e.target.value)}
          style={{ ...inputStyle, maxWidth: 260 }}
        >
          {diseaseOptions.map((name) => (
            <option key={name} value={name}>
              {name === "all" ? t.all : name}
            </option>
          ))}
        </select>
      </section>

      {loading ? (
        <div style={emptyStyle}>Loading...</div>
      ) : filteredPrescriptions.length === 0 ? (
        <div style={emptyStyle}>{t.empty}</div>
      ) : (
        <section style={prescriptionGrid}>
          {filteredPrescriptions.map((p) => (
            <article
              key={getPrescriptionId(p)}
              style={prescriptionCard}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-3px)";
                e.currentTarget.style.boxShadow =
                  "0 14px 28px rgba(16,24,40,0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow =
                  "0 1px 2px rgba(16,24,40,0.04)";
              }}
            >
              <div style={cardTop}>
                <div style={avatarStyle}>
                  {getPatientName(p).slice(0, 2).toUpperCase()}
                </div>

                <div style={{ minWidth: 0 }}>
                  <h3 style={cardTitle}>{getPatientName(p)}</h3>
                  <p style={cardSub}>
                    {formatDate(p.createdAt || p.created_at)}
                  </p>
                </div>
              </div>

              <div style={infoGrid}>
                <Info label={t.diagnosis} value={getDiseaseName(p)} />
                <Info
                  label={t.weight}
                  value={`${p.weightKg || p.weight_kg || "-"} kg`}
                />
                <Info
                  label={t.bloodPressure}
                  value={`${
                    p.bloodPressureSystolic || p.blood_pressure_systolic || "-"
                  } / ${
                    p.bloodPressureDiastolic ||
                    p.blood_pressure_diastolic ||
                    "-"
                  }`}
                />
              </div>

              <div style={notesBox}>
                <strong>{t.notes}</strong>
                <p>{p.notes || "-"}</p>
              </div>

              <div style={actionRow}>
                <button onClick={() => setSelected(p)} style={primaryBtn}>
                  {t.view}
                </button>

                <button onClick={() => downloadPdf(p)} style={outlineBtn}>
                  {t.pdf}
                </button>
              </div>
            </article>
          ))}
        </section>
      )}

      {selected && (
        <Modal onClose={() => setSelected(null)} width={820}>
          <div style={modalHeader}>
            <div>
              <h2 style={modalTitle}>{t.details}</h2>
              <p style={subtitleStyle}>
                {t.patient}: {getPatientName(selected)}
              </p>
            </div>

            <button onClick={() => setSelected(null)} style={closeBtn}>
              ✕
            </button>
          </div>

          <div style={detailHero}>
            <div style={largeAvatar}>
              {getPatientName(selected).slice(0, 2).toUpperCase()}
            </div>

            <div>
              <h3 style={{ color: TEXT, fontSize: 22, fontWeight: 800 }}>
                {getPatientName(selected)}
              </h3>
              <p style={{ color: MUTED, marginTop: 5 }}>
                {t.createdAt}:{" "}
                {formatDate(selected.createdAt || selected.created_at)}
              </p>
            </div>
          </div>

          <div style={detailGrid}>
            <Info label={t.diagnosis} value={getDiseaseName(selected)} />
            <Info
              label={t.weight}
              value={`${selected.weightKg || selected.weight_kg || "-"} kg`}
            />
            <Info
              label={t.bloodPressure}
              value={`${
                selected.bloodPressureSystolic ||
                selected.blood_pressure_systolic ||
                "-"
              } / ${
                selected.bloodPressureDiastolic ||
                selected.blood_pressure_diastolic ||
                "-"
              }`}
            />
            <Info
              label={t.appointment}
              value={
                selected.appointmentCode ||
                selected.appointment?.appointmentCode ||
                selected.appointment_id ||
                "-"
              }
            />
          </div>

          <div style={{ ...notesBox, marginTop: 16 }}>
            <strong>{t.notes}</strong>
            <p>{selected.notes || "-"}</p>
          </div>

          <div style={modalActions}>
            <button onClick={() => downloadPdf(selected)} style={primaryBtn}>
              {t.pdf}
            </button>
            <button onClick={() => setSelected(null)} style={outlineBtn}>
              {t.close}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={statCard}>
      <p style={{ color: MUTED, fontSize: 12, fontWeight: 800 }}>{label}</p>
      <h2 style={{ color, fontSize: 34, fontWeight: 900, marginTop: 8 }}>
        {value}
      </h2>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div style={infoBox}>
      <span style={{ color: MUTED, fontSize: 12, fontWeight: 800 }}>
        {label}
      </span>
      <strong style={{ color: TEXT, marginTop: 4 }}>{value}</strong>
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
        {children}
      </div>
    </div>
  );
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

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 16,
  marginBottom: 18,
};

const statCard = {
  background: CARD,
  border: `1px solid ${BORDER}`,
  borderRadius: 18,
  padding: 18,
  boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
};

const filterCard = {
  background: CARD,
  border: `1px solid ${BORDER}`,
  borderRadius: 18,
  padding: 18,
  display: "flex",
  gap: 12,
  marginBottom: 18,
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

const prescriptionGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))",
  gap: 16,
};

const prescriptionCard = {
  background: CARD,
  border: `1px solid ${BORDER}`,
  borderRadius: 18,
  padding: 18,
  boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
  transition: "0.18s ease",
};

const cardTop = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginBottom: 16,
};

const avatarStyle = {
  width: 46,
  height: 46,
  borderRadius: "50%",
  background: PRIMARY,
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 900,
  flexShrink: 0,
};

const cardTitle = {
  color: TEXT,
  fontSize: 17,
  fontWeight: 800,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const cardSub = {
  color: MUTED,
  fontSize: 13,
  marginTop: 4,
};

const infoGrid = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 10,
};

const infoBox = {
  border: `1px solid ${BORDER}`,
  background: BG,
  borderRadius: 14,
  padding: 13,
  display: "grid",
  gap: 4,
};

const notesBox = {
  marginTop: 14,
  background: "#F9FAFB",
  border: `1px solid ${BORDER}`,
  borderRadius: 14,
  padding: 14,
  color: TEXT,
  lineHeight: 1.6,
};

const actionRow = {
  display: "flex",
  gap: 10,
  marginTop: 16,
};

const primaryBtn = {
  border: 0,
  background: PRIMARY,
  color: "white",
  borderRadius: 12,
  padding: "11px 15px",
  fontWeight: 800,
  cursor: "pointer",
};

const outlineBtn = {
  border: `1px solid ${BORDER}`,
  background: CARD,
  color: TEXT,
  borderRadius: 12,
  padding: "11px 15px",
  fontWeight: 800,
  cursor: "pointer",
};

const emptyStyle = {
  background: CARD,
  border: `1px solid ${BORDER}`,
  borderRadius: 18,
  padding: 34,
  color: MUTED,
  textAlign: "center",
};

const modalHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  marginBottom: 18,
};

const modalTitle = {
  color: TEXT,
  fontSize: 24,
  fontWeight: 900,
};

const closeBtn = {
  border: 0,
  background: "#F2F4F7",
  borderRadius: 10,
  padding: "8px 12px",
  cursor: "pointer",
  fontWeight: 900,
  height: 38,
};

const detailHero = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  background: PRIMARY_LIGHT,
  borderRadius: 18,
  padding: 16,
  marginBottom: 16,
};

const largeAvatar = {
  width: 58,
  height: 58,
  borderRadius: "50%",
  background: PRIMARY,
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 900,
  fontSize: 18,
};

const detailGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 12,
};

const modalActions = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  marginTop: 20,
};

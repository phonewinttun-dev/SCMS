import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import scmsApi from "../../services/scmsApi";

const PRIMARY = "#0052CC";
const PRIMARY_LIGHT = "#EBF2FF";
const SUCCESS = "#027A48";
const DANGER = "#D92D20";
const BG = "#F6F8FB";
const CARD = "#FFFFFF";
const TEXT = "#1D2939";
const MUTED = "#667085";
const BORDER = "#E4E7EC";

const emptyForm = {
  name: "",
  mobileNo: "",
  email: "",
  dateOfBirth: "",
  gender: "",
  bloodType: "",
  address: "",
  allergies: "",
  chronicConditions: "",
};
const toArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.result)) return data.result;
  return [];
};

const getPatientId = (p) => p.patientId || p.patient_id || p.id;

export default function Patients() {
  const outlet = useOutletContext();
  const lang = outlet?.lang || localStorage.getItem("lang") || "en";
  const [detailPatient, setDetailPatient] = useState(null);

  const [patients, setPatients] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [step, setStep] = useState(0);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const t = {
    title: lang === "mm" ? "လူနာများ" : "Patients",
    subtitle:
      lang === "mm"
        ? "လူနာအသစ်ထည့်ရန်နှင့် လူနာစာရင်းများကို စီမံရန်"
        : "Create new patients and manage patient records",

    personal: lang === "mm" ? "ကိုယ်ရေးအချက်အလက်" : "Personal",
    contact: lang === "mm" ? "ဆက်သွယ်ရန်" : "Contact",
    medical: lang === "mm" ? "ကျန်းမာရေးအချက်အလက်" : "Medical",
    review: lang === "mm" ? "ပြန်စစ်ရန်" : "Review",
    name: lang === "mm" ? "အမည်" : "Name",
    mobile: lang === "mm" ? "ဖုန်းနံပါတ်" : "Mobile No",
    email: lang === "mm" ? "အီးမေးလ်" : "Email",
    dob: lang === "mm" ? "မွေးနေ့" : "Date of Birth",
    gender: lang === "mm" ? "ကျား/မ" : "Gender",
    blood: lang === "mm" ? "သွေးအမျိုးအစား" : "Blood Type",
    address: lang === "mm" ? "လိပ်စာ" : "Address",
    next: lang === "mm" ? "ရှေ့သို့" : "Next",
    back: lang === "mm" ? "နောက်သို့" : "Back",
    create: lang === "mm" ? "လူနာဖန်တီးမည်" : "Create Patient",
    list: lang === "mm" ? "လူနာစာရင်း" : "Patient List",
    search: lang === "mm" ? "လူနာအမည်ဖြင့်ရှာပါ..." : "Search patients...",
    empty: lang === "mm" ? "လူနာမတွေ့ပါ" : "No patients found",
  };

  const loadPatients = async () => {
    try {
      setLoading(true);
      const data = await scmsApi.patients.list();
      setPatients(toArray(data));
    } catch (error) {
      console.error("Patients load error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, []);

  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      const name = p.name || p.fullName || p.patientName || "";
      const mobile = p.mobileNo || p.mobile_no || "";
      return `${name} ${mobile}`.toLowerCase().includes(search.toLowerCase());
    });
  }, [patients, search]);

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const nextStep = () => {
    if (step === 0 && !form.name) {
      alert(lang === "mm" ? "အမည်ထည့်ပါ" : "Please enter patient name");
      return;
    }

    if (step === 1 && !form.mobileNo && !form.email) {
      alert(
        lang === "mm"
          ? "ဖုန်းနံပါတ် သို့မဟုတ် email တစ်ခုထည့်ပါ"
          : "Please enter mobile number or email",
      );
      return;
    }

    setStep((prev) => Math.min(prev + 1, 3));
  };

  const backStep = () => {
    setStep((prev) => Math.max(prev - 1, 0));
  };

  const resetWizard = () => {
    setStep(0);
    setForm(emptyForm);
  };

  const createPatient = async () => {
    try {
      setSaving(true);

      const payload = {
        name: form.name,
        mobileNo: form.mobileNo,
        email: form.email,
        dateOfBirth: form.dateOfBirth || null,
        gender: form.gender,
        bloodType: form.bloodType,
        address: form.address,
        allergies: form.allergies,
        chronicConditions: form.chronicConditions,
      };

      await scmsApi.patients.create(payload);
      resetWizard();
      await loadPatients();
    } catch (error) {
      console.error("Create patient error:", error);
      alert("Patient create failed. Please check backend request body.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ width: "100%" }}>
      <div style={pageHeader}>
        <div>
          <h1 style={titleStyle}>{t.title}</h1>
          <p style={subtitleStyle}>{t.subtitle}</p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "420px 1fr",
          gap: 18,
          alignItems: "start",
        }}
      >
        <section style={cardStyle}>
          <h2 style={sectionTitle}>{t.newPatient}</h2>

          <div style={{ display: "flex", gap: 8, margin: "18px 0" }}>
            {[t.personal, t.contact, t.medical, t.review].map(
              (label, index) => (
                <div key={label} style={{ flex: 1 }}>
                  <div
                    style={{
                      height: 8,
                      borderRadius: 999,
                      background: index <= step ? PRIMARY : BORDER,
                      transition: "0.2s ease",
                    }}
                  />
                  <div
                    style={{
                      marginTop: 7,
                      fontSize: 11,
                      fontWeight: 800,
                      color: index === step ? PRIMARY : MUTED,
                    }}
                  >
                    {label}
                  </div>
                </div>
              ),
            )}
          </div>

          {step === 0 && (
            <div style={formGrid}>
              <Input
                label={t.name}
                name="name"
                value={form.name}
                onChange={handleChange}
              />
              <Input
                label={t.dob}
                type="date"
                name="dateOfBirth"
                value={form.dateOfBirth}
                onChange={handleChange}
              />

              <label style={labelStyle}>
                {t.gender}
                <select
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                  style={inputStyle}
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </label>
            </div>
          )}

          {step === 1 && (
            <div style={formGrid}>
              <Input
                label={t.mobile}
                name="mobileNo"
                value={form.mobileNo}
                onChange={handleChange}
              />
              <Input
                label={t.email}
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
              />
              <label style={labelStyle}>
                {t.address}
                <textarea
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  rows={4}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </label>
            </div>
          )}

          {step === 2 && (
            <div style={formGrid}>
              <label style={labelStyle}>
                {t.blood}
                <select
                  name="bloodType"
                  value={form.bloodType}
                  onChange={handleChange}
                  style={inputStyle}
                >
                  <option value="">Select Blood Type</option>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(
                    (b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label style={labelStyle}>
                {lang === "mm" ? "ဓာတ်မတည့်မှုများ" : "Allergies"}
                <textarea
                  name="allergies"
                  value={form.allergies}
                  onChange={handleChange}
                  rows={3}
                  style={{ ...inputStyle, resize: "vertical" }}
                  placeholder="Penicillin, seafood, dust..."
                />
              </label>

              <label style={labelStyle}>
                {lang === "mm" ? "နာတာရှည်ရောဂါများ" : "Chronic Conditions"}
                <textarea
                  name="chronicConditions"
                  value={form.chronicConditions}
                  onChange={handleChange}
                  rows={3}
                  style={{ ...inputStyle, resize: "vertical" }}
                  placeholder="Diabetes, hypertension..."
                />
              </label>
            </div>
          )}
          {step === 3 && (
            <div style={formGrid}>
              <Review
                label={lang === "mm" ? "အမည်" : "Name"}
                value={form.name || "-"}
              />

              <Review
                label={lang === "mm" ? "ဖုန်းနံပါတ်" : "Mobile Number"}
                value={form.mobileNo || "-"}
              />

              <Review
                label={lang === "mm" ? "အီးမေးလ်" : "Email"}
                value={form.email || "-"}
              />

              <Review
                label={lang === "mm" ? "ကျား / မ" : "Gender"}
                value={form.gender || "-"}
              />

              <Review
                label={lang === "mm" ? "သွေးအမျိုးအစား" : "Blood Type"}
                value={form.bloodType || "-"}
              />

              <Review
                label={lang === "mm" ? "လိပ်စာ" : "Address"}
                value={form.address || "-"}
              />

              <Review
                label={lang === "mm" ? "ဓာတ်မတည့်မှုများ" : "Allergies"}
                value={form.allergies || "-"}
              />

              <Review
                label={
                  lang === "mm" ? "နာတာရှည်ရောဂါများ" : "Chronic Conditions"
                }
                value={form.chronicConditions || "-"}
              />

              <Review
                label={lang === "mm" ? "မွေးသက္ကရာဇ်" : "Date of Birth"}
                value={form.dateOfBirth || "-"}
              />
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            {step > 0 && (
              <button onClick={backStep} style={outlineBtn}>
                {t.back}
              </button>
            )}

            {step < 3 ? (
              <button onClick={nextStep} style={primaryBtn}>
                {t.next}
              </button>
            ) : (
              <button
                disabled={saving}
                onClick={createPatient}
                style={primaryBtn}
              >
                {saving ? "Saving..." : t.create}
              </button>
            )}
          </div>
        </section>

        <section>
          <div style={{ ...cardStyle, marginBottom: 16 }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.search}
              style={inputStyle}
            />
          </div>

          <div style={listHeader}>
            <h2 style={sectionTitle}>{t.list}</h2>
            <button onClick={loadPatients} style={outlineBtn}>
              Refresh
            </button>
          </div>

          {loading ? (
            <div style={emptyStyle}>Loading...</div>
          ) : filteredPatients.length === 0 ? (
            <div style={emptyStyle}>{t.empty}</div>
          ) : (
            <div style={patientGrid}>
              {filteredPatients.map((patient) => (
                <PatientCard
                  key={getPatientId(patient)}
                  patient={patient}
                  selected={selected}
                  onClick={() => {
                    setSelected(patient);
                    setDetailPatient(patient);
                  }}
                />
              ))}
            </div>
          )}

          {selected && (
            <div style={{ ...cardStyle, marginTop: 18 }}>
              <h2 style={sectionTitle}>
                {lang === "mm" ? "လူနာအသေးစိတ်" : "Patient Details"}
              </h2>

              <div
                style={{
                  marginTop: 14,
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 12,
                }}
              >
                <Info label={t.name} value={selected.name || "-"} />
                <Info
                  label={t.mobile}
                  value={selected.mobileNo || selected.mobile_no || "-"}
                />
                <Info label={t.email} value={selected.email || "-"} />
                <Info label={t.gender} value={selected.gender || "-"} />
                <Info
                  label={t.blood}
                  value={selected.bloodType || selected.blood_type || "-"}
                />
                <Info
                  label={t.dob}
                  value={selected.dateOfBirth || selected.date_of_birth || "-"}
                />
              </div>

              <div style={{ marginTop: 12 }}>
                <Info label={t.address} value={selected.address || "-"} />
              </div>
            </div>
          )}
        </section>
      </div>
      {detailPatient && (
        <div
          onClick={() => setDetailPatient(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.45)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 700,
              background: "#fff",
              borderRadius: 20,
              padding: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 20,
              }}
            >
              <h2>{lang === "mm" ? "လူနာအသေးစိတ်" : "Patient Details"}</h2>

              <button
                onClick={() => setDetailPatient(null)}
                style={{
                  border: 0,
                  background: "#F2F4F7",
                  borderRadius: 8,
                  padding: "8px 12px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              <Info
                label={lang === "mm" ? "အမည်" : "Name"}
                value={detailPatient.name || "-"}
              />

              <Info
                label={lang === "mm" ? "ဖုန်းနံပါတ်" : "Mobile"}
                value={detailPatient.mobileNo || detailPatient.mobile_no || "-"}
              />

              <Info
                label={lang === "mm" ? "အီးမေးလ်" : "Email"}
                value={detailPatient.email || "-"}
              />

              <Info
                label={lang === "mm" ? "သွေးအမျိုးအစား" : "Blood Type"}
                value={
                  detailPatient.bloodType || detailPatient.blood_type || "-"
                }
              />

              <Info
                label={lang === "mm" ? "ဓာတ်မတည့်မှုများ" : "Allergies"}
                value={detailPatient.allergies || "-"}
              />

              <Info
                label={
                  lang === "mm" ? "နာတာရှည်ရောဂါများ" : "Chronic Conditions"
                }
                value={detailPatient.chronicConditions || "-"}
              />

              <Info
                label={lang === "mm" ? "လိပ်စာ" : "Address"}
                value={detailPatient.address || "-"}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PatientCard({ patient, selected, onClick }) {
  const id = getPatientId(patient);
  const selectedId = selected ? getPatientId(selected) : null;
  const active = String(id) === String(selectedId);

  const name =
    patient.name ||
    patient.fullName ||
    patient.patientName ||
    "Unknown Patient";
  const mobile = patient.mobileNo || patient.mobile_no || "-";
  const blood = patient.bloodType || patient.blood_type || "-";
  const gender = patient.gender || "-";

  return (
    <article
      onClick={onClick}
      style={{
        background: CARD,
        border: `1px solid ${active ? PRIMARY : BORDER}`,
        borderRadius: 18,
        padding: 18,
        cursor: "pointer",
        boxShadow: active
          ? "0 12px 28px rgba(0,82,204,0.14)"
          : "0 1px 2px rgba(16,24,40,0.04)",
        transition: "0.18s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = "0 14px 28px rgba(16,24,40,0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = active
          ? "0 12px 28px rgba(0,82,204,0.14)"
          : "0 1px 2px rgba(16,24,40,0.04)";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={avatarStyle}>{name.slice(0, 2).toUpperCase()}</div>
        <div>
          <h3 style={{ color: TEXT, fontSize: 16, fontWeight: 800 }}>{name}</h3>
          <p style={{ color: MUTED, fontSize: 13, marginTop: 4 }}>{mobile}</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
        <span style={pillStyle}>Blood: {blood}</span>
        <span style={pillStyle}>Gender: {gender}</span>
      </div>
    </article>
  );
}

function Input({ label, ...props }) {
  return (
    <label style={labelStyle}>
      {label}
      <input {...props} style={inputStyle} />
    </label>
  );
}

function Review({ label, value }) {
  return (
    <div style={infoBox}>
      <span style={{ color: MUTED, fontSize: 12, fontWeight: 800 }}>
        {label}
      </span>
      <strong style={{ color: TEXT }}>{value}</strong>
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

const pageHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  marginBottom: 22,
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

const sectionTitle = {
  fontSize: 18,
  fontWeight: 800,
  color: TEXT,
};

const formGrid = {
  display: "grid",
  gap: 12,
};

const labelStyle = {
  display: "grid",
  gap: 7,
  color: TEXT,
  fontSize: 13,
  fontWeight: 800,
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

const infoBox = {
  border: `1px solid ${BORDER}`,
  background: BG,
  borderRadius: 14,
  padding: 14,
  display: "grid",
  gap: 4,
  color: MUTED,
  fontSize: 13,
};

const listHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 16,
};

const patientGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
  gap: 16,
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
  fontWeight: 800,
  flexShrink: 0,
};

const pillStyle = {
  background: PRIMARY_LIGHT,
  color: PRIMARY,
  padding: "5px 9px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 800,
};

const emptyStyle = {
  background: CARD,
  border: `1px solid ${BORDER}`,
  borderRadius: 18,
  padding: 30,
  color: MUTED,
  textAlign: "center",
};

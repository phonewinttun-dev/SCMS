import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import scmsApi from "../../services/scmsApi";

const PRIMARY = "#0052CC";
const PRIMARY_LIGHT = "#EBF2FF";
const SUCCESS = "#027A48";
const WARNING = "#B54708";
const BG = "#F6F8FB";
const CARD = "#FFFFFF";
const TEXT = "#1D2939";
const MUTED = "#667085";
const BORDER = "#E4E7EC";

const emptyForm = {
  patientId: "",
  appointmentId: "",
  followUpDate: "",
  reason: "",
  recommendation: "",
  notes: "",
};

const toArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.result)) return data.result;
  return [];
};

const getId = (item) => item.id || item.followUpId || item.follow_up_id;
const getPatientId = (p) => p.patientId || p.patient_id || p.id;

const getPatientName = (item) =>
  item.patientName ||
  item.patient?.name ||
  item.patient?.fullName ||
  item.name ||
  "Unknown Patient";

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

export default function FollowUps() {
  const outlet = useOutletContext();
  const lang = outlet?.lang || localStorage.getItem("lang") || "en";

  const [followUps, setFollowUps] = useState([]);
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const t = {
    title: lang === "mm" ? "ပြန်ချိန်းထားသော ရက်ချိန်းများ" : "Follow-Ups",
    subtitle:
      lang === "mm"
        ? "ဆေးခန်းပြန်လာရန် ချိန်းထားသော လူနာများကို စီမံပါ"
        : "Manage clinic return appointments and patient follow-up schedules",
    add: lang === "mm" ? "Follow-Up အသစ်ထည့်မည်" : "New Follow-Up",
    patient: lang === "mm" ? "လူနာ" : "Patient",
    appointment: lang === "mm" ? "ချိန်းဆိုမှု" : "Appointment",
    date: lang === "mm" ? "ပြန်ချိန်းသည့်နေ့" : "Follow-Up Date",
    reason: lang === "mm" ? "အကြောင်းအရင်း" : "Reason",
    recommendation: lang === "mm" ? "အကြံပြုချက်" : "Recommendation",
    notes: lang === "mm" ? "မှတ်ချက်" : "Notes",
    create: lang === "mm" ? "သိမ်းမည်" : "Create",
    cancel: lang === "mm" ? "မလုပ်တော့ပါ" : "Cancel",
    complete: lang === "mm" ? "ပြီးဆုံးပြီ" : "Complete",
    details: lang === "mm" ? "အသေးစိတ်" : "Details",
    search:
      lang === "mm"
        ? "လူနာအမည် / အကြောင်းအရင်းဖြင့်ရှာပါ..."
        : "Search by patient or reason...",
    all: lang === "mm" ? "အားလုံး" : "All",
    pending: lang === "mm" ? "စောင့်ဆိုင်း" : "Pending",
    completed: lang === "mm" ? "ပြီးဆုံး" : "Completed",
    empty: lang === "mm" ? "Follow-Up မတွေ့ပါ" : "No follow-ups found",
  };

  const loadData = async () => {
    try {
      setLoading(true);

      const [followRes, patientRes, appointmentRes] = await Promise.allSettled([
        scmsApi.followUps.list(),
        scmsApi.patients.list(),
        scmsApi.appointments.list(),
      ]);

      if (followRes.status === "fulfilled")
        setFollowUps(toArray(followRes.value));
      if (patientRes.status === "fulfilled")
        setPatients(toArray(patientRes.value));
      if (appointmentRes.status === "fulfilled")
        setAppointments(toArray(appointmentRes.value));
    } catch (error) {
      console.error("FollowUp load error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredFollowUps = useMemo(() => {
    return followUps.filter((item) => {
      const text = `${getPatientName(item)} ${item.reason || ""} ${
        item.recommendation || ""
      } ${item.notes || ""}`.toLowerCase();

      const isCompleted =
        item.completed ||
        item.isCompleted ||
        String(item.status || "").toLowerCase() === "completed";

      const matchSearch = text.includes(search.toLowerCase());
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "completed" && isCompleted) ||
        (statusFilter === "pending" && !isCompleted);

      return matchSearch && matchStatus;
    });
  }, [followUps, search, statusFilter]);

  const stats = useMemo(() => {
    const completed = followUps.filter(
      (x) =>
        x.completed ||
        x.isCompleted ||
        String(x.status || "").toLowerCase() === "completed",
    ).length;

    return {
      total: followUps.length,
      pending: followUps.length - completed,
      completed,
    };
  }, [followUps]);

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setShowCreate(false);
  };

  const createFollowUp = async (e) => {
    e.preventDefault();

    if (!form.patientId || !form.followUpDate) {
      alert(
        lang === "mm"
          ? "လူနာနှင့် ပြန်ချိန်းသည့်နေ့ ထည့်ပါ"
          : "Please select patient and follow-up date",
      );
      return;
    }

    try {
      setSaving(true);

      const dueAt =
        form.followUpDate.length === 16
          ? `${form.followUpDate}:00`
          : form.followUpDate;

      const payload = {
        patientId: Number(form.patientId),
        appointmentId: form.appointmentId ? Number(form.appointmentId) : null,
        prescriptionId: null,
        dueAt,
        recommendation:
          form.recommendation ||
          form.reason ||
          form.notes ||
          "Follow-up required",
      };

      console.log("FOLLOWUP PAYLOAD:", payload);

      await scmsApi.followUps.create(payload);
      console.log("FOLLOWUP PAYLOAD:", payload);

      await scmsApi.followUps.create(payload);
      resetForm();
      await loadData();
    } catch (error) {
      console.error("Create followup error:", error);
      alert("Follow-Up create failed. Please check backend DTO.");
    } finally {
      setSaving(false);
    }
  };

  const completeFollowUp = async (item) => {
    try {
      await scmsApi.followUps.complete(getId(item));
      await loadData();

      if (selected && getId(selected) === getId(item)) {
        setSelected(null);
      }
    } catch (error) {
      console.error("Complete followup error:", error);
      alert("Complete failed.");
    }
  };

  return (
    <div style={{ width: "100%" }}>
      <div style={pageHeader}>
        <div>
          <h1 style={titleStyle}>{t.title}</h1>
          <p style={subtitleStyle}>{t.subtitle}</p>
        </div>

        <button onClick={() => setShowCreate(true)} style={primaryBtn}>
          + {t.add}
        </button>
      </div>

      <section style={statsGrid}>
        <StatCard label={t.all} value={stats.total} color={PRIMARY} />
        <StatCard label={t.pending} value={stats.pending} color={WARNING} />
        <StatCard label={t.completed} value={stats.completed} color={SUCCESS} />
      </section>

      <section style={filterCard}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.search}
          style={inputStyle}
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ ...inputStyle, maxWidth: 220 }}
        >
          <option value="all">{t.all}</option>
          <option value="pending">{t.pending}</option>
          <option value="completed">{t.completed}</option>
        </select>

        <button onClick={loadData} style={outlineBtn}>
          Refresh
        </button>
      </section>

      {loading ? (
        <div style={emptyStyle}>Loading...</div>
      ) : filteredFollowUps.length === 0 ? (
        <div style={emptyStyle}>{t.empty}</div>
      ) : (
        <section style={followGrid}>
          {filteredFollowUps.map((item) => {
            const completed =
              item.completed ||
              item.isCompleted ||
              String(item.status || "").toLowerCase() === "completed";

            return (
              <article key={getId(item)} style={followCard}>
                <div style={cardTop}>
                  <div style={avatarStyle}>
                    {getPatientName(item).slice(0, 2).toUpperCase()}
                  </div>

                  <div>
                    <h3 style={cardTitle}>{getPatientName(item)}</h3>
                    <p style={cardSub}>
                      {formatDate(
                        item.dueDate ||
                          item.followUpDate ||
                          item.follow_up_date ||
                          item.date ||
                          item.appointmentDate,
                      )}
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    ...badgeStyle,
                    color: completed ? SUCCESS : WARNING,
                    background: completed ? "#ECFDF3" : "#FFFAEB",
                    borderColor: completed ? "#A9EFC5" : "#FEDF89",
                  }}
                >
                  {completed ? t.completed : t.pending}
                </div>

                <div style={infoBox}>
                  <span style={infoLabel}>{t.recommendation}</span>
                  <strong>
                    {item.recommendation ||
                      item.reason ||
                      item.description ||
                      "-"}
                  </strong>
                </div>

                <div style={notesBox}>
                  <strong>{t.notes}</strong>
                  <p>{item.notes || item.note || "-"}</p>
                </div>

                <div style={actionRow}>
                  <button onClick={() => setSelected(item)} style={outlineBtn}>
                    {t.details}
                  </button>

                  {!completed && (
                    <button
                      onClick={() => completeFollowUp(item)}
                      style={primaryBtn}
                    >
                      {t.complete}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}

      {showCreate && (
        <Modal onClose={resetForm} width={720}>
          <h2 style={modalTitle}>{t.add}</h2>

          <form onSubmit={createFollowUp} style={{ display: "grid", gap: 14 }}>
            <label style={labelStyle}>
              {t.patient}
              <select
                name="patientId"
                value={form.patientId}
                onChange={handleChange}
                style={inputStyle}
              >
                <option value="">{t.patient}</option>
                {patients.map((p) => (
                  <option key={getPatientId(p)} value={getPatientId(p)}>
                    {getPatientName(p)}
                  </option>
                ))}
              </select>
            </label>

            <label style={labelStyle}>
              {t.appointment}
              <select
                name="appointmentId"
                value={form.appointmentId}
                onChange={handleChange}
                style={inputStyle}
              >
                <option value="">Optional appointment</option>
                {appointments.map((a) => (
                  <option
                    key={a.id || a.appointmentId}
                    value={a.id || a.appointmentId}
                  >
                    {a.appointmentCode ||
                      a.appointment_code ||
                      `APT-${a.id || a.appointmentId}`}{" "}
                    — {a.patientName || a.patient?.name || ""}
                  </option>
                ))}
              </select>
            </label>

            <label style={labelStyle}>
              {t.date}
              <input
                type="datetime-local"
                name="followUpDate"
                value={form.followUpDate}
                onChange={handleChange}
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              {t.reason}
              <input
                name="reason"
                value={form.reason}
                onChange={handleChange}
                style={inputStyle}
                placeholder="Review, lab result check, medicine follow-up..."
              />
            </label>

            <label style={labelStyle}>
              {t.recommendation}
              <textarea
                name="recommendation"
                value={form.recommendation}
                onChange={handleChange}
                rows={3}
                style={{ ...inputStyle, resize: "vertical" }}
                placeholder="Come back after 7 days, check blood pressure again..."
              />
            </label>

            <label style={labelStyle}>
              {t.notes}
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={4}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </label>

            <div style={modalActions}>
              <button type="button" onClick={resetForm} style={outlineBtn}>
                {t.cancel}
              </button>
              <button type="submit" disabled={saving} style={primaryBtn}>
                {saving ? "Saving..." : t.create}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {selected && (
        <Modal onClose={() => setSelected(null)} width={720}>
          <div style={modalHeader}>
            <div>
              <h2 style={modalTitle}>{t.details}</h2>
              <p style={subtitleStyle}>{getPatientName(selected)}</p>
            </div>

            <button onClick={() => setSelected(null)} style={closeBtn}>
              ✕
            </button>
          </div>

          <div style={detailGrid}>
            <Info label={t.patient} value={getPatientName(selected)} />
            <Info
              label={t.date}
              value={formatDate(
                selected.dueDate ||
                  selected.followUpDate ||
                  selected.follow_up_date ||
                  selected.date ||
                  selected.appointmentDate,
              )}
            />
            <Info
              label={t.recommendation}
              value={
                selected.recommendation ||
                selected.reason ||
                selected.description ||
                "-"
              }
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
            <p>{selected.notes || selected.note || "-"}</p>
          </div>

          <div style={modalActions}>
            <button onClick={() => setSelected(null)} style={outlineBtn}>
              {t.cancel}
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
      <span style={infoLabel}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Modal({ children, onClose, width = 700 }) {
  return (
    <div onClick={onClose} style={modalOverlay}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ ...modalBox, maxWidth: width }}
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

const followGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))",
  gap: 16,
};

const followCard = {
  background: CARD,
  border: `1px solid ${BORDER}`,
  borderRadius: 18,
  padding: 18,
};

const cardTop = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginBottom: 14,
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
};

const cardTitle = {
  color: TEXT,
  fontSize: 17,
  fontWeight: 800,
};

const cardSub = {
  color: MUTED,
  fontSize: 13,
  marginTop: 4,
};

const badgeStyle = {
  display: "inline-flex",
  border: "1px solid",
  borderRadius: 999,
  padding: "5px 10px",
  fontSize: 12,
  fontWeight: 800,
  marginBottom: 14,
};

const infoBox = {
  border: `1px solid ${BORDER}`,
  background: BG,
  borderRadius: 14,
  padding: 13,
  display: "grid",
  gap: 5,
};

const infoLabel = {
  color: MUTED,
  fontSize: 12,
  fontWeight: 800,
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

const labelStyle = {
  display: "grid",
  gap: 7,
  color: TEXT,
  fontSize: 13,
  fontWeight: 800,
};

const emptyStyle = {
  background: CARD,
  border: `1px solid ${BORDER}`,
  borderRadius: 18,
  padding: 34,
  color: MUTED,
  textAlign: "center",
};

const modalOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
  padding: 20,
};

const modalBox = {
  width: "100%",
  maxHeight: "90vh",
  overflowY: "auto",
  background: CARD,
  borderRadius: 22,
  padding: 24,
  boxShadow: "0 24px 60px rgba(16,24,40,0.25)",
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

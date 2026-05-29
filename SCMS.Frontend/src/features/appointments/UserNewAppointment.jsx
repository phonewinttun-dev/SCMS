import { useEffect, useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import scmsApi from "../../services/scmsApi";

const PRIMARY = "#4F46E5";
const PRIMARY_DARK = "#4338CA";
const SUCCESS = "#027A48";
const BG = "#F9FAFB";
const CARD = "#FFFFFF";
const TEXT = "#1F2937";
const MUTED = "#6B7280";
const BORDER = "#E5E7EB";
const DANGER = "#D92D20";

export default function UserNewAppointment() {
  const navigate = useNavigate();
  const outlet = useOutletContext();
  const lang = outlet?.lang || localStorage.getItem("lang") || "en";

  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const t = {
    title: lang === "mm" ? "ချိန်းဆိုမှု အသစ်ရယူရန်" : "Book New Appointment",
    subtitle: lang === "mm" ? "ဆေးခန်းလာပြရန် ရက်စွဲနှင့် အချက်အလက်များ ဖြည့်သွင်းပါ" : "Provide details and date to request an automated slot",
    patient: lang === "mm" ? "လူနာရွေးချယ်ပါ" : "Select Patient Profile",
    date: lang === "mm" ? "ရက်စွဲရွေးချယ်ပါ" : "Select Appointment Date",
    notes: lang === "mm" ? "လက္ခဏာ သို့မဟုတ် မှတ်စု" : "Symptoms or Consultation Notes",
    submit: lang === "mm" ? "Slot တောင်းခံမည်" : "Request Appointment Slot",
    successTitle: lang === "mm" ? "အောင်မြင်စွာ Book လုပ်ပြီးပါပြီ!" : "Appointment Confirmed!",
    successCode: lang === "mm" ? "ချိန်းဆိုမှုကုဒ်" : "Appointment Code",
    successTime: lang === "mm" ? "သတ်မှတ်ချိန် (ဆွေးနွေးရန်)" : "Assigned Time (Expected Consultation)",
    successToken: lang === "mm" ? "တိုကင်နံပါတ်" : "Queue Token Number",
    warningArrival: lang === "mm" 
      ? "🚨 အရေးကြီးအသိပေးချက်- သတ်မှတ်ထားသော အချိန်ထက် ၃၀ မိနစ်စော၍ ဆေးခန်းသို့ ရောက်ရှိပေးပါရန်။" 
      : "🚨 IMPORTANT CHECK-IN ARRIVAL: Please arrive at the clinic 30 minutes earlier than your assigned slot for reception check-in.",
  };

  const loadPatients = async () => {
    try {
      setLoading(true);
      setError("");
      const db = await scmsApi.dashboard.patient();
      const profiles = db?.patientProfiles || [];
      setPatients(profiles);
      if (profiles.length > 0) {
        setSelectedPatientId(profiles[0].patientId);
      }
    } catch (err) {
      console.error("Load patients error:", err);
      setError("Failed to load patient profiles. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, []);

  const handleBook = async (e) => {
    e.preventDefault();
    if (!selectedPatientId || !bookingDate) {
      setError("Please select both a patient profile and a date.");
      return;
    }

    try {
      setBooking(true);
      setError("");
      
      // Since bookingDate is a date string (YYYY-MM-DD), we'll pass it to backend.
      // The backend auto-assigns slot times (starting at 08:00 AM, 15m intervals)
      const payload = {
        patientId: Number(selectedPatientId),
        datetime: new Date(bookingDate).toISOString(),
        notes: notes.trim(),
      };

      const res = await scmsApi.appointments.create(payload);
      // Expected backend response Result<BookAppointmentResponse>
      if (res?.isSuccess || res?.data) {
        setResult(res.data || res);
      } else {
        setError(res?.message || "Booking slot assignment failed. Please retry.");
      }
    } catch (err) {
      console.error("Booking error:", err);
      setError((err as Error).response?.data?.message || "Failed to book appointment. Check the date.");
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: "40px", color: MUTED }}>Loading profiles...</div>;
  }

  // Get tomorrow's date string for input min attribute
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "10px 0" }}>
      {result ? (
        <article style={{ background: CARD, border: `1px solid ${BORDER}`, padding: 32, borderRadius: 18, boxShadow: "0 10px 30px rgba(0,0,0,0.05)", textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#ECFDF3", color: SUCCESS, display: "flex", alignItems: "center", justifyCenter: "center", margin: "0 auto 20px", fontSize: 32, fontWeight: 900, justifyContent: "center" }}>✓</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: TEXT, marginBottom: 8 }}>{t.successTitle}</h2>
          <p style={{ fontSize: 14, color: MUTED, marginBottom: 24 }}>Your check-in telemetry has been created successfully.</p>

          <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20, textAlign: "left", display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ fontWeight: 600, color: MUTED }}>{t.successCode}</span>
              <span style={{ fontWeight: 800, color: PRIMARY, fontFamily: "monospace" }}>{result.appointmentCode}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ fontWeight: 600, color: MUTED }}>{t.successToken}</span>
              <span style={{ fontWeight: 800, color: SUCCESS }}>Token #{result.tokenNumber}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ fontWeight: 600, color: MUTED }}>Estimated Wait</span>
              <span style={{ fontWeight: 700, color: TEXT }}>{result.estimatedWaitTimeMinutes} mins</span>
            </div>
          </div>

          <div style={{ background: "#FFFAEB", border: "1px solid #FEDF89", color: WARNING, padding: "14px 18px", borderRadius: 12, fontSize: 13, lineHeight: 1.5, textAlign: "left", fontWeight: 700, marginBottom: 28 }}>
            {t.warningArrival}
          </div>

          <button onClick={() => navigate("/user/dashboard")} style={{ padding: "12px 24px", background: PRIMARY, color: "white", border: 0, borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: "pointer", transition: "0.18s" }}>
            Return to Dashboard
          </button>
        </article>
      ) : (
        <article style={{ background: CARD, border: `1px solid ${BORDER}`, padding: 28, borderRadius: 18, boxShadow: "0 1px 2px rgba(16,24,40,0.04)" }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: TEXT }}>{t.title}</h2>
          <p style={{ fontSize: 14, color: MUTED, marginTop: 4, marginBottom: 24 }}>{t.subtitle}</p>

          {error && <div style={{ color: DANGER, background: "#FFF1F0", padding: "12px 16px", borderRadius: 12, border: `1px solid #FECDCA`, marginBottom: 20 }}>{error}</div>}

          <form onSubmit={handleBook} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{t.patient}</label>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                style={inputStyle}
                required
              >
                {patients.map((p) => (
                  <option key={p.patientId} value={p.patientId}>
                    {p.name} (DOB: {p.dateOfBirth})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{t.date}</label>
              <input
                type="date"
                value={bookingDate}
                min={tomorrowStr}
                onChange={(e) => setBookingDate(e.target.value)}
                style={inputStyle}
                required
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{t.notes}</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Briefly describe reasons for consultation (e.g. fever, headache, routine review)"
                style={{ ...inputStyle, fontFamily: "inherit", resize: "vertical" }}
              />
            </div>

            <button
              type="submit"
              disabled={booking}
              style={{
                background: PRIMARY,
                color: "white",
                border: 0,
                borderRadius: 12,
                padding: "12px 20px",
                fontSize: 14,
                fontWeight: 700,
                cursor: booking ? "not-allowed" : "pointer",
                transition: "0.18s",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 8
              }}
            >
              {booking ? "Scheduling Slot..." : t.submit}
            </button>
          </form>
        </article>
      )}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 10,
  border: `1px solid ${BORDER}`,
  outline: "none",
  fontSize: 14,
  background: "#F9FAFB",
};

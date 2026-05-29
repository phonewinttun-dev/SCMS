import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import scmsApi from "../../services/scmsApi";
import { Pill, Download } from "lucide-react";

const PRIMARY = "#4F46E5";
const BORDER = "#E5E7EB";
const CARD = "#FFFFFF";
const TEXT = "#1F2937";
const MUTED = "#6B7280";
const DANGER = "#D92D20";

export default function UserMyPrescriptions() {
  const outlet = useOutletContext();
  const lang = outlet?.lang || localStorage.getItem("lang") || "en";

  const [patientId, setPatientId] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadingId, setDownloadingId] = useState(null);

  const t = {
    title: lang === "mm" ? "ကျွန်ုပ်၏ ဆေးညွှန်းများ" : "My Prescriptions",
    subtitle: lang === "mm" ? "ဆရာဝန်မှ ညွှန်းဆိုထားသော ဆေးဝါးများနှင့် သောက်သုံးရန် ညွှန်ကြားချက်များ" : "View prescribed medications, dosage schedules, and download doctor slips",
    noPrescription: lang === "mm" ? "မည်သည့် ဆေးညွှန်းမျှ မရှိသေးပါ။" : "No prescription history found.",
    download: lang === "mm" ? "Slip ရယူမည်" : "Download Slip",
  };

  const loadPrescriptions = async () => {
    try {
      setLoading(true);
      setError("");
      
      const dashboard = await scmsApi.dashboard.patient();
      const profile = dashboard?.patientProfiles?.[0];
      if (profile) {
        const pid = profile.patientId;
        setPatientId(pid);

        // Fetch all prescriptions and filter for this patient
        const allPrescriptions = await scmsApi.prescriptions.list();
        const filtered = (allPrescriptions || []).filter(p => p.patientId === pid);
        setPrescriptions(filtered);
      }
    } catch (err) {
      console.error("Load prescriptions error:", err);
      setError("Failed to load prescriptions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrescriptions();
  }, []);

  const handleDownloadPrescription = async (id) => {
    try {
      setDownloadingId(id);
      const res = await scmsApi.prescriptions.pdf(id);
      
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `prescription-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Download prescription PDF error:", err);
      alert("Failed to download prescription PDF. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: "40px", color: MUTED }}>Loading prescription orders...</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: TEXT }}>{t.title}</h2>
        <p style={{ fontSize: 14, color: MUTED, marginTop: 4 }}>{t.subtitle}</p>
      </div>

      {error && <div style={{ color: DANGER, background: "#FFF1F0", padding: "12px 16px", borderRadius: 12, border: `1px solid #FECDCA` }}>{error}</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {prescriptions.length === 0 ? (
          <article style={{ background: CARD, border: `1px solid ${BORDER}`, padding: 40, borderRadius: 18, textAlign: "center", color: MUTED }}>
            <Pill size={36} style={{ color: PRIMARY, margin: "0 auto 12px" }} />
            <p style={{ fontSize: 14 }}>{t.noPrescription}</p>
          </article>
        ) : (
          prescriptions.map((presc) => (
            <article key={presc.id} style={{ background: CARD, border: `1px solid ${BORDER}`, padding: 20, borderRadius: 18, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                <div style={{ padding: 10, borderRadius: 10, background: "#EEF2FF", color: PRIMARY }}>
                  <Pill size={20} />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>Prescription #{presc.id}</div>
                  <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>Ordered by Doctor • Date: {new Date(presc.createdAt).toLocaleDateString()}</div>
                  
                  {presc.notes && (
                    <div style={{ fontSize: 13, color: TEXT, marginTop: 8, background: "#F9FAFB", padding: "8px 12px", borderRadius: 8, borderLeft: `3px solid ${PRIMARY}` }}>
                      {presc.notes}
                    </div>
                  )}

                  {/* Render items list if present */}
                  {presc.tblPrescriptionItems && presc.tblPrescriptionItems.length > 0 && (
                    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                      {presc.tblPrescriptionItems.map((item, idx) => (
                        <div key={idx} style={{ fontSize: 12, color: TEXT }}>
                          • <strong style={{ color: PRIMARY }}>{item.medicineBatch?.med?.name || "Medicine"}</strong> - {item.dosage} ({item.days} Days, Qty: {item.quantity})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleDownloadPrescription(presc.id)}
                disabled={downloadingId === presc.id}
                style={{
                  border: 0,
                  borderRadius: 10,
                  background: PRIMARY,
                  color: "white",
                  padding: "8px 14px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: downloadingId === presc.id ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4
                }}
              >
                <Download size={14} />
                {downloadingId === presc.id ? "Downloading..." : t.download}
              </button>
            </article>
          ))
        )}
      </div>
    </div>
  );
}

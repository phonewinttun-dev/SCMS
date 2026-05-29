import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import scmsApi from "../../services/scmsApi";
import { FileText, Download, ShieldAlert } from "lucide-react";

const PRIMARY = "#4F46E5";
const BORDER = "#E5E7EB";
const CARD = "#FFFFFF";
const TEXT = "#1F2937";
const MUTED = "#6B7280";
const DANGER = "#D92D20";

export default function UserMyDocuments() {
  const outlet = useOutletContext();
  const lang = outlet?.lang || localStorage.getItem("lang") || "en";

  const [patientId, setPatientId] = useState(null);
  const [labReports, setLabReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadingSummary, setDownloadingSummary] = useState(false);
  const [downloadingLabId, setDownloadingLabId] = useState(null);

  const t = {
    title: lang === "mm" ? "ကျွန်ုပ်၏ စာရွက်စာတမ်းများ" : "Medical Documents",
    subtitle: lang === "mm" ? "ဆေးခန်းမှ ထုတ်ပေးထားသော ဆေးဘက်ဆိုင်ရာမှတ်တမ်းများနှင့် ဓာတ်ခွဲခန်းအဖြေများ" : "Access clinic letters, lab results, and health summaries",
    summaryTitle: lang === "mm" ? "လူနာကျန်းမာရေးအကျဉ်းချုပ်" : "Clinical Summary Report",
    summaryDesc: lang === "mm" ? "ဆရာဝန်မှ ပြုစုထားသော သင်၏ ရောဂါရာဇဝင်နှင့် ဆေးခန်းမှတ်တမ်းအကျဉ်း" : "Full summary of diagnoses, treatments, and clinical encounters",
    labTitle: lang === "mm" ? "ဓာတ်ခွဲခန်း အဖြေများ" : "Laboratory Results",
    download: lang === "mm" ? "PDF ရယူမည်" : "Download PDF",
    noDoc: lang === "mm" ? "မည်သည့်စာရွက်စာတမ်းမျှ မရှိသေးပါ။" : "No medical records found.",
  };

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError("");
      
      // Load patient dashboard to identify patientId
      const dashboard = await scmsApi.dashboard.patient();
      const profile = dashboard?.patientProfiles?.[0];
      if (profile) {
        const pid = profile.patientId;
        setPatientId(pid);

        // Fetch lab reports
        const labs = await scmsApi.labReports.list();
        // Filter lab reports for this patient specifically
        const filteredLabs = (labs || []).filter(l => l.patientId === pid);
        setLabReports(filteredLabs);
      }
    } catch (err) {
      console.error("Load documents error:", err);
      setError("Failed to load medical documents. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleDownloadSummary = async () => {
    if (!patientId) return;
    try {
      setDownloadingSummary(true);
      const res = await scmsApi.patients.summaryPdf(patientId);
      
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `clinical-summary-${patientId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Download summary error:", err);
      alert("Failed to download clinical summary. Please try again later.");
    } finally {
      setDownloadingSummary(false);
    }
  };

  const handleDownloadLab = async (labId) => {
    try {
      setDownloadingLabId(labId);
      const res = await scmsApi.labReports.pdf(labId);
      
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `lab-report-${labId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Download lab report error:", err);
      alert("Failed to download lab report PDF. Please try again.");
    } finally {
      setDownloadingLabId(null);
    }
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: "40px", color: MUTED }}>Loading medical records...</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: TEXT }}>{t.title}</h2>
        <p style={{ fontSize: 14, color: MUTED, marginTop: 4 }}>{t.subtitle}</p>
      </div>

      {error && <div style={{ color: DANGER, background: "#FFF1F0", padding: "12px 16px", borderRadius: 12, border: `1px solid #FECDCA` }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Summary Document download card */}
        {patientId ? (
          <article style={{ background: CARD, border: `1px solid ${BORDER}`, padding: 24, borderRadius: 18, display: "flex", alignItems: "flex-start", gap: 16 }}>
            <div style={{ padding: 12, borderRadius: 12, background: "#EEF2FF", color: PRIMARY }}>
              <FileText size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: TEXT }}>{t.summaryTitle}</h3>
              <p style={{ fontSize: 13, color: MUTED, marginTop: 4, lineHeight: 1.45 }}>{t.summaryDesc}</p>
              
              <button
                onClick={handleDownloadSummary}
                disabled={downloadingSummary}
                style={{
                  marginTop: 18,
                  border: 0,
                  borderRadius: 10,
                  background: PRIMARY,
                  color: "white",
                  padding: "8px 14px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: downloadingSummary ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                <Download size={15} />
                {downloadingSummary ? "Generating PDF..." : t.download}
              </button>
            </div>
          </article>
        ) : (
          <article style={{ background: CARD, border: `1px solid ${BORDER}`, padding: 24, borderRadius: 18, textAlign: "center", color: MUTED }}>
            <ShieldAlert size={36} style={{ color: WARNING, margin: "0 auto 10px" }} />
            <div style={{ fontSize: 14, fontWeight: 800 }}>Profile Sync Error</div>
            <p style={{ fontSize: 12, marginTop: 4 }}>Cannot identify patient ID. Please verify account registration.</p>
          </article>
        )}

        {/* Lab reports checklist */}
        <article style={{ background: CARD, border: `1px solid ${BORDER}`, padding: 20, borderRadius: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800 }}>{t.labTitle}</h3>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {labReports.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 10px", color: MUTED, fontSize: 13 }}>{t.noDoc}</div>
            ) : (
              labReports.map((lab) => (
                <div key={lab.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: `1px solid ${BORDER}`, padding: 12, borderRadius: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{lab.testName || "Laboratory Report"}</div>
                    <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>Released: {new Date(lab.createdAt || lab.updatedAt).toLocaleDateString()}</div>
                  </div>

                  <button
                    onClick={() => handleDownloadLab(lab.id)}
                    disabled={downloadingLabId === lab.id}
                    style={{
                      border: 0,
                      background: "#F3F4F6",
                      color: TEXT,
                      padding: "6px 12px",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: downloadingLabId === lab.id ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4
                    }}
                  >
                    <Download size={14} />
                    {downloadingLabId === lab.id ? "Downloading..." : "PDF"}
                  </button>
                </div>
              ))
            )}
          </div>
        </article>
      </div>
    </div>
  );
}

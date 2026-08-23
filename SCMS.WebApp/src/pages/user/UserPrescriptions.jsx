import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  FileTextIcon,
  DownloadIcon,
  ReloadIcon,
} from "@radix-ui/react-icons";
import PageHeader from "../../components/PageHeader";
import { prescriptionsApi, downloadBlob } from "../../services/scmsApi";
import { showError, showSuccess } from "../../services/dialogs";
import { formatDate } from "../../utils/format";
import { formatTemperatureF, parsePrescriptionNotes } from "../../utils/clinical";

export default function UserPrescriptions() {
  const {
    activeProfile,
    filteredTelemetry,
    loadDashboard,
    t,
  } = useOutletContext();

  const [downloadingId, setDownloadingId] = useState(null);

  const prescriptions = filteredTelemetry?.prescriptions || [];

  const handleDownload = async (rxId) => {
    try {
      setDownloadingId(rxId);
      const res = await prescriptionsApi.pdf(rxId);
      downloadBlob(res, `prescription-${rxId}.pdf`);
      showSuccess("Prescription PDF downloaded successfully.");
    } catch {
      showError("Failed to download digital prescription PDF.");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader
        title={t.medicalRecordsAndPrescriptions || "Medical Records & Digital Prescriptions"}
        subtitle={`Review verified clinical diagnoses, prescribed medication schedules, and download doctor-signed PDFs for ${
          activeProfile?.name || "your profile"
        }.`}
        actions={
          <button
            onClick={() => loadDashboard(activeProfile?.patientId)}
            className="scms-btn-outline px-3.5 btn-target flex items-center gap-2"
            title={t.refresh || "Refresh"}
            aria-label={t.refresh || "Refresh"}
          >
            <ReloadIcon className="w-4 h-4" />
            <span className="text-xs font-bold hidden sm:inline">{t.refresh || "Refresh"}</span>
          </button>
        }
      />

      {/* Prescription Wallet Grid */}
      {prescriptions.length === 0 ? (
        <div className="rounded-3xl border border-border/80 bg-card p-12 text-center text-xs text-muted-foreground shadow-scms space-y-3">
          <FileTextIcon className="w-12 h-12 mx-auto opacity-40 text-orange-500" />
          <h3 className="font-bold text-base text-foreground">No prescription records found</h3>
          <p className="max-w-md mx-auto">
            Once you complete a consultation with our clinic physician, your digital prescriptions and medication instructions will appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {prescriptions.map((rx) => (
            <div
              key={rx.id}
              className="rounded-3xl border border-border/80 bg-card/95 p-6 shadow-scms flex flex-col justify-between gap-4"
            >
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-border/70">
                  <div>
                    <span className="text-xs font-mono font-bold text-orange-600 dark:text-orange-400">
                      Visit {rx.appointmentCode || `APT-${rx.appointmentId || rx.id}`}
                    </span>
                    <h4 className="text-sm font-bold text-foreground mt-0.5">
                      Issued on {formatDate(rx.createdAt || rx.prescribedAt)}
                    </h4>
                  </div>
                  <button
                    onClick={() => handleDownload(rx.id)}
                    disabled={downloadingId === rx.id}
                    className="scms-btn-icon text-orange-600 dark:text-orange-400"
                    title="Download Official Prescription PDF"
                    aria-label="Download Official Prescription PDF"
                  >
                    {downloadingId === rx.id ? (
                      <span className="loading loading-spinner loading-xs" />
                    ) : (
                      <DownloadIcon className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Primary Diagnosis */}
                {rx.diseaseName && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-900/60 px-3 py-1 rounded-full">
                      🩺 {rx.diseaseName}
                    </span>
                  </div>
                )}

                {/* Vitals Summary Card */}
                {(rx.bloodPressureSystolic || rx.weightKg || rx.temperatureC) && (
                  <div className="grid grid-cols-3 gap-2 bg-secondary/40 rounded-2xl p-3 text-center text-xs">
                    {rx.weightKg > 0 && (
                      <div>
                        <div className="text-[10px] font-bold text-muted-foreground uppercase">Weight</div>
                        <strong className="text-foreground font-mono">{rx.weightKg} kg</strong>
                      </div>
                    )}
                    {rx.bloodPressureSystolic > 0 && (
                      <div>
                        <div className="text-[10px] font-bold text-muted-foreground uppercase">Blood Pressure</div>
                        <strong className="text-foreground font-mono">
                          {rx.bloodPressureSystolic}/{rx.bloodPressureDiastolic}
                        </strong>
                      </div>
                    )}
                    {rx.temperatureC > 0 && (
                      <div>
                        <div className="text-[10px] font-bold text-muted-foreground uppercase">Temperature</div>
                        <strong className="text-foreground font-mono">
                          {formatTemperatureF(rx.temperatureC)}
                        </strong>
                      </div>
                    )}
                  </div>
                )}

                {/* Prescribed Items Schedule */}
                {rx.items?.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Prescribed Medications
                    </div>
                    <div className="space-y-1.5">
                      {rx.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 rounded-2xl bg-secondary/30 border border-border/60 text-xs"
                        >
                          <div>
                            <span className="font-bold text-foreground">💊 {item.medicineName}</span>
                            {item.instructions && (
                              <p className="text-[11px] text-muted-foreground italic mt-0.5">
                                {item.instructions}
                              </p>
                            )}
                          </div>
                          <span className="font-mono text-[11px] font-bold text-orange-600 dark:text-orange-400 bg-card px-2.5 py-1 rounded-xl border border-border/80 shrink-0">
                            {item.dosage} &times; {item.days} days
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Clinical Notes */}
                {rx.notes && (
                  <div className="text-xs text-muted-foreground italic bg-secondary/20 p-3 rounded-2xl border border-border/60">
                    &ldquo;{parsePrescriptionNotes(rx.notes)}&rdquo;
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-border/70 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleDownload(rx.id)}
                  disabled={downloadingId === rx.id}
                  className="scms-btn-primary text-xs font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <DownloadIcon className="w-3.5 h-3.5" />
                  <span>Download Verified PDF</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

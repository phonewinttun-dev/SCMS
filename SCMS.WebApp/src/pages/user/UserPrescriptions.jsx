import { Download, FileText } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { downloadBlob, prescriptionsApi } from "../../services/scmsApi";
import { showError } from "../../services/dialogs";

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString();
};

export default function UserPrescriptions() {
  const { activeProfile, filteredTelemetry } = useOutletContext();
  const prescriptions = filteredTelemetry.prescriptions || [];

  const download = async (prescription) => {
    try {
      const id = prescription.id || prescription.prescriptionId;
      const response = await prescriptionsApi.pdf(id);
      downloadBlob(response, `prescription-${id}.pdf`);
    } catch (error) {
      await showError(error?.response?.data?.message || "Failed to download prescription.");
    }
  };

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-black text-slate-900">Prescriptions</h2>
        <p className="text-sm font-semibold text-slate-500">Clinical prescriptions for {activeProfile?.name || "the active patient"}.</p>
      </div>

      {prescriptions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-bold text-slate-500">
          No prescription records for this profile.
        </div>
      ) : (
        <div className="grid gap-4">
          {prescriptions.map((prescription) => (
            <article key={prescription.id || prescription.prescriptionId} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-lg font-black text-slate-900">
                    <FileText size={18} />
                    {prescription.diseaseName || "General consultation"}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-500">{formatDate(prescription.createdAt)}</div>
                  {prescription.notes && <p className="mt-3 text-sm text-slate-600">{prescription.notes}</p>}
                </div>
                <button className="btn rounded-xl border-slate-200 bg-white" onClick={() => download(prescription)}>
                  <Download size={16} />
                  PDF
                </button>
              </div>
              {prescription.items?.length > 0 && (
                <div className="mt-4 grid gap-2">
                  {prescription.items.map((item) => (
                    <div key={item.id || `${item.medicineName}-${item.quantity}`} className="rounded-xl bg-slate-50 p-3 text-sm">
                      <strong>{item.medicineName}</strong> - {item.dosage || "Dose not specified"} x {item.days || 0} days
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

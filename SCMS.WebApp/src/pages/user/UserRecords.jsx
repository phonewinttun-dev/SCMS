import { Download, Plus, User } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { downloadBlob, patientsApi } from "../../services/scmsApi";
import { showAlert, showError } from "../../services/dialogs";

export default function UserRecords() {
  const { data, activeProfile, setActiveProfile, setManageOpen } = useOutletContext();
  const profiles = data?.patientProfiles || [];

  const downloadSummary = async (profile) => {
    try {
      const response = await patientsApi.summaryPdf(profile.patientId);
      downloadBlob(response, `medical-summary-${profile.patientId}.pdf`);
      await showAlert("Medical summary downloaded successfully.");
    } catch (error) {
      await showError(error?.response?.data?.message || "Failed to download medical summary.");
    }
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Family Records</h2>
          <p className="text-sm font-semibold text-slate-500">Manage patient profiles linked to this account.</p>
        </div>
        <button className="btn rounded-xl bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => setManageOpen(true)}>
          <Plus size={16} />
          Add Profile
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {profiles.map((profile) => (
          <article key={profile.patientId} className={`rounded-2xl border bg-white p-5 shadow-sm ${activeProfile?.patientId === profile.patientId ? "border-indigo-300" : "border-slate-200"}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-lg font-black text-slate-900">
                  <User size={18} />
                  {profile.name}
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-500">
                  {profile.gender || "Gender not set"} | {profile.bloodType || "Blood type not set"}
                </div>
                <p className="mt-3 text-sm text-slate-600">{profile.actualAddress || "No address recorded."}</p>
              </div>
              <button className="btn btn-sm rounded-xl border-indigo-200 bg-indigo-50 text-indigo-700" onClick={() => setActiveProfile(profile)}>
                Select
              </button>
            </div>
            <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
              <div><dt className="font-black text-slate-500">Mobile</dt><dd>{profile.mobileNo || "-"}</dd></div>
              <div><dt className="font-black text-slate-500">DOB</dt><dd>{profile.dateOfBirth || "-"}</dd></div>
              <div><dt className="font-black text-slate-500">Allergies</dt><dd>{profile.allergies || "None"}</dd></div>
              <div><dt className="font-black text-slate-500">Chronic</dt><dd>{profile.chronicConditions || "None"}</dd></div>
            </dl>
            <button className="btn mt-4 w-full rounded-xl border-slate-200 bg-white text-slate-700" onClick={() => downloadSummary(profile)}>
              <Download size={16} />
              Download Medical Summary
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

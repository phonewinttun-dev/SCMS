import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  PlusIcon,
  DownloadIcon,
  Cross2Icon,
  ExclamationTriangleIcon,
} from "@radix-ui/react-icons";
import PageHeader from "../../components/PageHeader";
import { Select } from "../../components/ui/select";
import DateInput from "../../components/DateInput";
import { patientsApi, downloadBlob } from "../../services/scmsApi";
import { showError, showSuccess } from "../../services/dialogs";
import { validatePatientProfile } from "../../utils/validation";
import useScrollLock from "../../hooks/useScrollLock";
import ModalPortal from "../../components/ModalPortal";

export default function UserFamilyProfiles() {
  const {
    data,
    activeProfile,
    setActiveProfile,
    loadDashboard,
    language,
    t,
  } = useOutletContext();

  const patientProfiles =
    data?.patientProfiles ||
    data?.data?.patientProfiles ||
    (Array.isArray(data) ? data : []);

  const [manageOpen, setManageOpen] = useState(false);
  const [profileDetailOpen, setProfileDetailOpen] = useState(false);
  const [detailedProfile, setDetailedProfile] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const [newProfile, setNewProfile] = useState({
    name: "",
    gender: "Male",
    bloodType: "O+",
    dateOfBirth: "",
    mobileNo: "",
    email: "",
    allergies: "",
    chronicConditions: "",
    actualAddress: "",
  });

  useScrollLock(manageOpen || profileDetailOpen);

  const handleOpenDetail = (profile) => {
    setDetailedProfile(profile);
    setProfileDetailOpen(true);
  };

  const handleDownloadSummary = async (profileId) => {
    try {
      setDownloadingId(profileId);
      const blob = await patientsApi.summaryPdf(profileId);
      downloadBlob(blob, `medical-summary-${profileId}.pdf`);
      showSuccess("Medical Summary PDF downloaded successfully.");
    } catch {
      showError("Failed to export patient clinical summary PDF.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleCreateProfile = async (e) => {
    e.preventDefault();

    const validation = validatePatientProfile(newProfile);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      showError(validation.firstError, "Validation Error");
      return;
    }

    setFormErrors({});

    try {
      setLoading(true);
      const payload = validation.sanitized;
      const res = await patientsApi.create(payload);
      setManageOpen(false);
      setNewProfile({
        name: "",
        gender: "Male",
        bloodType: "O+",
        dateOfBirth: "",
        mobileNo: "",
        email: "",
        allergies: "",
        chronicConditions: "",
        actualAddress: "",
      });
      showSuccess("New family patient profile added successfully.");
      const newId = res?.patientId || res?.data?.patientId || res?.data?.id || res?.id;
      await loadDashboard(newId);
    } catch (err) {
      showError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader
        title={t.familyHealthProfiles || "Family Members"}
        actions={
          <button
            onClick={() => setManageOpen(true)}
            className="scms-btn-primary flex items-center gap-2 btn-target shadow-xs"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Add Family Member</span>
          </button>
        }
      />

      {/* Profiles Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {patientProfiles.map((profile) => {
          const isActive = profile.patientId === activeProfile?.patientId;

          return (
            <div
              key={profile.patientId}
              onClick={() => setActiveProfile(profile)}
              className={`rounded-3xl border p-5 transition-all cursor-pointer flex flex-col justify-between gap-4 shadow-scms ${
                isActive
                  ? "bg-orange-50/80 dark:bg-orange-950/40 border-orange-300 dark:border-orange-800 ring-2 ring-orange-500/20"
                  : "bg-card/95 border-border/80 hover:border-border"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-border/70">
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 font-extrabold text-base border border-orange-500/20 shadow-2xs">
                      {profile.name?.[0]?.toUpperCase() || "P"}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-foreground">{profile.name}</h4>
                      <p className="text-[11px] text-muted-foreground capitalize">
                        {profile.gender || "Patient"} • {profile.bloodType || "O+"}
                      </p>
                    </div>
                  </div>
                  {isActive ? (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-orange-600 text-white shadow-2xs">
                      ACTIVE
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-muted-foreground bg-secondary px-2.5 py-0.5 rounded-full">
                      Select
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">Phone:</span>
                    <span>{profile.mobileNo || profile.phone || "No phone registered"}</span>
                  </div>
                  {profile.actualAddress && (
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-semibold text-foreground">Address:</span>
                      <span className="truncate">{profile.actualAddress}</span>
                    </div>
                  )}
                  {profile.allergies ? (
                    <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold truncate">
                      <ExclamationTriangleIcon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Allergy: {profile.allergies}</span>
                    </div>
                  ) : (
                    <div className="italic text-[11px]">No allergies reported</div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-border/70 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadSummary(profile.patientId);
                  }}
                  disabled={downloadingId === profile.patientId}
                  className="scms-btn-outline text-[11px] font-bold py-1 px-3 h-8 min-h-8 flex items-center gap-1.5"
                >
                  <DownloadIcon className="w-3.5 h-3.5" />
                  <span>Summary PDF</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenDetail(profile);
                  }}
                  className="scms-btn-sm"
                >
                  Full Details
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Profile Modal */}
      <ModalPortal isOpen={manageOpen} onClose={() => setManageOpen(false)}>
        <form
          onSubmit={handleCreateProfile}
          className="w-full max-w-lg rounded-3xl border border-border/80 bg-card p-6 shadow-scms-modal space-y-4 max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between pb-3 border-b border-border/70">
            <div>
              <h3 className="text-base font-bold text-foreground">
                {language === "mm" ? "မိသားစုဝင် ဆေးမှတ်တမ်းပရိုဖိုင် အသစ်ထည့်ရန်" : "Add Family Patient Profile"}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Register a family member to manage their clinic bookings and prescriptions.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setManageOpen(false)}
              className="p-1.5 rounded-xl text-muted-foreground hover:bg-secondary"
            >
              <Cross2Icon className="w-4 h-4" />
            </button>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2 text-xs">
            <label className="block sm:col-span-2">
              <span className="mb-1 block font-bold text-foreground">
                Full Name <span className="text-rose-500">*</span>
              </span>
              <input
                required
                value={newProfile.name}
                onChange={(e) => {
                  setNewProfile((p) => ({ ...p, name: e.target.value }));
                  if (formErrors.name) setFormErrors((err) => ({ ...err, name: null }));
                }}
                className={`scms-input w-full text-xs ${formErrors.name ? "border-rose-500 ring-1 ring-rose-500" : ""}`}
                placeholder="e.g. Daw Aye Aye"
              />
              {formErrors.name && (
                <span className="text-[11px] font-semibold text-rose-500 block mt-1">
                  {formErrors.name}
                </span>
              )}
            </label>

            <div>
              <span className="mb-1 block font-bold text-foreground">
                Gender <span className="text-rose-500">*</span>
              </span>
              <Select
                value={newProfile.gender}
                onChange={(val) => setNewProfile((p) => ({ ...p, gender: val }))}
                options={[
                  { value: "Male", label: "Male" },
                  { value: "Female", label: "Female" },
                  { value: "Other", label: "Other" },
                ]}
              />
            </div>

            <div>
              <span className="mb-1 block font-bold text-foreground">
                Blood Type <span className="text-rose-500">*</span>
              </span>
              <Select
                value={newProfile.bloodType}
                onChange={(val) => setNewProfile((p) => ({ ...p, bloodType: val }))}
                options={["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"].map((bt) => ({
                  value: bt,
                  label: bt,
                }))}
              />
            </div>

            <label className="block">
              <span className="mb-1 block font-bold text-foreground">
                Date of Birth <span className="text-rose-500">*</span>
              </span>
              <DateInput
                max={new Date().toISOString().split("T")[0]}
                value={newProfile.dateOfBirth}
                onChange={(e) => {
                  setNewProfile((p) => ({ ...p, dateOfBirth: e.target.value }));
                  if (formErrors.dateOfBirth) setFormErrors((err) => ({ ...err, dateOfBirth: null }));
                }}
                className={formErrors.dateOfBirth ? "border-rose-500 ring-1 ring-rose-500" : ""}
              />
              {formErrors.dateOfBirth && (
                <span className="text-[11px] font-semibold text-rose-500 block mt-1">
                  {formErrors.dateOfBirth}
                </span>
              )}
            </label>

            <label className="block">
              <span className="mb-1 block font-bold text-foreground">
                Primary Mobile Phone <span className="text-rose-500">*</span>
              </span>
              <input
                type="tel"
                required
                value={newProfile.mobileNo}
                onChange={(e) => {
                  setNewProfile((p) => ({ ...p, mobileNo: e.target.value }));
                  if (formErrors.mobileNo) setFormErrors((err) => ({ ...err, mobileNo: null }));
                }}
                className={`scms-input w-full text-xs font-mono ${formErrors.mobileNo ? "border-rose-500 ring-1 ring-rose-500" : ""}`}
                placeholder="09..."
              />
              {formErrors.mobileNo && (
                <span className="text-[11px] font-semibold text-rose-500 block mt-1">
                  {formErrors.mobileNo}
                </span>
              )}
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1 block font-bold text-foreground">Residential Address</span>
              <textarea
                rows={2}
                value={newProfile.actualAddress}
                onChange={(e) => {
                  setNewProfile((p) => ({ ...p, actualAddress: e.target.value }));
                  if (formErrors.actualAddress) setFormErrors((err) => ({ ...err, actualAddress: null }));
                }}
                className={`scms-textarea w-full text-xs ${formErrors.actualAddress ? "border-rose-500 ring-1 ring-rose-500" : ""}`}
                placeholder="Street / Township / City"
              />
              {formErrors.actualAddress && (
                <span className="text-[11px] font-semibold text-rose-500 block mt-1">
                  {formErrors.actualAddress}
                </span>
              )}
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1 block font-bold text-foreground">Known Allergies</span>
              <input
                value={newProfile.allergies}
                onChange={(e) => setNewProfile((p) => ({ ...p, allergies: e.target.value }))}
                className="scms-input w-full text-xs"
                placeholder="e.g. Penicillin, Peanuts"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1 block font-bold text-foreground">Chronic Conditions</span>
              <input
                value={newProfile.chronicConditions}
                onChange={(e) => setNewProfile((p) => ({ ...p, chronicConditions: e.target.value }))}
                className="scms-input w-full text-xs"
                placeholder="e.g. Hypertension, Diabetes"
              />
            </label>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-border/70">
            <button
              type="button"
              onClick={() => setManageOpen(false)}
              className="scms-btn-outline text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="scms-btn-primary text-xs font-bold"
            >
              {loading ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </form>
      </ModalPortal>

      {/* Profile Detail View Modal */}
      <ModalPortal
        isOpen={profileDetailOpen && Boolean(detailedProfile)}
        onClose={() => setProfileDetailOpen(false)}
      >
        {detailedProfile && (
          <div className="w-full max-w-lg rounded-3xl border border-border/80 bg-card p-6 shadow-scms-modal space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/70">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-orange-500 text-white font-bold">
                  {detailedProfile.name?.[0]?.toUpperCase() || "P"}
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">{detailedProfile.name}</h3>
                  <span className="text-xs text-muted-foreground">
                    Blood Type: {detailedProfile.bloodType || "O+"} • {detailedProfile.gender}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProfileDetailOpen(false)}
                className="p-1.5 rounded-xl text-muted-foreground hover:bg-secondary"
              >
                <Cross2Icon className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3.5 bg-secondary/30 rounded-2xl space-y-1">
                <span className="font-semibold text-muted-foreground block">Phone Contact:</span>
                <span className="font-bold text-foreground font-mono">
                  {detailedProfile.mobileNo || detailedProfile.phone || "No phone registered"}
                </span>
              </div>

              {detailedProfile.actualAddress && (
                <div className="p-3.5 bg-secondary/30 rounded-2xl space-y-1">
                  <span className="font-semibold text-muted-foreground block">Residential Address:</span>
                  <span className="text-foreground">{detailedProfile.actualAddress}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl">
                  <span className="font-bold text-rose-700 dark:text-rose-300 block text-[10px] uppercase">
                    Allergies
                  </span>
                  <strong className="text-rose-900 dark:text-rose-200">
                    {detailedProfile.allergies || "None reported"}
                  </strong>
                </div>
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 rounded-2xl">
                  <span className="font-bold text-indigo-700 dark:text-indigo-300 block text-[10px] uppercase">
                    Chronic Conditions
                  </span>
                  <strong className="text-indigo-900 dark:text-indigo-200">
                    {detailedProfile.chronicConditions || "None reported"}
                  </strong>
                </div>
              </div>
            </div>

            <div className="pt-3 flex justify-between gap-2 border-t border-border/70">
              <button
                type="button"
                onClick={() => handleDownloadSummary(detailedProfile.patientId)}
                className="scms-btn-outline text-xs font-bold flex items-center gap-1.5"
              >
                <DownloadIcon className="w-3.5 h-3.5" />
                <span>Medical Summary PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setProfileDetailOpen(false)}
                className="scms-btn-primary text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </ModalPortal>
    </div>
  );
}

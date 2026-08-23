import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import {
  DownloadIcon,
  Pencil1Icon,
  Cross2Icon,
  ActivityLogIcon,
  CalendarIcon,
  FileTextIcon,
  InfoCircledIcon,
  ExclamationTriangleIcon,
  CheckCircledIcon,
} from "@radix-ui/react-icons";
import ModalPortal from "./ModalPortal";
import useScrollLock from "../hooks/useScrollLock";
import { patientsApi, downloadBlob } from "../services/scmsApi";
import { showError, showSuccess } from "../services/dialogs";
import { useLanguage } from "../context/LanguageContext";
import { formatDate, formatDateTime } from "../utils/format";

export default function PatientEhrModal({
  isOpen,
  patient,
  onClose,
  onEdit,
}) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [patientDetails, setPatientDetails] = useState(null);
  const triggerRef = useRef(null);
  const modalContainerRef = useRef(null);

  useScrollLock(isOpen);

  const patientId = patient?.patientId || patient?.id;

  useEffect(() => {
    if (!isOpen || !patientId) return;

    triggerRef.current = document.activeElement;

    let isMounted = true;
    setActiveTab("overview");

    const fetchEhrData = async () => {
      setLoading(true);
      try {
        const [summaryRes, historyRes, detailsRes] = await Promise.allSettled([
          patientsApi.summary(patientId),
          patientsApi.history(patientId),
          patientsApi.get(patientId),
        ]);

        if (isMounted) {
          if (summaryRes.status === "fulfilled") {
            setSummaryData(summaryRes.value?.data || summaryRes.value || null);
          } else {
            setSummaryData(null);
          }

          if (historyRes.status === "fulfilled") {
            setHistoryData(historyRes.value?.data || historyRes.value || null);
          } else {
            setHistoryData(null);
          }

          if (detailsRes.status === "fulfilled") {
            setPatientDetails(detailsRes.value?.data || detailsRes.value || null);
          } else {
            setPatientDetails(null);
          }
        }
      } catch (err) {
        console.error("Failed to load patient EHR details:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchEhrData();

    return () => {
      isMounted = false;
      if (triggerRef.current && typeof triggerRef.current.focus === "function") {
        triggerRef.current.focus();
      }
    };
  }, [isOpen, patientId]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !patient) return null;

  const p = {
    ...patient,
    ...(patientDetails || {}),
    ...(summaryData || {}),
  };

  const handleDownloadPdf = async () => {
    if (!patientId) return;
    try {
      setDownloading(true);
      const blob = await patientsApi.summaryPdf(patientId);
      downloadBlob(blob, `EHR-Summary-${patientId}-${(p.name || "patient").replace(/\s+/g, "_")}.pdf`);
      showSuccess("Electronic Health Record (EHR) PDF exported successfully.");
    } catch (err) {
      console.error("PDF download error:", err);
      showError("Failed to export patient summary PDF.");
    } finally {
      setDownloading(false);
    }
  };

  const tabs = [
    { id: "overview", label: "Clinical Overview & Vitals", icon: ActivityLogIcon },
    { id: "timeline", label: "Visits & Consultations", icon: CalendarIcon },
    { id: "prescriptions", label: "Prescriptions & Meds", icon: FileTextIcon },
    { id: "demographics", label: "Demographics & Info", icon: InfoCircledIcon },
  ];

  const handleTabKeyDown = (e, currentIndex) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % tabs.length;
      setActiveTab(tabs[nextIndex].id);
      document.getElementById(`ehr-tab-${tabs[nextIndex].id}`)?.focus();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      setActiveTab(tabs[prevIndex].id);
      document.getElementById(`ehr-tab-${tabs[prevIndex].id}`)?.focus();
    }
  };

  const vitalsList = summaryData?.vitalsHistory || [];
  const latestVitals = vitalsList.length > 0 ? vitalsList[0] : null;
  const activePrescriptions = summaryData?.activePrescriptions || [];
  const timelineEvents = historyData?.timeline || [];

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div
        ref={modalContainerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ehr-modal-title"
        aria-describedby="ehr-modal-description"
        className="w-full max-w-4xl rounded-3xl border border-border/80 bg-card text-card-foreground p-6 shadow-scms-modal max-h-[92vh] flex flex-col justify-between overflow-hidden animate-fadeIn"
      >
        {/* --- HEADER BANNER: Patient Identity & MRN --- */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border/80 shrink-0">
          <div className="flex items-center gap-3.5">
            <div
              className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-600 dark:bg-indigo-500 text-white font-black text-lg shadow-sm shrink-0"
              aria-hidden="true"
            >
              {(p.name || p.fullName || "P")[0].toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 id="ehr-modal-title" className="text-lg font-black text-foreground">
                  {p.name || p.fullName}
                </h2>
                <span className="font-mono text-xs font-bold text-muted-foreground bg-secondary px-2.5 py-0.5 rounded-lg border border-border/60">
                  MRN: PA-{String(patientId).padStart(4, "0")}
                </span>
                <span className="font-bold text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-0.5 rounded-full border border-rose-200/80 dark:border-rose-900/60">
                  Blood: {p.bloodType || "O+"}
                </span>
              </div>
              <p id="ehr-modal-description" className="text-xs text-muted-foreground mt-0.5">
                {p.gender || "Unspecified"} {p.age ? `• ${p.age} years old` : ""} {p.dateOfBirth ? `(DOB: ${formatDate(p.dateOfBirth)})` : ""} • Contact: {p.phone || p.mobileNo || "None"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="scms-btn-outline flex items-center gap-1.5 text-xs font-bold btn-target"
              title="Download full medical summary PDF"
              aria-label="Download full medical summary PDF"
            >
              {downloading ? (
                <span className="loading loading-spinner loading-xs" aria-hidden="true" />
              ) : (
                <DownloadIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
              )}
              <span className="hidden sm:inline">Export PDF</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onEdit) onEdit(p);
              }}
              className="scms-btn-primary flex items-center gap-1.5 text-xs font-bold btn-target"
              title="Edit patient profile"
              aria-label="Edit patient profile"
            >
              <Pencil1Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Edit</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition btn-target"
              title="Close patient EHR"
              aria-label="Close dialog"
            >
              <Cross2Icon className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </header>

        {/* --- ACCESSIBLE TAB LIST --- */}
        <div className="pt-3 border-b border-border/70 shrink-0">
          <nav
            role="tablist"
            aria-label="Patient Electronic Health Record sections"
            className="flex items-center gap-2 overflow-x-auto no-scrollbar"
          >
            {tabs.map((tab, idx) => {
              const isSelected = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  id={`ehr-tab-${tab.id}`}
                  role="tab"
                  type="button"
                  aria-selected={isSelected}
                  aria-controls={`ehr-panel-${tab.id}`}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => setActiveTab(tab.id)}
                  onKeyDown={(e) => handleTabKeyDown(e, idx)}
                  className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 btn-target whitespace-nowrap ${
                    isSelected
                      ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* --- TAB CONTENT AREA --- */}
        <div className="flex-1 overflow-y-auto py-4 pr-1 space-y-4">
          {loading ? (
            <div
              role="status"
              aria-live="polite"
              className="flex flex-col items-center justify-center py-16 text-center space-y-3"
            >
              <span className="loading loading-spinner loading-md text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
              <p className="text-xs text-muted-foreground font-medium">Retrieving Electronic Health Record data...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: CLINICAL OVERVIEW & VITALS */}
              <div
                id="ehr-panel-overview"
                role="tabpanel"
                aria-labelledby="ehr-tab-overview"
                tabIndex={0}
                hidden={activeTab !== "overview"}
                className="space-y-4 focus-visible:outline-hidden"
              >
                {/* Critical Medical Alerts */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div
                    className={`p-4 rounded-2xl border ${
                      p.allergies
                        ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200"
                        : "bg-card border-border/80 text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <ExclamationTriangleIcon
                        className={`w-4 h-4 shrink-0 ${p.allergies ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"}`}
                        aria-hidden="true"
                      />
                      <h4 className="font-bold text-xs uppercase tracking-wider">Known Allergies</h4>
                    </div>
                    <p className="text-xs font-semibold">
                      {p.allergies || <span className="text-muted-foreground font-normal">No known drug/food allergies recorded.</span>}
                    </p>
                  </div>

                  <div
                    className={`p-4 rounded-2xl border ${
                      p.chronicConditions
                        ? "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200"
                        : "bg-card border-border/80 text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <InfoCircledIcon
                        className={`w-4 h-4 shrink-0 ${p.chronicConditions ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}
                        aria-hidden="true"
                      />
                      <h4 className="font-bold text-xs uppercase tracking-wider">Chronic Conditions</h4>
                    </div>
                    <p className="text-xs font-semibold">
                      {p.chronicConditions || <span className="text-muted-foreground font-normal">No chronic conditions recorded.</span>}
                    </p>
                  </div>
                </div>

                {/* Additional Clinical Background */}
                <div className="grid gap-3 sm:grid-cols-3 bg-secondary/40 p-4 rounded-2xl border border-border/70 text-xs">
                  <div>
                    <span className="text-muted-foreground font-semibold block mb-0.5">Past Surgeries:</span>
                    <span className="font-medium text-foreground">{p.pastSurgeries || "None reported"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold block mb-0.5">Family Medical History:</span>
                    <span className="font-medium text-foreground">{p.familyHistory || "None reported"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold block mb-0.5">Vaccination History:</span>
                    <span className="font-medium text-foreground">{p.vaccinationHistory || "None recorded"}</span>
                  </div>
                </div>

                {/* Latest Vitals Metric Cards */}
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-2.5">
                    Latest Vital Signs {latestVitals && `(as of ${formatDate(latestVitals.date)})`}
                  </h3>

                  {latestVitals ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-center">
                      <div className="p-3 rounded-2xl bg-card border border-border/80 shadow-xs">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">BP (Sys/Dia)</span>
                        <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 font-mono">
                          {latestVitals.bloodPressureSystolic && latestVitals.bloodPressureDiastolic
                            ? `${latestVitals.bloodPressureSystolic}/${latestVitals.bloodPressureDiastolic}`
                            : "-"}
                        </span>
                        <span className="text-[10px] text-muted-foreground block">mmHg</span>
                      </div>

                      <div className="p-3 rounded-2xl bg-card border border-border/80 shadow-xs">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Heart Rate</span>
                        <span className="text-sm font-black text-rose-600 dark:text-rose-400 font-mono">
                          {latestVitals.pulseBpm || "-"}
                        </span>
                        <span className="text-[10px] text-muted-foreground block">bpm</span>
                      </div>

                      <div className="p-3 rounded-2xl bg-card border border-border/80 shadow-xs">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">SpO2 Oxygen</span>
                        <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">
                          {latestVitals.spo2Percent ? `${latestVitals.spo2Percent}%` : "-"}
                        </span>
                        <span className="text-[10px] text-muted-foreground block">Saturation</span>
                      </div>

                      <div className="p-3 rounded-2xl bg-card border border-border/80 shadow-xs">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Temperature</span>
                        <span className="text-sm font-black text-amber-600 dark:text-amber-400 font-mono">
                          {latestVitals.temperatureC ? `${latestVitals.temperatureC}°C` : "-"}
                        </span>
                        <span className="text-[10px] text-muted-foreground block">Celsius</span>
                      </div>

                      <div className="p-3 rounded-2xl bg-card border border-border/80 shadow-xs">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Weight</span>
                        <span className="text-sm font-black text-foreground font-mono">
                          {latestVitals.weightKg ? `${latestVitals.weightKg} kg` : "-"}
                        </span>
                        <span className="text-[10px] text-muted-foreground block">Weight</span>
                      </div>

                      <div className="p-3 rounded-2xl bg-card border border-border/80 shadow-xs">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Height</span>
                        <span className="text-sm font-black text-foreground font-mono">
                          {latestVitals.heightCm ? `${latestVitals.heightCm} cm` : "-"}
                        </span>
                        <span className="text-[10px] text-muted-foreground block">Height</span>
                      </div>

                      <div className="p-3 rounded-2xl bg-card border border-border/80 shadow-xs">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">BMI</span>
                        <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 font-mono">
                          {latestVitals.bmi ? Number(latestVitals.bmi).toFixed(1) : "-"}
                        </span>
                        <span className="text-[10px] text-muted-foreground block">Index</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-center rounded-2xl border border-dashed border-border/80 bg-secondary/20">
                      <p className="text-xs text-muted-foreground">No vital signs recorded for this patient yet.</p>
                    </div>
                  )}
                </div>

                {/* Longitudinal Vitals History Table */}
                {vitalsList.length > 1 && (
                  <div>
                    <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-2">
                      Vitals History Trend
                    </h3>
                    <div className="overflow-x-auto rounded-2xl border border-border/70">
                      <table className="w-full text-left text-xs border-collapse">
                        <caption className="sr-only">Historical recording of patient vital signs</caption>
                        <thead className="bg-secondary/60 text-muted-foreground font-bold border-b border-border/60">
                          <tr>
                            <th scope="col" className="p-2.5">Date / Time</th>
                            <th scope="col" className="p-2.5">BP (mmHg)</th>
                            <th scope="col" className="p-2.5">Pulse</th>
                            <th scope="col" className="p-2.5">SpO2</th>
                            <th scope="col" className="p-2.5">Temp</th>
                            <th scope="col" className="p-2.5">Weight</th>
                            <th scope="col" className="p-2.5">Height</th>
                            <th scope="col" className="p-2.5">BMI</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                          {vitalsList.map((v, i) => (
                            <tr key={i} className="hover:bg-secondary/30">
                              <td className="p-2.5 font-mono text-muted-foreground">
                                {formatDate(v.date)}
                              </td>
                              <td className="p-2.5 font-mono font-bold">
                                {v.bloodPressureSystolic && v.bloodPressureDiastolic
                                  ? `${v.bloodPressureSystolic}/${v.bloodPressureDiastolic}`
                                  : "-"}
                              </td>
                              <td className="p-2.5 font-mono">{v.pulseBpm ? `${v.pulseBpm} bpm` : "-"}</td>
                              <td className="p-2.5 font-mono">{v.spo2Percent ? `${v.spo2Percent}%` : "-"}</td>
                              <td className="p-2.5 font-mono">{v.temperatureC ? `${v.temperatureC}°C` : "-"}</td>
                              <td className="p-2.5 font-mono">{v.weightKg ? `${v.weightKg} kg` : "-"}</td>
                              <td className="p-2.5 font-mono">{v.heightCm ? `${v.heightCm} cm` : "-"}</td>
                              <td className="p-2.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                {v.bmi ? Number(v.bmi).toFixed(1) : "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* TAB 2: MEDICAL TIMELINE & VISITS */}
              <div
                id="ehr-panel-timeline"
                role="tabpanel"
                aria-labelledby="ehr-tab-timeline"
                tabIndex={0}
                hidden={activeTab !== "timeline"}
                className="space-y-4 focus-visible:outline-hidden"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    Chronological Clinical History ({timelineEvents.length} events)
                  </h3>
                </div>

                {timelineEvents.length > 0 ? (
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/80">
                    {timelineEvents.map((event, idx) => (
                      <div key={idx} className="relative">
                        <div
                          className="absolute -left-6 top-1.5 w-3 h-3 rounded-full border-2 border-card bg-indigo-600 dark:bg-indigo-400 ring-2 ring-indigo-100 dark:ring-indigo-950"
                          aria-hidden="true"
                        />
                        <div className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-1">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                              <span className="font-semibold text-indigo-600 dark:text-indigo-400 uppercase text-[10px] bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200/60 dark:border-indigo-900/60">
                                {event.type}
                              </span>
                              {event.title}
                            </span>
                            <span className="text-[11px] font-mono text-muted-foreground">
                              {formatDateTime(event.date)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {event.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-10 text-center rounded-2xl border border-dashed border-border/80 bg-secondary/20 space-y-2">
                    <CalendarIcon className="w-8 h-8 text-muted-foreground/60 mx-auto" aria-hidden="true" />
                    <p className="text-xs text-muted-foreground">No visits, appointments, or consultation records found.</p>
                  </div>
                )}
              </div>

              {/* TAB 3: PRESCRIPTIONS & MEDICATIONS */}
              <div
                id="ehr-panel-prescriptions"
                role="tabpanel"
                aria-labelledby="ehr-tab-prescriptions"
                tabIndex={0}
                hidden={activeTab !== "prescriptions"}
                className="space-y-4 focus-visible:outline-hidden"
              >
                <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                  Active & Prescribed Medications ({activePrescriptions.length})
                </h3>

                {activePrescriptions.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {activePrescriptions.map((rx, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs space-y-2.5 border-l-4 border-l-emerald-500"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <CheckCircledIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                            <h4 className="font-bold text-xs text-foreground">
                              {rx.diseaseName || "Consultation Prescription"}
                            </h4>
                          </div>
                          <span className="font-mono text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                            {formatDate(rx.date)}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">
                            Prescribed Medicines:
                          </span>
                          <ul className="space-y-1 text-xs">
                            {rx.medicines?.map((med, mIdx) => (
                              <li key={mIdx} className="flex items-center gap-1.5 text-foreground">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
                                <span>{med}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-10 text-center rounded-2xl border border-dashed border-border/80 bg-secondary/20 space-y-2">
                    <FileTextIcon className="w-8 h-8 text-muted-foreground/60 mx-auto" aria-hidden="true" />
                    <p className="text-xs text-muted-foreground">No active prescriptions in the past 30 days.</p>
                  </div>
                )}
              </div>

              {/* TAB 4: DEMOGRAPHICS & CONTACTS */}
              <div
                id="ehr-panel-demographics"
                role="tabpanel"
                aria-labelledby="ehr-tab-demographics"
                tabIndex={0}
                hidden={activeTab !== "demographics"}
                className="space-y-4 focus-visible:outline-hidden"
              >
                <div className="grid gap-3 sm:grid-cols-2 bg-secondary/40 p-4 rounded-2xl border border-border/70 text-xs">
                  <div>
                    <span className="text-muted-foreground font-semibold block mb-0.5">Primary Phone Number:</span>
                    <strong className="text-foreground font-mono">{p.phone || p.mobileNo || "Not provided"}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold block mb-0.5">Email Address:</span>
                    <strong className="text-foreground">{p.email || "Not provided"}</strong>
                  </div>
                  <div className="sm:col-span-2 pt-2 border-t border-border/60">
                    <span className="text-muted-foreground font-semibold block mb-0.5">Residential Address:</span>
                    <strong className="text-foreground">{p.actualAddress || p.address || "None recorded"}</strong>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 bg-card p-4 rounded-2xl border border-border/80 text-xs">
                  <div>
                    <span className="text-muted-foreground font-semibold block mb-0.5">Emergency Contact:</span>
                    <strong className="text-foreground">{p.emergencyContact || "None recorded"}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold block mb-0.5">Emergency Contact Phone:</span>
                    <strong className="text-foreground font-mono">{p.emergencyPhone || "None recorded"}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold block mb-0.5">National NRC / ID:</span>
                    <strong className="text-foreground font-mono">{p.nrcOrIdNumber || "None recorded"}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold block mb-0.5">Record Created At:</span>
                    <strong className="text-foreground font-mono">
                      {formatDate(p.createdAt)}
                    </strong>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* --- MODAL FOOTER --- */}
        <footer className="pt-3 border-t border-border/80 flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-muted-foreground hidden sm:block">
            Confidential Electronic Health Record • SCMS Clinical System
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="scms-btn-outline text-xs px-4 btn-target"
            >
              {t.close || "Close"}
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="scms-btn-primary text-xs flex items-center gap-1.5 btn-target"
            >
              {downloading ? (
                <span className="loading loading-spinner loading-xs" aria-hidden="true" />
              ) : (
                <DownloadIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
              )}
              <span>Download PDF Summary</span>
            </button>
          </div>
        </footer>
      </div>
    </ModalPortal>
  );
}

PatientEhrModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  patient: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onEdit: PropTypes.func,
};

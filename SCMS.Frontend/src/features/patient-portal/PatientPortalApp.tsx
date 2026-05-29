import { useCallback, useEffect, useRef, useState } from "react";
import {
  isAuthenticated,
  logoutAPI,
} from "../../services/authService";
import { AuthScreen } from "./components/AuthScreen";
import { Dashboard } from "./components/Dashboard";
import { Toast } from "./components/Toast";
import {
  fetchLabReports,
  fetchNotifications,
  fetchPatientDashboard,
  fetchQueueStatus,
} from "./services/patientPortalApi";
import type {
  AppointmentDetails,
  LabReportItem,
  NotificationItem,
  Prescription,
  QueueStatusData,
  UnpaidInvoice,
} from "./types";
import { pickPrimaryAppointment } from "./utils";
import "./patient-portal.css";

export function PatientPortalApp() {
  const [authed, setAuthed] = useState(isAuthenticated());
  const [userName, setUserName] = useState(
    () => localStorage.getItem("userName") || "User",
  );
  const [loading, setLoading] = useState(authed);
  const [patientId, setPatientId] = useState<number | undefined>();
  const [appointments, setAppointments] = useState<AppointmentDetails[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [invoices, setInvoices] = useState<UnpaidInvoice[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [labPreview, setLabPreview] = useState<LabReportItem[]>([]);
  const [queuePreview, setQueuePreview] = useState<QueueStatusData | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 2800);
  };

  const loadPortalData = useCallback(async () => {
    if (!isAuthenticated()) return;
    setLoading(true);
    try {
      const dashboard = await fetchPatientDashboard();
      const profile = dashboard.patientProfiles[0];
      const pid = profile?.patientId;
      setPatientId(pid);
      setUserName(profile?.name || localStorage.getItem("userName") || "User");

      const appts = dashboard.upcomingAppointments ?? [];
      setAppointments(appts);
      setPrescriptions(dashboard.prescriptionHistory ?? []);
      setInvoices(dashboard.outstandingBalances ?? []);

      const primary = pickPrimaryAppointment(appts);
      if (primary?.id) {
        fetchQueueStatus(primary.id)
          .then(setQueuePreview)
          .catch(() => setQueuePreview(null));
      } else {
        setQueuePreview(null);
      }

      if (pid) {
        fetchLabReports(pid)
          .then((labs) => setLabPreview(labs.slice(0, 3)))
          .catch(() => setLabPreview([]));
      }

      fetchNotifications()
        .then(setNotifications)
        .catch(() => setNotifications([]));
    } catch (err) {
      showToast((err as Error).message || "ဒေတာ ရယူ၍ မရပါ။");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.body.classList.add("patient-portal-active");
    if (authed) {
      loadPortalData();
    }
    return () => {
      document.body.classList.remove("patient-portal-active");
    };
  }, [authed, loadPortalData]);

  const handleLogin = (name: string) => {
    setUserName(name);
    setAuthed(true);
    showToast("မင်္ဂလာပါ!");
  };

  const handleLogout = () => {
    logoutAPI();
    setAuthed(false);
    setAppointments([]);
    setPrescriptions([]);
    setInvoices([]);
    setNotifications([]);
    setLabPreview([]);
    setQueuePreview(null);
  };

  return (
    <div className="patient-portal-root">
      <div className="app-shell">
        {!authed ? (
          <AuthScreen onLogin={handleLogin} />
        ) : loading ? (
          <div className="portal-loading">ဒေတာ ရယူနေပါသည်…</div>
        ) : (
          <Dashboard
            userName={userName}
            patientId={patientId}
            appointments={appointments}
            prescriptions={prescriptions}
            labPreview={labPreview}
            invoices={invoices}
            notifications={notifications}
            queuePreview={queuePreview}
            onLogout={handleLogout}
            onToast={showToast}
            onRefresh={loadPortalData}
          />
        )}
      </div>
      {toast && <Toast message={toast} />}
    </div>
  );
}

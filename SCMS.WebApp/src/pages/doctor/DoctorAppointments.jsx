import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ClockIcon,
  ReloadIcon,
  MagnifyingGlassIcon,
  HeartIcon,
  CheckCircledIcon,
  CrossCircledIcon,
} from "@radix-ui/react-icons";
import PageHeader from "../../components/PageHeader";
import DataTable from "../../components/DataTable";
import DateInput from "../../components/DateInput";
import { Select } from "../../components/ui/select";
import { Input } from "../../components/ui/input";
import { appointmentsApi } from "../../services/scmsApi";
import { showError } from "../../services/dialogs";
import { useLanguage } from "../../context/LanguageContext";
import { formatDateTime } from "../../utils/format";

const toArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.result)) return data.result;
  return [];
};

const getLocalDateStr = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export default function DoctorAppointments() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [selectedDate, setSelectedDate] = useState(getLocalDateStr(new Date()));
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const loadAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        pageSize: 100,
      };
      if (selectedDate) {
        params.startDate = selectedDate;
        params.endDate = `${selectedDate}T23:59:59`;
      }
      const res = await appointmentsApi.list(params);
      setAppointments(toArray(res));
    } catch (err) {
      console.error("Doctor appointments fetch error:", err);
      showError("Unable to retrieve appointment roster. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const filteredAppointments = appointments.filter((appt) => {
    const status = String(appt.status || appt.appointmentStatus || "").toLowerCase();
    if (statusFilter !== "all" && status !== statusFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const pName = (appt.patientName || appt.patient?.name || "").toLowerCase();
      const code = String(appt.appointmentCode || "").toLowerCase();
      const token = String(appt.tokenNumber || "").toLowerCase();
      return pName.includes(q) || code.includes(q) || token.includes(q);
    }
    return true;
  });

  const getStatusBadge = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "completed" || s === "finished") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <CheckCircledIcon className="w-3 h-3" />
          <span>Completed</span>
        </span>
      );
    }
    if (s === "in consultation" || s === "active" || s === "in_progress") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
          <HeartIcon className="w-3 h-3" />
          <span>In Consultation</span>
        </span>
      );
    }
    if (s === "cancelled" || s === "rejected") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
          <CrossCircledIcon className="w-3 h-3" />
          <span>Cancelled</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
        <ClockIcon className="w-3 h-3" />
        <span>Waiting</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader
        title={t.doctorAppointments || "Doctor Schedule & Visits"}
        subtitle="Review upcoming and scheduled patient consultations, filter by date, and conduct clinical visits."
        actions={
          <button
            onClick={loadAppointments}
            className="scms-btn-outline px-3.5 btn-target flex items-center gap-2"
            title={t.refresh || "Refresh"}
            aria-label={t.refresh || "Refresh"}
          >
            <ReloadIcon className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span className="text-xs font-bold hidden sm:inline">{t.refresh || "Refresh"}</span>
          </button>
        }
      />

      {/* Filter and Search Bar */}
      <section className="relative z-10 grid gap-3.5 sm:grid-cols-12 rounded-3xl border border-border/80 bg-card/90 backdrop-blur-md p-4 shadow-scms">
        <div className="sm:col-span-4">
          <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
            Search Patient / Token
          </label>
          <Input
            type="text"
            startIcon={<MagnifyingGlassIcon className="w-4 h-4 shrink-0" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery("")}
            placeholder="Search by patient name or token..."
          />
        </div>

        <div className="sm:col-span-4">
          <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
            Appointment Date
          </label>
          <DateInput
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>

        <div className="sm:col-span-4">
          <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
            Visit Status
          </label>
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "all", label: "All Statuses" },
              { value: "pending", label: "Waiting / Pending" },
              { value: "confirmed", label: "Confirmed" },
              { value: "in consultation", label: "In Consultation" },
              { value: "completed", label: "Completed" },
              { value: "cancelled", label: "Cancelled" },
            ]}
          />
        </div>
      </section>

      {/* Appointment Table */}
      <DataTable
        loading={loading}
        rows={filteredAppointments}
        showIndex
        onRowClick={(row) =>
          navigate(`/doctor/consult/${row.id || row.appointmentId || row.appointmentCode}`)
        }
        columns={[
          {
            label: "Arrival Token",
            key: (r) => (r.tokenNumber ? `Token ${r.tokenNumber}` : `Code ${r.appointmentCode || "Pending"}`),
            cellClassName: "font-mono font-bold text-orange-600 dark:text-orange-400",
          },
          {
            label: "Scheduled Time",
            key: (r) => formatDateTime(r.datetime),
            cellClassName: "text-xs font-semibold text-foreground",
          },
          {
            label: "Patient Name",
            key: (r) => r.patientName || r.patient?.name || "Patient Record",
            cellClassName: "font-bold text-foreground",
          },
          {
            label: "Visit Reason / Complaint",
            key: (r) => r.notes || r.reason || "General Medical Consultation",
            cellClassName: "text-xs text-muted-foreground truncate max-w-xs",
          },
          {
            label: "Status",
            key: (r) => getStatusBadge(r.status || r.appointmentStatus),
          },
        ]}
        actions={(row) => {
          const isFinished = String(row.status || "").toLowerCase() === "completed";
          return (
            <button
              onClick={() =>
                navigate(`/doctor/consult/${row.id || row.appointmentId || row.appointmentCode}`)
              }
              className={isFinished ? "scms-btn-sm" : "scms-btn-sm-primary"}
            >
              {isFinished ? "Review EMR" : "Consult"}
            </button>
          );
        }}
      />
    </div>
  );
}

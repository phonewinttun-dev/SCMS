import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { CalendarDays, Clock, RefreshCcw } from "lucide-react";
import { appointmentsApi } from "../../services/scmsApi";
import { createQueueConnection } from "../../services/realtime";

const statusClass = (status) => {
  const value = String(status || "").toLowerCase();
  if (value === "confirmed") return "border-blue-200 bg-blue-50 text-blue-700";
  if (value === "completed") return "border-green-200 bg-green-50 text-green-700";
  if (value === "cancelled") return "border-red-200 bg-red-50 text-red-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
};

export default function UserAppointments() {
  const { activeProfile, filteredTelemetry, loadDashboard } = useOutletContext();
  const [queueDetails, setQueueDetails] = useState({});
  const [liveMessage, setLiveMessage] = useState("");

  useEffect(() => {
    let disposed = false;
    const connection = createQueueConnection();

    connection.on("QueueUpdated", (appointment) => {
      setLiveMessage(`Queue updated: ${appointment?.patientName || "next patient"} is active.`);
      if (activeProfile?.patientId) {
        loadDashboard(activeProfile.patientId);
      }
    });
    connection.on("AppointmentUpdated", () => {
      if (activeProfile?.patientId) {
        loadDashboard(activeProfile.patientId);
      }
    });

    connection
      .start()
      .then(() => connection.invoke("WatchClinicQueue"))
      .catch(() => {
        if (!disposed) setLiveMessage("Live queue connection is unavailable.");
      });

    return () => {
      disposed = true;
      connection.stop();
    };
  }, [activeProfile?.patientId, loadDashboard]);

  useEffect(() => {
    const loadQueue = async () => {
      const appointments = filteredTelemetry.appointments || [];
      const pairs = await Promise.all(
        appointments.map(async (appointment) => {
          try {
            const res = await appointmentsApi.queueStatus(appointment.id || appointment.appointmentId);
            return [appointment.id || appointment.appointmentId, res?.data || res];
          } catch {
            return [appointment.id || appointment.appointmentId, null];
          }
        }),
      );
      setQueueDetails(Object.fromEntries(pairs));
    };
    loadQueue();
  }, [filteredTelemetry.appointments]);

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Appointments & Queue</h2>
          <p className="text-sm font-semibold text-slate-500">Track visits for {activeProfile?.name || "the active patient"}.</p>
        </div>
        <button className="btn rounded-xl bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => loadDashboard(activeProfile?.patientId)}>
          <RefreshCcw size={16} />
          Refresh
        </button>
      </div>

      {liveMessage && (
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-sm font-bold text-indigo-700">
          {liveMessage}
        </div>
      )}

      {(filteredTelemetry.appointments || []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-bold text-slate-500">
          No upcoming appointments for this profile.
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredTelemetry.appointments.map((appointment) => {
            const id = appointment.id || appointment.appointmentId;
            const queue = queueDetails[id];
            return (
              <article key={id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                      <CalendarDays size={17} />
                      {appointment.appointmentCode || `Appointment #${id}`}
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-500">
                      <Clock size={15} />
                      {formatDateTime(appointment.datetime)}
                    </div>
                    {appointment.notes && <p className="mt-3 text-sm text-slate-600">{appointment.notes}</p>}
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${statusClass(appointment.status)}`}>
                    {appointment.status}
                  </span>
                </div>
                {queue && (
                  <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm md:grid-cols-3">
                    <div><strong>Token:</strong> {queue.patientTokenNumber}</div>
                    <div><strong>Ahead:</strong> {queue.patientsAhead}</div>
                    <div><strong>Wait:</strong> {queue.estimatedWaitTimeMinutes} min</div>
                    <div className="md:col-span-3 text-slate-600">{queue.queueMessage}</div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

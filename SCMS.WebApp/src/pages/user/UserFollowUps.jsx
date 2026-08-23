import { useOutletContext, useNavigate } from "react-router-dom";
import {
  CalendarIcon,
  ClockIcon,
  PlusIcon,
} from "@radix-ui/react-icons";
import PageHeader from "../../components/PageHeader";
import { formatDate } from "../../utils/format";

export default function UserFollowUps() {
  const {
    activeProfile,
    data,
    t,
  } = useOutletContext();
  const navigate = useNavigate();

  const appointments = data?.upcomingAppointments || [];

  // Filter follow-up visits based on reason or notes
  const followUpVisits = appointments.filter(
    (a) =>
      a.patientId === activeProfile?.patientId &&
      (String(a.reason || "").toLowerCase().includes("follow") ||
        String(a.notes || "").toLowerCase().includes("follow"))
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader
        title={t.followUpReminders || "Doctor Follow-Up Checkups"}
        subtitle={`Track scheduled follow-up visits and doctor recommendations for ${
          activeProfile?.name || "your family profile"
        }.`}
        actions={
          <button
            onClick={() => navigate("/user/appointments")}
            className="scms-btn-primary flex items-center gap-2 btn-target shadow-xs"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Book Follow-Up Slot</span>
          </button>
        }
      />

      {followUpVisits.length === 0 ? (
        <div className="rounded-3xl border border-border/80 bg-card p-12 text-center text-xs text-muted-foreground shadow-scms space-y-3">
          <CalendarIcon className="w-12 h-12 mx-auto opacity-40 text-orange-500" />
          <h3 className="font-bold text-base text-foreground">No follow-up checkups pending</h3>
          <p className="max-w-md mx-auto">
            When your doctor schedules a follow-up visit or clinical progress checkup, you can view the reminder and preparation instructions right here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {followUpVisits.map((visit) => (
            <div
              key={visit.id}
              className="rounded-3xl border border-border/80 bg-card/95 p-5 shadow-scms space-y-3"
            >
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-border/70">
                <span className="font-mono text-xs font-bold text-orange-600 dark:text-orange-400">
                  Visit {visit.appointmentCode || visit.id}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  <ClockIcon className="w-3 h-3" />
                  <span>Scheduled Revisit</span>
                </span>
              </div>

              <div className="space-y-1">
                <div className="text-sm font-bold text-foreground">
                  {formatDate(visit.datetime)}
                </div>
                <div className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Clinical Reason:</strong> {visit.reason || "Doctor Follow-Up"}
                </div>
                {visit.notes && (
                  <p className="text-xs text-muted-foreground italic bg-secondary/30 p-2.5 rounded-xl mt-2">
                    &ldquo;{visit.notes}&rdquo;
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import type { AppointmentDetails } from "./types";

export const formatApptDateParts = (iso: string) => {
  const d = new Date(iso);
  return {
    month: d.toLocaleString("en-US", { month: "short" }).toUpperCase(),
    day: String(d.getDate()).padStart(2, "0"),
    time: d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }),
    long: d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "long",
      day: "numeric",
    }),
  };
};

export const statusPillClass = (status: string) => {
  const s = status.toLowerCase();
  if (s.includes("confirm") || s === "scheduled" || s === "paid") {
    return "pill pill-green";
  }
  if (s.includes("pending") || s.includes("wait")) {
    return "pill pill-amber";
  }
  if (s.includes("cancel")) {
    return "pill pill-gray";
  }
  return "pill pill-blue";
};

export const statusLabelMy = (status: string) => {
  const s = status.toLowerCase();
  if (s.includes("confirm") || s === "scheduled") return "အတည်ပြုသည်";
  if (s.includes("pending")) return "ဆိုင်းငံ့ထားသည်";
  if (s.includes("cancel")) return "ပယ်ဖျက်ပြီး";
  if (s.includes("complete")) return "ပြီးမြောက်ပြီး";
  return status;
};

export const totalDue = (amount: number, tax: number, charges: number) =>
  amount + tax + charges;

export const pickPrimaryAppointment = (
  appointments: AppointmentDetails[],
): AppointmentDetails | undefined => {
  const upcoming = appointments
    .filter((a) => new Date(a.datetime) >= new Date())
    .sort(
      (a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime(),
    );
  return upcoming[0] ?? appointments[0];
};

export const formatRelativeTime = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "Yesterday" : `${days} days ago`;
};

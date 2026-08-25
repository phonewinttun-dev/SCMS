import {
  CalendarIcon,
  CardStackIcon,
  PersonIcon,
  PlusIcon,
  Cross2Icon,
  ClockIcon,
  ChevronLeftIcon,
} from "@radix-ui/react-icons";
import { useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import ModalPortal from "../../components/ModalPortal";
import useScrollLock from "../../hooks/useScrollLock";
import { useAuth } from "../../context/AuthContext";
import { showError, showSuccess } from "../../services/dialogs";
import { appointmentsApi } from "../../services/scmsApi";
import { formatDateTime } from "../../utils/format";
import { sanitizeText } from "../../utils/validation";

const TIME_SLOTS = [
  "08:00 AM",
  "09:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "01:00 PM",
  "02:30 PM",
  "04:00 PM",
  "05:30 PM",
];

const CONSULTATION_REASONS = [
  "General Medical Consultation",
  "Routine Health Checkup",
  "Follow-up Revisit",
  "Specialist Review",
  "Health Screening & Check",
];

export default function UserDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    data,
    activeProfile,
    filteredTelemetry,
    loadDashboard,
    language,
    setManageOpen,
  } = useOutletContext();

  const patientProfiles =
    data?.patientProfiles ||
    data?.data?.patientProfiles ||
    (Array.isArray(data) ? data : []);

  const currentProfile = activeProfile || patientProfiles[0] || null;
  const displayName = currentProfile?.name || user?.name || "Patient";
  const displayInitials = (displayName || "PT")
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Booking Modal State (Matching Reference Screen 2)
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(TIME_SLOTS[1]);
  const [visitReason, setVisitReason] = useState(CONSULTATION_REASONS[0]);
  const [bookingNotes, setBookingNotes] = useState("");
  const [submittingBooking, setSubmittingBooking] = useState(false);

  useScrollLock(bookingOpen);

  // Generate 7-day selector dates starting from today
  const bookingDays = useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(now.getDate() + i);
      days.push({
        fullDate: d,
        dayName: d.toLocaleDateString("en-US", { weekday: "short" }),
        dateNumber: d.getDate(),
        monthName: d.toLocaleDateString("en-US", { month: "short" }),
        year: d.getFullYear(),
        isoDate: d.toISOString().split("T")[0],
      });
    }
    return days;
  }, []);

  const openBookingModal = () => {
    setSelectedDateIndex(0);
    setSelectedTimeSlot(TIME_SLOTS[1]);
    setBookingOpen(true);
  };

  // Submit appointment booking
  const handleConfirmBooking = async (e) => {
    if (e) e.preventDefault();
    const targetPatientId = currentProfile?.patientId || activeProfile?.patientId;
    if (!targetPatientId) {
      showError("Please select an active patient profile before booking.", "No Profile Selected");
      return;
    }

    const dayObj = bookingDays[selectedDateIndex];
    if (!dayObj || !selectedTimeSlot) {
      showError("Please select a valid date and time slot.", "Incomplete Selection");
      return;
    }

    // Convert 12h time slot (e.g. '09:30 AM') to 24h ISO string format
    const [timeStr, modifier] = selectedTimeSlot.split(" ");
    let [hours, minutes] = timeStr.split(":");
    let h = parseInt(hours, 10);
    if (modifier === "PM" && h < 12) h += 12;
    if (modifier === "AM" && h === 12) h = 0;
    const formattedHours = String(h).padStart(2, "0");
    const fullDatetime = `${dayObj.isoDate}T${formattedHours}:${minutes}:00`;

    try {
      setSubmittingBooking(true);
      await appointmentsApi.create({
        patientId: Number(targetPatientId),
        datetime: fullDatetime,
        notes: sanitizeText(bookingNotes) || visitReason,
        reason: sanitizeText(visitReason) || "General Consultation",
      });

      setBookingOpen(false);
      setBookingNotes("");
      showSuccess(
        `Appointment confirmed for ${dayObj.dayName}, ${dayObj.dateNumber} ${dayObj.monthName} at ${selectedTimeSlot}.`
      );
      await loadDashboard(targetPatientId);
    } catch (error) {
      showError(error);
    } finally {
      setSubmittingBooking(false);
    }
  };

  // Find next upcoming appointment
  const nextAppt = (filteredTelemetry?.appointments || []).find(
    (a) =>
      String(a.status || "").toLowerCase() !== "completed" &&
      String(a.status || "").toLowerCase() !== "cancelled"
  );

  return (
    <div className="space-y-6 pb-20 animate-fadeIn">
      {/* 1. Header Greeting & Top Search Bar */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-500/10 text-base font-bold text-orange-600 dark:text-orange-400 border border-orange-500/20 shadow-xs">
              {displayInitials}
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">
                {language === "mm" ? "မင်္ဂလာပါ" : "Good day!"}
              </p>
              <h2 className="text-base sm:text-lg font-black text-foreground truncate max-w-[200px] sm:max-w-xs">
                {displayName}
              </h2>
            </div>
          </div>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            {language === "mm"
              ? "ယနေ့ သင့်ကျန်းမာရေးအခြေအနေ မည်သို့ရှိပါသလဲ?"
              : "How are you feeling today?"}
          </h1>
        </div>
      </section>

      {/* 2. Upcoming Appointment Featured Card (Aligned with System's UI Color) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-bold text-foreground">
            {language === "mm" ? "လာမည့် ရက်ချိန်းများ" : "Upcoming Appointments"}
          </h3>
          <button
            onClick={() => navigate("/user/appointments")}
            className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer"
          >
            {language === "mm" ? "အားလုံးကြည့်ရန်" : "View All"}
          </button>
        </div>

        {nextAppt ? (
          <div className="rounded-3xl bg-gradient-to-br from-orange-600 via-orange-500 to-amber-600 p-5 sm:p-6 text-white shadow-xl space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 font-bold text-white backdrop-blur-md border border-white/30 shadow-inner">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">
                    {nextAppt.reason || "General Medical Consultation"}
                  </h4>
                  <p className="text-xs text-white/90 font-medium">
                    {nextAppt.tokenNumber > 0 ? `Arrival Token ${nextAppt.tokenNumber}` : "Scheduled Clinic Visit"}
                  </p>
                </div>
              </div>

              <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold text-white backdrop-blur-md border border-white/30">
                {nextAppt.status || "CONFIRMED"}
              </span>
            </div>

            {/* Date & Time Bar */}
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-black/15 p-3 text-xs backdrop-blur-sm border border-white/10">
              <div className="flex items-center gap-2 text-white/95 truncate">
                <CalendarIcon className="h-4 w-4 shrink-0 text-white/80" />
                <span className="font-semibold truncate">
                  {formatDateTime(nextAppt.datetime)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-white/95 justify-end truncate">
                <ClockIcon className="h-4 w-4 shrink-0 text-white/80" />
                <span className="font-mono font-bold truncate">
                  {nextAppt.appointmentCode || `APT-${nextAppt.id}`}
                </span>
              </div>
            </div>

            {/* Action Buttons matching Reference UI */}
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={openBookingModal}
                className="flex-1 rounded-2xl bg-white py-2.5 px-4 text-center text-xs font-bold text-orange-700 shadow-md hover:bg-orange-50 active:scale-98 transition cursor-pointer"
              >
                {language === "mm" ? "ရက်ချိန်းပြောင်းရန်" : "Re-Schedule"}
              </button>
              <button
                onClick={() => navigate("/user/appointments")}
                className="flex-1 rounded-2xl bg-white/20 py-2.5 px-4 text-center text-xs font-bold text-white shadow-sm hover:bg-white/30 backdrop-blur-md border border-white/25 active:scale-98 transition cursor-pointer"
              >
                {language === "mm" ? "အသေးစိတ်ကြည့်ရန်" : "View Details"}
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-scms text-center space-y-3">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-foreground">
              {language === "mm" ? "လာမည့် ရက်ချိန်း မရှိသေးပါ" : "No Upcoming Appointments"}
            </h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {language === "mm"
                ? "ဆေးခန်းပြသရန် အောက်ပါမှ ရက်ချိန်းရယူနိုင်ပါသည်။"
                : "Book a consultation slot with our clinic anytime."}
            </p>
            <button
              onClick={openBookingModal}
              className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-orange-600 hover:bg-orange-700 active:scale-95 text-white text-xs font-bold px-5 py-2.5 shadow-md transition-all cursor-pointer btn-target"
            >
              <PlusIcon className="w-4 h-4" />
              <span>{language === "mm" ? "ရက်ချိန်းအသစ် ရယူရန်" : "Book New Visit"}</span>
            </button>
          </div>
        )}

        {/* 3. The "Plus" Sign for creating new patient directly under Appointment card */}
        <div className="flex items-center justify-between gap-4 p-4 rounded-3xl border border-dashed border-orange-300 dark:border-orange-900/60 bg-orange-50/50 dark:bg-orange-950/20 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-orange-500/15 text-orange-600 dark:text-orange-400 font-bold">
              <PersonIcon className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-foreground">
                {language === "mm" ? "မိသားစုဝင် ဆေးမှတ်တမ်း အသစ်ထည့်ရန်" : "Add Family Member"}
              </h4>
              <p className="text-[11px] text-muted-foreground">
                {language === "mm"
                  ? "မိသားစုဝင်များအတွက် ရက်ချိန်းရယူရန် ပရိုဖိုင်အသစ် ဖွင့်ပါ"
                  : "Create a linked health profile for family clinic bookings"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setManageOpen(true)}
            className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-600 hover:bg-orange-700 text-white shadow-md transition active:scale-95 btn-target shrink-0 cursor-pointer"
            title={language === "mm" ? "မိသားစုဝင် အသစ်ထည့်ရန်" : "Create New Patient Profile"}
            aria-label="Add Family Member / Create Patient Profile"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* 4. Quick Access Cards (Visits, Billing, Family) */}
      <section className="space-y-3">
        <h3 className="text-sm sm:text-base font-bold text-foreground">
          {language === "mm" ? "အမြန်ဝန်ဆောင်မှုများ" : "Quick Services"}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div
            onClick={() => navigate("/user/appointments")}
            className="rounded-3xl border border-border/80 bg-card p-4 shadow-scms hover:border-orange-500/50 transition-all cursor-pointer group space-y-1"
          >
            <div className="flex items-center justify-between">
              <CalendarIcon className="h-5 w-5 text-orange-500 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-foreground">
                {filteredTelemetry.appointments.length}
              </span>
            </div>
            <h4 className="text-xs font-bold text-foreground pt-1">
              {language === "mm" ? "ရက်ချိန်းများ" : "Appointments"}
            </h4>
            <p className="text-[10px] text-muted-foreground">
              {language === "mm" ? "စစ်ဆေးရန်" : "Track & Manage"}
            </p>
          </div>

          <div
            onClick={() => navigate("/user/billing")}
            className="rounded-3xl border border-border/80 bg-card p-4 shadow-scms hover:border-orange-500/50 transition-all cursor-pointer group space-y-1"
          >
            <div className="flex items-center justify-between">
              <CardStackIcon className="h-5 w-5 text-orange-500 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-foreground">
                {filteredTelemetry.outstanding.length}
              </span>
            </div>
            <h4 className="text-xs font-bold text-foreground pt-1">
              {language === "mm" ? "ငွေပေးချေမှု" : "Payment"}
            </h4>
            <p className="text-[10px] text-muted-foreground">
              {language === "mm" ? "KBZPay / WavePay" : "Mobile Invoices"}
            </p>
          </div>

          <div
            onClick={() => navigate("/user/family")}
            className="rounded-3xl border border-border/80 bg-card p-4 shadow-scms hover:border-orange-500/50 transition-all cursor-pointer group space-y-1 col-span-2 sm:col-span-1"
          >
            <div className="flex items-center justify-between">
              <PersonIcon className="h-5 w-5 text-orange-500 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-foreground">
                {patientProfiles.length}
              </span>
            </div>
            <h4 className="text-xs font-bold text-foreground pt-1">
              {language === "mm" ? "မိသားစုဝင်များ" : "Family Members"}
            </h4>
            <p className="text-[10px] text-muted-foreground">
              {language === "mm" ? "ဆေးမှတ်တမ်းခွဲများ" : "Linked Profiles"}
            </p>
          </div>
        </div>
      </section>

      {/* 5. Modern Appointment Booking Modal (Aligned with Reference UI Screen 2) */}
      <ModalPortal isOpen={bookingOpen} onClose={() => setBookingOpen(false)}>
        {bookingOpen && (
          <div className="w-full max-w-lg rounded-3xl border border-border/80 bg-card p-6 shadow-scms-modal space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border/70">
              <button
                type="button"
                onClick={() => setBookingOpen(false)}
                className="p-1.5 rounded-xl text-muted-foreground hover:bg-secondary cursor-pointer"
                aria-label="Back"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              <h3 className="text-sm font-bold text-foreground">
                {language === "mm" ? "ရက်ချိန်းရယူရန်" : "Book Clinic Consultation"}
              </h3>
              <button
                type="button"
                onClick={() => setBookingOpen(false)}
                className="p-1.5 rounded-xl text-muted-foreground hover:bg-secondary cursor-pointer"
                aria-label="Close"
              >
                <Cross2Icon className="w-4 h-4" />
              </button>
            </div>

            {/* Visit Reason Selector */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-foreground block">
                {language === "mm" ? "ပြသမည့် အကြောင်းအရာ" : "Consultation Reason"}
              </span>
              <div className="grid grid-cols-1 gap-2">
                {CONSULTATION_REASONS.map((reason) => {
                  const isSelected = visitReason === reason;
                  return (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setVisitReason(reason)}
                      className={`py-2.5 px-3.5 text-left rounded-2xl text-xs font-semibold border transition-all cursor-pointer ${
                        isSelected
                          ? "border-orange-600 bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 ring-2 ring-orange-500/20 font-bold"
                          : "border-border/80 bg-card text-foreground hover:bg-secondary"
                      }`}
                    >
                      {reason}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Select Date Horizontal Day Picker (Screen 2) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">
                  {language === "mm" ? "ရက်စွဲ ရွေးချယ်ပါ" : "Select Date"}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">
                  {bookingDays[selectedDateIndex]?.monthName} {bookingDays[selectedDateIndex]?.year}
                </span>
              </div>

              <div className="flex items-center justify-between gap-1.5 overflow-x-auto pb-1">
                {bookingDays.map((day, idx) => {
                  const isSelected = selectedDateIndex === idx;
                  return (
                    <button
                      key={day.isoDate}
                      type="button"
                      onClick={() => setSelectedDateIndex(idx)}
                      className={`flex flex-col items-center justify-center min-w-[50px] flex-1 py-3 px-1 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-orange-600 text-white border-orange-600 shadow-md scale-105"
                          : "bg-card border-border/80 text-muted-foreground hover:border-orange-500/40 hover:text-foreground"
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase">{day.dayName}</span>
                      <span className="text-sm font-black mt-1">{day.dateNumber}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Select Time Slot Grid (Screen 2) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">
                  {language === "mm" ? "အချိန် ရွေးချယ်ပါ" : "Select Time"}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">
                  {TIME_SLOTS.length} Slots Available
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {TIME_SLOTS.map((slot) => {
                  const isSelected = selectedTimeSlot === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedTimeSlot(slot)}
                      className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        isSelected
                          ? "border-orange-600 bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 ring-2 ring-orange-500/20"
                          : "border-border/80 bg-card text-foreground hover:bg-secondary"
                      }`}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Additional Notes */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-foreground">
                <span>{language === "mm" ? "အခြား မှတ်ချက်များ (မဖြစ်မနေ မဟုတ်ပါ)" : "Notes (Optional)"}</span>
                <input
                  type="text"
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  placeholder="e.g. Cough for 3 days, previous medication allergy"
                  className="scms-input w-full mt-1 text-xs"
                />
              </label>
            </div>

            {/* Bottom Action Bar */}
            <div className="pt-3 border-t border-border/70 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setBookingOpen(false)}
                className="scms-btn-outline text-xs px-4 btn-target cursor-pointer"
              >
                {language === "mm" ? "ပယ်ဖျက်မည်" : "Cancel"}
              </button>
              <button
                type="button"
                disabled={submittingBooking}
                onClick={handleConfirmBooking}
                className="scms-btn-primary flex-1 text-xs font-bold shadow-md btn-target cursor-pointer"
              >
                {submittingBooking ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : language === "mm" ? (
                  "ရက်ချိန်း အတည်ပြုမည်"
                ) : (
                  "Book an Appointment"
                )}
              </button>
            </div>
          </div>
        )}
      </ModalPortal>
    </div>
  );
}

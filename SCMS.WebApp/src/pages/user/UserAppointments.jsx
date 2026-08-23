import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  CalendarIcon,
  ClockIcon,
  PlusIcon,
  CheckCircledIcon,
  CrossCircledIcon,
  MagicWandIcon,
  Cross2Icon,
  HeartIcon,
  InfoCircledIcon,
  UploadIcon,
  TrashIcon,
  CheckIcon,
} from "@radix-ui/react-icons";
import PageHeader from "../../components/PageHeader";
import DateInput from "../../components/DateInput";
import { Select } from "../../components/ui/select";
import { appointmentsApi, paymentsApi } from "../../services/scmsApi";
import { showError, showSuccess } from "../../services/dialogs";
import { formatDate, formatDateTime } from "../../utils/format";
import { sanitizeText } from "../../utils/validation";
import useScrollLock from "../../hooks/useScrollLock";
import ModalPortal from "../../components/ModalPortal";

const TIME_SLOTS = [
  "08:00 AM",
  "09:30 AM",
  "10:00 AM",
  "11:30 AM",
  "01:30 PM",
  "02:00 PM",
  "03:30 PM",
  "04:00 PM",
  "05:30 PM",
];

const PAYMENT_METHODS = [
  { value: "kbzpay", label: "KBZPay (09-778-123-456)" },
  { value: "wavepay", label: "WavePay (09-987-654-321)" },
  { value: "cbpay", label: "CBPay (0012-3456-7890)" },
  { value: "ayapay", label: "AYA Pay (09-445-566-778)" },
];

const CONSULTATION_FEE = 15000;

const parseTime12To24 = (time12 = "09:30 AM") => {
  const parts = time12.split(" ");
  const time = parts[0] || "09:30";
  const modifier = parts[1] || "AM";
  let [hours, minutes] = time.split(":");
  if (hours === "12") {
    hours = modifier === "PM" ? "12" : "00";
  } else if (modifier === "PM") {
    hours = String(parseInt(hours, 10) + 12).padStart(2, "0");
  } else {
    hours = hours.padStart(2, "0");
  }
  return `${hours}:${minutes}:00`;
};

export default function UserAppointments() {
  const {
    activeProfile,
    filteredTelemetry,
    loadDashboard,
    t,
  } = useOutletContext();

  const [tab, setTab] = useState("upcoming"); // "upcoming" | "all"
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingStep, setBookingStep] = useState(1); // 1 to 4
  const [bookingForm, setBookingForm] = useState({
    reason: "General Consultation",
    date: "",
    timeSlot: "09:30 AM",
    notes: "",
    paymentMethod: "kbzpay",
    transactionLast6: "",
    screenshotFile: null,
    screenshotPreview: "",
  });
  const [formErrors, setFormErrors] = useState({});
  const [submittingBooking, setSubmittingBooking] = useState(false);

  useScrollLock(bookingOpen);

  const appointmentsList = filteredTelemetry?.appointments || [];

  const upcomingAppts = appointmentsList.filter(
    (a) =>
      String(a.status || "").toLowerCase() !== "completed" &&
      String(a.status || "").toLowerCase() !== "cancelled"
  );

  const displayedAppts = tab === "upcoming" ? upcomingAppts : appointmentsList;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showError("Image size must be less than 5 MB", "File Too Large");
      return;
    }

    if (!file.type.startsWith("image/")) {
      showError("Please upload a valid image file (PNG, JPG, or WebP)", "Invalid File Type");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setBookingForm((prev) => ({
      ...prev,
      screenshotFile: file,
      screenshotPreview: previewUrl,
    }));
    setFormErrors((prev) => ({ ...prev, screenshot: "" }));
  };

  const handleRemoveFile = () => {
    if (bookingForm.screenshotPreview) {
      URL.revokeObjectURL(bookingForm.screenshotPreview);
    }
    setBookingForm((prev) => ({
      ...prev,
      screenshotFile: null,
      screenshotPreview: "",
    }));
  };

  const handleCloseBooking = () => {
    handleRemoveFile();
    setBookingOpen(false);
    setBookingStep(1);
    setBookingForm({
      reason: "General Consultation",
      date: "",
      timeSlot: "09:30 AM",
      notes: "",
      paymentMethod: "kbzpay",
      transactionLast6: "",
      screenshotFile: null,
      screenshotPreview: "",
    });
    setFormErrors({});
  };

  const handleStep2Next = (e) => {
    if (e) e.preventDefault();
    const errors = {};
    if (!bookingForm.date) {
      errors.date = "Please fill out this field";
    }
    if (!bookingForm.timeSlot) {
      errors.timeSlot = "Please fill out this field";
    }
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    setBookingStep(3);
  };

  const handleStep3Next = (e) => {
    if (e) e.preventDefault();
    const errors = {};
    const cleanTxn = String(bookingForm.transactionLast6 || "").replace(/\D/g, "");
    if (!cleanTxn || cleanTxn.length !== 6) {
      errors.transactionLast6 = "Please fill out this field";
    }
    if (!bookingForm.screenshotFile) {
      errors.screenshot = "Please fill out this field";
    }
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    setBookingStep(4);
  };

  const handleBook = async (e) => {
    if (e) e.preventDefault();
    const targetPatientId = activeProfile?.patientId;
    if (!targetPatientId) {
      showError("Please select an active family profile before booking.", "No Profile Selected");
      return;
    }

    if (!bookingForm.date) {
      setFormErrors({ date: "Please fill out this field" });
      setBookingStep(2);
      return;
    }

    const cleanTxn = String(bookingForm.transactionLast6 || "").replace(/\D/g, "");
    if (!cleanTxn || cleanTxn.length !== 6 || !bookingForm.screenshotFile) {
      setBookingStep(3);
      setFormErrors({
        transactionLast6: !cleanTxn || cleanTxn.length !== 6 ? "Please fill out this field" : "",
        screenshot: !bookingForm.screenshotFile ? "Please fill out this field" : "",
      });
      return;
    }

    const isoTime = parseTime12To24(bookingForm.timeSlot || "09:30 AM");
    const isoDateTime = `${bookingForm.date}T${isoTime}`;

    try {
      setSubmittingBooking(true);
      // 1. Create Appointment
      const apptRes = await appointmentsApi.create({
        patientId: Number(targetPatientId),
        datetime: isoDateTime,
        notes: sanitizeText(bookingForm.notes) || null,
        reason: sanitizeText(bookingForm.reason) || "General Consultation",
      });

      const newApptId = apptRes?.appointmentId || apptRes?.id;

      // 2. Submit Manual Payment Proof
      if (newApptId && bookingForm.screenshotFile) {
        const formData = new FormData();
        formData.append("appointmentId", Number(newApptId));
        formData.append("paymentMethod", bookingForm.paymentMethod || "kbzpay");
        formData.append("amount", CONSULTATION_FEE);
        formData.append("transactionLast6", cleanTxn);
        formData.append("screenshot", bookingForm.screenshotFile);

        await paymentsApi.manualProof(formData);
      }

      handleCloseBooking();
      showSuccess("Clinic visit booked & payment proof submitted for review! Your arrival token is registered.");
      await loadDashboard(targetPatientId);
    } catch (error) {
      showError(error);
    } finally {
      setSubmittingBooking(false);
    }
  };

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
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300 border border-orange-200 dark:border-orange-800 animate-pulse">
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
        <span>Waiting in Queue</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader
        title={t.myAppointments || "My Appointments & Clinic Visits"}
        subtitle={`Track live arrival tokens, scheduled consultations, and book visits for ${
          activeProfile?.name || "your family profile"
        }.`}
        actions={
          <button
            onClick={() => setBookingOpen(true)}
            className="scms-btn-primary flex items-center gap-2 btn-target shadow-xs"
          >
            <PlusIcon className="w-4 h-4" />
            <span>{t.bookNewVisit || "Book New Visit"}</span>
          </button>
        }
      />

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border/80 pb-3">
        <button
          onClick={() => setTab("upcoming")}
          className={`rounded-2xl px-5 py-2 text-xs font-bold transition-all ${
            tab === "upcoming"
              ? "bg-orange-500 text-white shadow-xs"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          Upcoming Visits ({upcomingAppts.length})
        </button>
        <button
          onClick={() => setTab("all")}
          className={`rounded-2xl px-5 py-2 text-xs font-bold transition-all ${
            tab === "all"
              ? "bg-orange-500 text-white shadow-xs"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          All Appointments ({appointmentsList.length})
        </button>
      </div>

      {/* Appointments Grid */}
      {displayedAppts.length === 0 ? (
        <div className="rounded-3xl border border-border/80 bg-card p-12 text-center text-xs text-muted-foreground shadow-scms space-y-3">
          <CalendarIcon className="w-12 h-12 mx-auto opacity-40 text-orange-500" />
          <h3 className="font-bold text-base text-foreground">No appointments scheduled</h3>
          <p className="max-w-md mx-auto">
            You don&apos;t have any active appointments for this profile. Book a slot with our consulting physician anytime.
          </p>
          <div className="pt-2">
            <button
              onClick={() => setBookingOpen(true)}
              className="scms-btn-primary text-xs font-bold"
            >
              Book Appointment Now
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayedAppts.map((appt) => (
            <div
              key={appt.id}
              className="rounded-3xl border border-border/80 bg-card/95 p-5 shadow-scms flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-border/70">
                  <span className="font-mono text-xs font-bold text-orange-600 dark:text-orange-400">
                    {appt.appointmentCode || `APT-${appt.id}`}
                  </span>
                  {getStatusBadge(appt.status)}
                </div>

                <div className="mt-3 space-y-2">
                  <div className="text-sm font-bold text-foreground">
                    {formatDateTime(appt.datetime)}
                  </div>

                  {appt.tokenNumber > 0 && (
                    <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-900/60 p-2.5 rounded-2xl">
                      <div className="grid h-8 w-8 place-items-center rounded-xl bg-orange-500 text-white font-bold text-xs">
                        {appt.tokenNumber}
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-orange-700 dark:text-orange-300">
                          Arrival Token
                        </div>
                        <div className="text-xs font-semibold text-foreground">
                          Queue Position {appt.tokenNumber}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground">
                    <strong className="text-foreground">Reason:</strong> {appt.reason || "General Consultation"}
                  </div>

                  {appt.notes && (
                    <p className="text-xs text-muted-foreground italic bg-secondary/40 p-2.5 rounded-xl border border-border/60">
                      &ldquo;{appt.notes}&rdquo;
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Booking Wizard Modal */}
      <ModalPortal
        isOpen={bookingOpen}
        onClose={() => {
          setBookingOpen(false);
          setBookingStep(1);
        }}
      >
        {bookingOpen && (
          <div className="w-full max-w-md rounded-3xl border border-border/80 bg-card p-6 shadow-scms-modal space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/70">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <MagicWandIcon className="w-4 h-4 text-orange-500" />
                <span>Book Clinic Visit</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setBookingOpen(false);
                  setBookingStep(1);
                }}
                className="p-1 rounded-xl text-muted-foreground hover:bg-secondary"
              >
                <Cross2Icon className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Step indicator */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Step {bookingStep} of 4: {
                    bookingStep === 1
                      ? "Visit Reason"
                      : bookingStep === 2
                      ? "Date & Time"
                      : bookingStep === 3
                      ? "Payment Proof"
                      : "Final Review"
                  }
                </span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4].map((step) => (
                    <span
                      key={step}
                      className={`h-1.5 rounded-full transition-all ${
                        bookingStep === step
                          ? "w-6 bg-orange-600 dark:bg-orange-500"
                          : bookingStep > step
                          ? "w-2 bg-orange-300 dark:bg-orange-800"
                          : "w-2 bg-secondary"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* STEP 1: Choose Visit Reason */}
              {bookingStep === 1 && (
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="font-bold text-foreground block mb-1.5">
                      Choose Visit Reason
                    </span>
                    <Select
                      value={bookingForm.reason}
                      onChange={(val) => setBookingForm((p) => ({ ...p, reason: val }))}
                      options={[
                        { value: "General Consultation", label: "General Medical Examination" },
                        { value: "Follow-up Revisit", label: "Follow-up Revisit" },
                        { value: "Prescription Refill", label: "Prescription Refill" },
                        { value: "Specialist Consultation", label: "Specialist Consultation" },
                        { value: "Health Screening", label: "Health Screening & Checkup" },
                      ]}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-3">
                    <button
                      type="button"
                      onClick={() => setBookingStep(2)}
                      className="scms-btn-primary text-xs font-bold"
                    >
                      Next Step
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Preferred Date & Time */}
              {bookingStep === 2 && (
                <form
                  noValidate
                  className="space-y-4 text-xs"
                  onSubmit={handleStep2Next}
                >
                  {/* Select Clinic Date */}
                  <div className="space-y-1.5">
                    <label className="block">
                      <span className="mb-1.5 block font-bold text-foreground">
                        Preferred Date (dd-MM-yyyy) <span className="text-orange-600 dark:text-orange-400">*</span>
                      </span>
                      <DateInput
                        value={bookingForm.date}
                        onChange={(e) => {
                          const val = e?.target?.value !== undefined ? e.target.value : typeof e === "string" ? e : "";
                          setBookingForm((p) => ({ ...p, date: val }));
                          setFormErrors((p) => ({ ...p, date: "" }));
                        }}
                        min={new Date().toISOString().split("T")[0]}
                        hasError={Boolean(formErrors.date)}
                        placeholder="Select Consultation Date"
                      />
                    </label>
                    {formErrors.date && (
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900/50 animate-fadeIn">
                        <InfoCircledIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>{formErrors.date}</span>
                      </div>
                    )}
                  </div>

                  {/* Select Consultation Time Slot (12-Hour AM/PM Format) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="block font-bold text-foreground">
                        Consultation Time (12-Hour AM/PM) <span className="text-orange-600 dark:text-orange-400">*</span>
                      </span>
                      <span className="text-[11px] font-semibold text-muted-foreground">
                        {TIME_SLOTS.length} Slots
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {TIME_SLOTS.map((slot) => {
                        const isSelected = bookingForm.timeSlot === slot;
                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => {
                              setBookingForm((p) => ({ ...p, timeSlot: slot }));
                              setFormErrors((p) => ({ ...p, timeSlot: "" }));
                            }}
                            className={`py-2 px-1 text-center rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                              isSelected
                                ? "border-orange-600 bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 ring-2 ring-orange-500/20 shadow-xs scale-102"
                                : "border-border/80 bg-card text-foreground hover:bg-secondary hover:border-orange-500/30"
                            }`}
                          >
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                    {formErrors.timeSlot && (
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900/50 animate-fadeIn">
                        <InfoCircledIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>{formErrors.timeSlot}</span>
                      </div>
                    )}
                  </div>

                  {/* Symptoms / Notes */}
                  <label className="block">
                    <span className="mb-1.5 block font-bold text-foreground">
                      Symptoms & Chief Complaints (Optional)
                    </span>
                    <textarea
                      className="scms-textarea w-full text-xs"
                      rows={2}
                      value={bookingForm.notes}
                      onChange={(e) => setBookingForm((p) => ({ ...p, notes: e.target.value }))}
                      placeholder="Describe symptoms or reasons for visit..."
                    />
                  </label>

                  <div className="flex justify-between gap-2 pt-3">
                    <button
                      type="button"
                      onClick={() => setBookingStep(1)}
                      className="scms-btn-outline text-xs"
                    >
                      Back
                    </button>
                    <button type="submit" className="scms-btn-primary text-xs font-bold">
                      Next Step
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 3: Payment Screenshot & Transaction Reference */}
              {bookingStep === 3 && (
                <form
                  noValidate
                  className="space-y-3.5 text-xs"
                  onSubmit={handleStep3Next}
                >
                  {/* Fee Banner */}
                  <div className="rounded-2xl bg-orange-50 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-900/60 p-3.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-orange-800 dark:text-orange-300 uppercase tracking-wider text-[10px]">
                        Consultation Booking Fee
                      </span>
                      <span className="text-base font-bold font-mono text-orange-700 dark:text-orange-300">
                        {CONSULTATION_FEE.toLocaleString()} MMK
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Transfer to any clinic mobile wallet account below and attach the payment slip.
                    </p>
                  </div>

                  {/* Select Gateway */}
                  <div className="space-y-1.5">
                    <span className="block font-bold text-foreground">
                      Select Mobile Wallet Gateway <span className="text-orange-600 dark:text-orange-400">*</span>
                    </span>
                    <Select
                      value={bookingForm.paymentMethod}
                      onChange={(val) => setBookingForm((p) => ({ ...p, paymentMethod: val }))}
                      options={PAYMENT_METHODS}
                    />
                  </div>

                  {/* Last 6 Digits */}
                  <div className="space-y-1.5">
                    <span className="block font-bold text-foreground">
                      Last 6 Digits of Transaction Number <span className="text-orange-600 dark:text-orange-400">*</span>
                    </span>
                    <div className="relative">
                      <input
                        type="text"
                        maxLength={6}
                        pattern="\d{6}"
                        placeholder="e.g. 661073"
                        className={`scms-input w-full text-xs font-mono tracking-widest font-bold uppercase ${
                          formErrors.transactionLast6 ? "border-rose-500 ring-1 ring-rose-500/20" : ""
                        }`}
                        value={bookingForm.transactionLast6}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                          setBookingForm((p) => ({ ...p, transactionLast6: val }));
                          setFormErrors((p) => ({ ...p, transactionLast6: "" }));
                        }}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-muted-foreground font-semibold">
                        {bookingForm.transactionLast6.length}/6
                      </span>
                    </div>
                    {formErrors.transactionLast6 && (
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900/50 animate-fadeIn">
                        <InfoCircledIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>{formErrors.transactionLast6}</span>
                      </div>
                    )}
                  </div>

                  {/* Photo Upload Attachment */}
                  <div className="space-y-1.5">
                    <span className="block font-bold text-foreground">
                      Upload Payment Transfer Screenshot <span className="text-orange-600 dark:text-orange-400">*</span>
                    </span>

                    {bookingForm.screenshotPreview ? (
                      <div className="rounded-2xl border border-border/80 bg-secondary/30 p-2.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={bookingForm.screenshotPreview}
                            alt="Transfer Screenshot Preview"
                            className="h-16 w-16 object-cover rounded-xl border border-border shadow-2xs shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-foreground truncate">
                              {bookingForm.screenshotFile?.name || "Payment Receipt Screenshot"}
                            </p>
                            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                              {bookingForm.screenshotFile?.size
                                ? `${(bookingForm.screenshotFile.size / 1024).toFixed(1)} KB`
                                : "Image attached"}
                            </p>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                              <CheckIcon className="w-3 h-3" /> Ready to Submit
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <label className="scms-btn-outline p-1.5 text-xs cursor-pointer" title="Replace image">
                              <UploadIcon className="w-3.5 h-3.5" />
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp,image/jpg"
                                onChange={handleFileChange}
                                className="hidden"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={handleRemoveFile}
                              className="scms-btn-icon-danger p-1.5 text-xs"
                              title="Remove image"
                            >
                              <TrashIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <label className={`flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-2xl cursor-pointer bg-secondary/20 hover:bg-secondary/40 transition-colors group ${
                        formErrors.screenshot ? "border-rose-500" : "border-border/80 hover:border-orange-500/70"
                      }`}>
                        <div className="h-9 w-9 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 grid place-items-center mb-1.5 group-hover:scale-105 transition-transform">
                          <UploadIcon className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-foreground text-xs">
                          Choose Receipt Screenshot or Drag & Drop
                        </span>
                        <span className="text-[10px] text-muted-foreground mt-0.5">
                          PNG, JPG, or WebP (Max 5 MB)
                        </span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/jpg"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    )}

                    {formErrors.screenshot && (
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900/50 animate-fadeIn">
                        <InfoCircledIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>{formErrors.screenshot}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between gap-2 pt-3">
                    <button
                      type="button"
                      onClick={() => setBookingStep(2)}
                      className="scms-btn-outline text-xs"
                    >
                      Back
                    </button>
                    <button type="submit" className="scms-btn-primary text-xs font-bold">
                      Next Step
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 4: Final Confirmation & Review */}
              {bookingStep === 4 && (
                <form noValidate onSubmit={handleBook} className="space-y-3.5 text-xs">
                  <span className="font-bold text-foreground block">
                    Review & Confirm Appointment
                  </span>

                  <div className="rounded-2xl border border-border/80 bg-secondary/30 p-3.5 space-y-2.5 text-xs">
                    <div className="flex justify-between pb-2 border-b border-border/60">
                      <span className="text-muted-foreground font-medium">Patient:</span>
                      <span className="font-bold text-foreground">{activeProfile?.name || "Active Patient"}</span>
                    </div>

                    <div className="flex justify-between pb-2 border-b border-border/60">
                      <span className="text-muted-foreground font-medium">Reason:</span>
                      <span className="font-semibold text-foreground">{bookingForm.reason}</span>
                    </div>

                    <div className="flex justify-between pb-2 border-b border-border/60">
                      <span className="text-muted-foreground font-medium">Scheduled Date:</span>
                      <span className="font-mono font-bold text-orange-600 dark:text-orange-400">
                        {bookingForm.date ? formatDate(bookingForm.date) : "-"}
                      </span>
                    </div>

                    <div className="flex justify-between pb-2 border-b border-border/60">
                      <span className="text-muted-foreground font-medium">Scheduled Time:</span>
                      <span className="font-mono font-bold text-orange-600 dark:text-orange-400">
                        {bookingForm.timeSlot || "-"}
                      </span>
                    </div>

                    <div className="flex justify-between pb-2 border-b border-border/60">
                      <span className="text-muted-foreground font-medium">Payment Gateway:</span>
                      <span className="font-semibold text-foreground uppercase">{bookingForm.paymentMethod}</span>
                    </div>

                    <div className="flex justify-between pb-2 border-b border-border/60">
                      <span className="text-muted-foreground font-medium">Txn Reference (Last 6):</span>
                      <span className="font-mono font-bold tracking-widest text-foreground">
                        {bookingForm.transactionLast6}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pb-1">
                      <span className="text-muted-foreground font-medium">Payment Proof Slip:</span>
                      {bookingForm.screenshotPreview ? (
                        <div className="flex items-center gap-2">
                          <img
                            src={bookingForm.screenshotPreview}
                            alt="Receipt Thumbnail"
                            className="h-7 w-7 object-cover rounded-lg border border-border"
                          />
                          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            Attached
                          </span>
                        </div>
                      ) : (
                        <span className="text-rose-500 font-semibold">Not attached</span>
                      )}
                    </div>

                    {bookingForm.notes && (
                      <div className="pt-2 border-t border-border/60">
                        <span className="text-muted-foreground font-medium block mb-0.5">Notes:</span>
                        <p className="text-xs text-foreground italic bg-card p-2 rounded-xl border border-border/50">
                          {bookingForm.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setBookingStep(3)}
                      className="scms-btn-outline text-xs"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={submittingBooking}
                      className="scms-btn-primary text-xs font-bold"
                    >
                      {submittingBooking ? "Booking..." : "Confirm & Book"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </ModalPortal>
    </div>
  );
}

import {
    AlertCircle,
    Calendar,
    CheckCircle2,
    Clock,
    CreditCard,
    Download,
    Droplet,
    FileText,
    Heart,
    MapPin,
    Plus,
    Sparkles,
    User
} from "lucide-react";
import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { showAlert, showError } from "../../services/dialogs";
import { appointmentsApi, downloadBlob, paymentsApi, prescriptionsApi } from "../../services/scmsApi";
import { formatTemperatureF } from "../../utils/clinical";

export default function UserDashboard() {
  const {
    data,
    activeProfile,
    filteredTelemetry,
    loadDashboard,
    language,
    t,
    setManageOpen,
  } = useOutletContext();

  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingStep, setBookingStep] = useState(1);
  const [bookingForm, setBookingForm] = useState({ reason: "general", datetime: "", notes: "" });
  const [submittingBooking, setSubmittingBooking] = useState(false);

  const [payingInvoice, setPayingInvoice] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ paymentMethod: "kbzpay", screenshotUrl: "" });
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const downloadPrescription = async (prescriptionId) => {
    try {
      const response = await prescriptionsApi.pdf(prescriptionId);
      downloadBlob(response, `prescription-${prescriptionId}.pdf`);
      await showAlert(t.saved || "Prescription downloaded successfully.");
    } catch {
      await showError("Failed to download prescription PDF.");
    }
  };

  const downloadInvoice = async (paymentId) => {
    try {
      const response = await paymentsApi.invoicePdf(paymentId);
      downloadBlob(response, `invoice-${paymentId}.pdf`);
      await showAlert(t.saved || "Invoice downloaded successfully.");
    } catch {
      await showError("Failed to download invoice PDF.");
    }
  };

  const handleBook = async (e) => {
    e.preventDefault();
    if (!activeProfile?.patientId || !bookingForm.datetime) return;

    try {
      setSubmittingBooking(true);
      await appointmentsApi.create({
        patientId: Number(activeProfile.patientId),
        datetime: `${bookingForm.datetime}:00`,
        notes: bookingForm.notes,
        reason: bookingForm.reason,
      });

      setBookingOpen(false);
      setBookingStep(1);
      setBookingForm({ reason: "general", datetime: "", notes: "" });
      await showAlert("Appointment booked successfully!");
      await loadDashboard(activeProfile.patientId);
    } catch (error) {
      await showError(error?.response?.data?.message || error?.message || "Failed to book appointment.");
    } finally {
      setSubmittingBooking(false);
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!payingInvoice || !paymentForm.screenshotUrl) return;

    try {
      setSubmittingPayment(true);
      await paymentsApi.manualProof({
        appointmentId: Number(payingInvoice.appointmentId),
        paymentMethod: paymentForm.paymentMethod,
        amount: Number(payingInvoice.amount),
        screenshotUrl: paymentForm.screenshotUrl,
      });

      setPayingInvoice(null);
      setPaymentForm({ paymentMethod: "kbzpay", screenshotUrl: "" });
      await showAlert("Payment proof submitted successfully! Review pending by staff.");
      await loadDashboard(activeProfile.patientId);
    } catch (error) {
      await showError(error?.response?.data?.message || error?.message || "Failed to submit payment proof.");
    } finally {
      setSubmittingPayment(false);
    }
  };

  const getStatusClass = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "completed" || s === "paid" || s === "success") {
      return "bg-[#ECFDF3] text-[#027A48] border-[#A9EFC5]";
    }
    if (s === "approved" || s === "confirmed" || s === "active") {
      return "bg-[#EBF2FF] text-[#0052CC] border-[#B2CCFF]";
    }
    if (s === "cancelled" || s === "failed" || s === "rejected") {
      return "bg-[#FFF1F0] text-[#D92D20] border-[#FECDCA]";
    }
    if (s === "pending" || s === "requested") {
      return "bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]";
    }
    return "bg-[#F2F4F7] text-[#667085] border-[#E4E7EC]";
  };

  const money = (value) => `${Number(value || 0).toLocaleString()} MMK`;
  const formatDate = (val) => {
    if (!val) return "";
    const date = new Date(val);
    if (isNaN(date.getTime())) return String(val);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  if (!activeProfile) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
        <AlertCircle size={48} className="text-slate-400 mb-4 animate-bounce" />
        <h3 className="text-lg font-black text-slate-800">No Patient Profiles Associated</h3>
        <p className="mt-2 text-sm text-slate-500 max-w-sm">
          Please contact clinic staff to link your registered patient records with this account.
        </p>
        <div className="mt-6 w-full max-w-xs">
          <button onClick={() => setManageOpen(true)} className="btn bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11 w-full font-black">Create Patient Profile</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 animate-fadeIn">
      {/* Patient Card Banner */}
      <section className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4 md:gap-6">
          <div className="grid h-16 w-16 md:h-20 md:w-20 place-items-center rounded-2xl bg-white/10 text-2xl font-black text-white backdrop-blur-sm border border-white/20">
            {activeProfile.name?.slice(0, 2)?.toUpperCase() || "PT"}
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl md:text-3xl font-black tracking-tight">{activeProfile.name}</h2>
              {activeProfile.bloodType && (
                <span className="flex items-center gap-1 bg-rose-500/20 text-rose-200 text-xs font-black px-2.5 py-1 rounded-full border border-rose-500/30">
                  <Droplet size={12} className="fill-current" />
                  {activeProfile.bloodType}
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-white/80 font-medium flex flex-wrap gap-x-4 gap-y-1">
              <span className="flex items-center gap-1.5"><User size={14} /> {activeProfile.gender || "Not Specified"}</span>
              {activeProfile.mobileNo && <span className="flex items-center gap-1.5"><Heart size={14} /> {activeProfile.mobileNo}</span>}
              {activeProfile.actualAddress && <span className="flex items-center gap-1.5"><MapPin size={14} /> {activeProfile.actualAddress}</span>}
            </p>
          </div>
        </div>

        <button
          onClick={() => setBookingOpen(true)}
          className="bg-white text-indigo-700 hover:bg-indigo-50 font-black text-sm px-6 py-3 rounded-2xl shadow-lg transition duration-200 flex items-center gap-2 shrink-0 self-start md:self-center"
        >
          <Plus size={16} />
          {language === "mm" ? "ချိန်းဆိုမှု အသစ်ပြုလုပ်ရန်" : "Book Appointment"}
        </button>
      </section>

      {/* Quick Action Panels */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col items-start">
          <div className="text-xs font-black text-slate-400 uppercase">Quick Actions</div>
          <div className="mt-3 text-lg font-black text-slate-800">{filteredTelemetry.appointments.length} Appointments</div>
          <div className="mt-6 w-full flex gap-2">
            <button onClick={() => { setBookingOpen(true); setBookingStep(1); }} className="btn bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-3 py-2 font-black">Book</button>
            <button onClick={() => window.scrollTo({ top: 800, behavior: 'smooth' })} className="btn btn-ghost border border-slate-200 rounded-xl px-3 py-2">Records</button>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col items-start">
          <div className="text-xs font-black text-slate-400 uppercase">Profiles</div>
          <div className="mt-3 text-lg font-black text-slate-800">{data?.patientProfiles?.length || 0} Linked</div>
          <div className="mt-6 w-full">
            <button onClick={() => setManageOpen(true)} className="btn btn-ghost border border-slate-200 rounded-xl px-3 py-2 w-full">Manage</button>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col items-start">
          <div className="text-xs font-black text-slate-400 uppercase">Outstanding</div>
          <div className="mt-3 text-lg font-black text-slate-800">{filteredTelemetry.outstanding.length} Due</div>
          <div className="mt-6 w-full">
            <button onClick={() => window.scrollTo({ top: 400, behavior: 'smooth' })} className="btn btn-ghost border border-slate-200 rounded-xl px-3 py-2 w-full">Pay</button>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col items-start">
          <div className="text-xs font-black text-slate-400 uppercase">Prescriptions</div>
          <div className="mt-3 text-lg font-black text-slate-800">{filteredTelemetry.prescriptions.length}</div>
          <div className="mt-6 w-full">
            <button onClick={() => window.scrollTo({ top: 1200, behavior: 'smooth' })} className="btn btn-ghost border border-slate-200 rounded-xl px-3 py-2 w-full">View</button>
          </div>
        </div>
      </div>

      {/* Grid: Upcoming Appointments & Unpaid Balances */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Appointments Column */}
        <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col min-h-[300px]">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <h3 className="text-md font-black text-slate-800 flex items-center gap-2">
              <Calendar size={18} className="text-indigo-600" />
              {language === "mm" ? "ချိန်းဆိုမှုများ" : "Upcoming Visits"}
            </h3>
            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-mono">
              {filteredTelemetry.appointments.length} ACTIVE
            </span>
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto max-h-[350px] pr-1">
            {filteredTelemetry.appointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 py-8">
                <Clock size={36} className="mb-2 opacity-50" />
                <p className="text-xs font-semibold">No upcoming appointments scheduled.</p>
              </div>
            ) : (
              filteredTelemetry.appointments.map((appt) => (
                <div key={appt.id} className="border border-slate-100 rounded-2xl p-4 hover:border-slate-200 hover:bg-slate-50/50 transition">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-black text-indigo-600 font-mono">#{appt.appointmentCode}</span>
                    <span className={`text-[10px] font-black border px-2 py-0.5 rounded-full ${getStatusClass(appt.status)}`}>
                      {String(appt.status).toUpperCase()}
                    </span>
                  </div>
                  <div className="mt-3 font-extrabold text-slate-800 text-sm">{formatDate(appt.datetime)}</div>
                  {appt.tokenNumber > 0 && (
                    <div className="mt-2 text-xs font-semibold text-slate-500">
                      Queue Token: <strong className="text-indigo-600 font-mono">#{appt.tokenNumber}</strong>
                    </div>
                  )}
                  {appt.notes && (
                    <p className="mt-2 text-xs text-slate-500 font-medium italic border-l-2 border-indigo-200 pl-2 leading-relaxed">
                      &quot;{appt.notes}&quot;
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* Unpaid Outstanding Invoices Column */}
        <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col min-h-[300px]">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <h3 className="text-md font-black text-slate-800 flex items-center gap-2">
              <CreditCard size={18} className="text-indigo-600" />
              {language === "mm" ? "မပေးဆောင်ရသေးသော ငွေတောင်းခံလွှာများ" : "Outstanding Invoices"}
            </h3>
            <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-full font-mono">
              {filteredTelemetry.outstanding.length} UNPAID
            </span>
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto max-h-[350px] pr-1">
            {filteredTelemetry.outstanding.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 py-8">
                <CheckCircle2 size={36} className="mb-2 text-emerald-500 opacity-60" />
                <p className="text-xs font-semibold text-slate-500">All balances are clear! Thank you.</p>
              </div>
            ) : (
              filteredTelemetry.outstanding.map((invoice) => (
                <div key={invoice.id} className="border border-slate-100 rounded-2xl p-4 hover:border-slate-200 hover:bg-slate-50/50 transition">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-black text-slate-500 font-mono">Visit #{invoice.appointmentCode}</span>
                    <span className={`text-[10px] font-black border px-2 py-0.5 rounded-full ${getStatusClass(invoice.paymentStatus)}`}>
                      {String(invoice.paymentStatus || "unpaid").toUpperCase()}
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between gap-3">
                    <div>
                      <div className="text-xl font-black text-slate-800">{money(invoice.amount)}</div>
                      {invoice.tax > 0 && <div className="text-[10px] text-slate-400 font-bold">Includes Tax & Charges</div>}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => downloadInvoice(invoice.id)}
                        className="btn btn-sm btn-ghost border border-slate-200 hover:bg-slate-100 rounded-xl"
                        title="Download Invoice PDF"
                      >
                        <Download size={14} />
                      </button>
                      <button
                        onClick={() => setPayingInvoice(invoice)}
                        className="btn btn-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold"
                      >
                        {language === "mm" ? "ပေးချေရန်" : "Pay Now"}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Prescription Records Timeline (100% width) */}
      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <h3 className="text-md font-black text-slate-800 flex items-center gap-2">
            <FileText size={18} className="text-indigo-600" />
            {language === "mm" ? "ဆေးညွှန်းမှတ်တမ်းများ" : "Prescription & EMR History"}
          </h3>
          <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-mono">
            {filteredTelemetry.prescriptions.length} RECORDS
          </span>
        </div>

        {filteredTelemetry.prescriptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
            <FileText size={48} className="mb-2 opacity-40" />
            <p className="text-xs font-semibold">No medical prescriptions or EMR details found.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {filteredTelemetry.prescriptions.map((rx) => (
              <div key={rx.id} className="border border-slate-200 rounded-3xl p-5 hover:border-slate-300 transition bg-slate-50/20 relative overflow-hidden flex flex-col justify-between min-h-[220px]">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-slate-400 font-mono">Visit #{rx.appointmentCode}</div>
                      <div className="mt-1 font-extrabold text-slate-800 text-sm">{formatDate(rx.createdAt)}</div>
                    </div>
                    <button
                      onClick={() => downloadPrescription(rx.id)}
                      className="btn btn-sm btn-circle bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border-0"
                      title="Download PDF"
                    >
                      <Download size={14} />
                    </button>
                  </div>

                  {rx.diseaseName && (
                    <div className="mt-3 flex items-center gap-1.5">
                      <Heart size={14} className="text-rose-500 fill-rose-500" />
                      <span className="text-xs font-black text-slate-700 bg-rose-50 border border-rose-100 px-2.5 py-0.5 rounded-full">
                        {rx.diseaseName}
                      </span>
                    </div>
                  )}

                  {/* EMR Stats */}
                  {(rx.bloodPressureSystolic || rx.weightKg || rx.temperatureC) && (
                    <div className="mt-4 grid grid-cols-3 gap-2 bg-white rounded-xl border border-slate-100 p-2.5 text-center text-xs">
                      {rx.weightKg > 0 && (
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase">Weight</div>
                          <strong className="text-slate-700">{rx.weightKg} kg</strong>
                        </div>
                      )}
                      {rx.bloodPressureSystolic > 0 && (
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase">BP</div>
                          <strong className="text-slate-700">{rx.bloodPressureSystolic}/{rx.bloodPressureDiastolic}</strong>
                        </div>
                      )}
                      {rx.temperatureC > 0 && (
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase">Temp</div>
                          <strong className="text-slate-700">{formatTemperatureF(rx.temperatureC)}</strong>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Rx Items */}
                  {rx.items?.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Prescribed Medicines</div>
                      <div className="space-y-1.5">
                        {rx.items.map((item) => (
                          <div key={item.id} className="text-xs flex items-start gap-1.5 justify-between">
                            <span className="font-extrabold text-slate-700">💊 {item.medicineName}</span>
                            <span className="text-slate-500 font-semibold truncate max-w-[200px]" title={item.instruction}>
                              {item.dosage} × {item.days} days ({item.instruction})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {rx.notes && (
                    <div className="mt-4 text-xs text-slate-600 font-medium italic border-t border-slate-100 pt-3">
                      &quot;{rx.notes}&quot;
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* --- BOOKING WIZARD MODAL --- */}
      {bookingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Sparkles size={18} className="text-indigo-600" />
                Book Clinic Visit
              </h3>
              <button type="button" onClick={() => { setBookingOpen(false); setBookingStep(1); }} className="text-xs font-bold text-slate-400 hover:text-slate-600">Cancel</button>
            </div>

            <div className="mt-4">
              <div className="text-xs font-black text-slate-400 uppercase mb-3">Step {bookingStep} of 3</div>

              {bookingStep === 1 && (
                <div className="space-y-3">
                  <div className="text-sm font-black">Choose Reason</div>
                  <select value={bookingForm.reason} onChange={(e) => setBookingForm(p => ({ ...p, reason: e.target.value }))} className="select select-bordered w-full h-11 rounded-xl text-sm">
                    <option value="general">General Consultation</option>
                    <option value="followup">Follow-up</option>
                    <option value="refill">Prescription Refill</option>
                    <option value="other">Other</option>
                  </select>
                  <div className="flex justify-end gap-2 mt-4">
                    <button type="button" onClick={() => setBookingStep(2)} className="btn bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2">Next</button>
                  </div>
                </div>
              )}

              {bookingStep === 2 && (
                <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); setBookingStep(3); }}>
                  <div className="text-sm font-black">Select Date & Time</div>
                  <input type="datetime-local" required value={bookingForm.datetime} onChange={(e) => setBookingForm(p => ({ ...p, datetime: e.target.value }))} className="input input-bordered w-full h-11 rounded-xl text-sm" />
                  <label className="block">
                    <span className="mb-2 block text-xs font-black text-slate-700">Notes (optional)</span>
                    <textarea className="textarea textarea-bordered w-full rounded-xl text-sm min-h-20" value={bookingForm.notes} onChange={(e) => setBookingForm(p => ({ ...p, notes: e.target.value }))} />
                  </label>
                  <div className="flex justify-between gap-2 mt-4">
                    <button type="button" onClick={() => setBookingStep(1)} className="btn btn-ghost border border-slate-200 rounded-xl px-4 py-2">Back</button>
                    <button type="submit" className="btn bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2">Next</button>
                  </div>
                </form>
              )}

              {bookingStep === 3 && (
                <form onSubmit={handleBook} className="space-y-3">
                  <div className="text-sm font-black">Confirm Details</div>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm">
                    <div><strong>Patient:</strong> {activeProfile.name}</div>
                    <div><strong>Reason:</strong> {bookingForm.reason}</div>
                    <div><strong>Date:</strong> {bookingForm.datetime}</div>
                    {bookingForm.notes && <div><strong>Notes:</strong> {bookingForm.notes}</div>}
                  </div>
                  <div className="flex justify-between gap-2 mt-4">
                    <button type="button" onClick={() => setBookingStep(2)} className="btn btn-ghost border border-slate-200 rounded-xl px-4 py-2">Back</button>
                    <button type="submit" disabled={submittingBooking} className="btn bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2">{submittingBooking ? 'Booking...' : 'Confirm & Book'}</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- PAYMENT PROOF MODAL --- */}
      {payingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <form
            onSubmit={handlePayment}
            className="w-full max-w-md bg-white rounded-3xl border border-slate-200 p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <CreditCard size={18} className="text-indigo-600" />
                Submit Payment Proof
              </h3>
              <button
                type="button"
                onClick={() => setPayingInvoice(null)}
                className="text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                Cancel
              </button>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-xs">
              <div className="font-bold text-slate-600 uppercase">Payment Amount</div>
              <div className="text-2xl font-black text-indigo-700 mt-1">{money(payingInvoice.amount)}</div>
              <div className="text-slate-400 font-semibold mt-1">For appointment code: #{payingInvoice.appointmentCode}</div>
            </div>

            <label className="block">
              <span className="mb-2 block text-xs font-black text-slate-700">Payment Gateway / App</span>
              <select
                className="select select-bordered w-full h-11 rounded-xl text-sm"
                value={paymentForm.paymentMethod}
                onChange={(e) => setPaymentForm((p) => ({ ...p, paymentMethod: e.target.value }))}
              >
                <option value="kbzpay">KBZPay</option>
                <option value="wavepay">WavePay</option>
                <option value="cbpay">CBPay</option>
                <option value="ayapay">AYAPay</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-black text-slate-700">Screenshot / Receipt URL</span>
              <input
                type="url"
                required
                placeholder="https://imgur.com/example-screenshot.jpg"
                className="input input-bordered w-full h-11 rounded-xl text-sm font-mono"
                value={paymentForm.screenshotUrl}
                onChange={(e) => setPaymentForm((p) => ({ ...p, screenshotUrl: e.target.value }))}
              />
              <span className="text-[10px] text-slate-400 font-bold block mt-1.5">
                Provide a valid hosted screenshot image link (e.g. imgur, postimages)
              </span>
            </label>

            <button
              type="submit"
              disabled={submittingPayment}
              className="btn bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11 w-full font-black text-sm"
            >
              {submittingPayment && <span className="loading loading-spinner loading-sm" />}
              Submit Manual Proof
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

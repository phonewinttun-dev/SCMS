import {
  MagicWandIcon,
  PaperPlaneIcon,
  ExclamationTriangleIcon,
  QuestionMarkCircledIcon,
  PlayIcon,
  LightningBoltIcon,
  MagnifyingGlassIcon,
  Cross2Icon,
  CheckCircledIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@radix-ui/react-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { mcpApi } from "../services/scmsApi";
import { useLanguage } from "../context/LanguageContext";

/**
 * Human-friendly metadata, titles, descriptions, categories, and field labels
 * for all clinic actions (bilingual English & Myanmar support).
 */
const ACTION_METADATA = {
  get_dashboard_summary: {
    category: "overview",
    categoryLabel: { en: "Overview", mm: "အနှစ်ချုပ်" },
    title: { en: "Clinic Overview & Financials", mm: "ဆေးခန်းအနှစ်ချုပ်နှင့် ဘဏ္ဍာရေး" },
    description: {
      en: "View today's income, consultation fees, patient counts, and queue statistics.",
      mm: "ယနေ့ ဝင်ငွေ၊ ဆွေးနွေးခ၊ လူနာဦးရေနှင့် တန်းစီဇယား အခြေအနေကို ကြည့်ပါ။",
    },
    fields: {
      period: {
        label: { en: "Time Period", mm: "ကာလအပိုင်းအခြား" },
        placeholder: "daily, weekly, or monthly (default: daily)",
      },
    },
  },
  get_today_appointments: {
    category: "appointments",
    categoryLabel: { en: "Appointments", mm: "ရက်ချိန်းများ" },
    title: { en: "Today's Appointment Schedule", mm: "ယနေ့ လူနာချိန်းဆိုမှုများ" },
    description: {
      en: "See all scheduled appointments, appointment codes, and patient names for today.",
      mm: "ယနေ့အတွက် ကြိုတင်ချိန်းဆိုထားသော လူနာများနှင့် အခြေအနေကို ကြည့်ပါ။",
    },
  },
  get_waiting_queue: {
    category: "queue",
    categoryLabel: { en: "Queue", mm: "တန်းစီဇယား" },
    title: { en: "Live Patient Waiting Queue", mm: "လက်ရှိ စောင့်ဆိုင်းနေသော လူနာများ" },
    description: {
      en: "Check who is currently waiting in line and the active token number.",
      mm: "ဆေးခန်းတွင် လက်ရှိစောင့်ဆိုင်းနေသော လူနာဦးရေနှင့် နံပါတ်ကို ကြည့်ပါ။",
    },
  },
  get_next_patient: {
    category: "queue",
    categoryLabel: { en: "Queue", mm: "တန်းစီဇယား" },
    title: { en: "Call Next Patient", mm: "နောက်လူနာ အချက်အလက် ခေါ်ယူရန်" },
    description: {
      en: "Get the medical snapshot and recent prescriptions of the next waiting patient.",
      mm: "ကုသမှုခံယူရန် စောင့်ဆိုင်းနေသော နောက်လူနာ၏ အချက်အလက်နှင့် ဆေးမှတ်တမ်းကို ကြည့်ပါ။",
    },
  },
  get_patient_profile: {
    category: "patients",
    categoryLabel: { en: "Patients", mm: "လူနာများ" },
    title: { en: "Patient Profile & Medical History", mm: "လူနာ ကိုယ်ရေးမှတ်တမ်းနှင့် အချက်အလက်" },
    description: {
      en: "Look up patient demographics, allergies, chronic conditions, and contact details.",
      mm: "လူနာ၏ အသက်၊ သွေးအုပ်စု၊ ဓာတ်မတည့်မှုများနှင့် နာတာရှည်ရောဂါများကို စစ်ဆေးပါ။",
    },
    fields: {
      patientId: {
        label: { en: "Patient ID", mm: "လူနာအမှတ် (ID)" },
        placeholder: "e.g., 1",
      },
    },
  },
  get_patient_visit_history: {
    category: "patients",
    categoryLabel: { en: "Patients", mm: "လူနာများ" },
    title: { en: "Patient Past Visit History", mm: "လူနာ လာရောက်ပြသခဲ့သည့် မှတ်တမ်း" },
    description: {
      en: "Review past consultation dates, reasons for visits, and appointment notes.",
      mm: "လူနာ၏ ယခင်လာရောက်ပြသခဲ့သော ရက်စွဲများနှင့် ဆရာဝန်မှတ်ချက်များကို ကြည့်ပါ။",
    },
    fields: {
      patientId: {
        label: { en: "Patient ID", mm: "လူနာအမှတ် (ID)" },
        placeholder: "e.g., 1",
      },
    },
  },
  get_patient_prescription_history: {
    category: "prescriptions",
    categoryLabel: { en: "Prescriptions", mm: "ဆေးညွှန်းများ" },
    title: { en: "Patient Past Prescriptions", mm: "လူနာ ယခင်ဆေးညွှန်းမှတ်တမ်း" },
    description: {
      en: "View previously prescribed medicines, dosages, and doctor instructions.",
      mm: "လူနာအား ယခင်က ညွှန်းပေးခဲ့သော ဆေးဝါးများ၊ သောက်သုံးရန် ပမာဏနှင့် ညွှန်ကြားချက်များကို ကြည့်ပါ။",
    },
    fields: {
      patientId: {
        label: { en: "Patient ID", mm: "လူနာအမှတ် (ID)" },
        placeholder: "e.g., 1",
      },
    },
  },
  get_medicine_stock: {
    category: "pharmacy",
    categoryLabel: { en: "Pharmacy", mm: "ဆေးဝါးလက်ကျန်" },
    title: { en: "Check Medicine Stock Levels", mm: "ဆေးဝါးတစ်ခုချင်း လက်ကျန်စစ်ဆေးရန်" },
    description: {
      en: "Check available stock, active batches, and expiration dates for a medicine.",
      mm: "ဆေးဝါးအမည်ဖြင့် လက်ကျန်ပမာဏနှင့် သက်တမ်းကုန်မည့်ရက်များကို စစ်ဆေးပါ။",
    },
    fields: {
      name: {
        label: { en: "Medicine Name", mm: "ဆေးဝါးအမည်" },
        placeholder: "e.g., Paracetamol, Amoxicillin",
      },
    },
  },
  get_low_stock_medicines: {
    category: "pharmacy",
    categoryLabel: { en: "Pharmacy", mm: "ဆေးဝါးလက်ကျန်" },
    title: { en: "Low Stock Alert List", mm: "လက်ကျန်နည်းနေသော ဆေးဝါးများ" },
    description: {
      en: "View all medicines currently running low and needing reordering.",
      mm: "လက်ကျန် နည်းနေပြီး အသစ်ထပ်မံမှာယူရန် လိုအပ်သော ဆေးဝါးများကို ကြည့်ပါ။",
    },
  },
  get_expiring_batches: {
    category: "pharmacy",
    categoryLabel: { en: "Pharmacy", mm: "ဆေးဝါးလက်ကျန်" },
    title: { en: "Expiring Medicine Batches", mm: "သက်တမ်းကုန်ခါနီး ဆေးဝါးများ" },
    description: {
      en: "List medicine batches expiring within the specified days (default: 30 days).",
      mm: "ရက် ၃၀ အတွင်း သက်တမ်းကုန်ဆုံးမည့် ဆေးဝါးအတွဲများကို ကြည့်ပါ။",
    },
    fields: {
      days: {
        label: { en: "Days to Expiry", mm: "သက်တမ်းကုန်မည့် ရက်ပေါင်း" },
        placeholder: "30 (default)",
      },
    },
  },
  create_follow_up_reminder: {
    category: "patients",
    categoryLabel: { en: "Patients", mm: "လူနာများ" },
    title: { en: "Set Patient Follow-up Date", mm: "နောက်တစ်ကြိမ်ပြသရန် ရက်ချိန်းမှတ်ရန်" },
    description: {
      en: "Schedule a reminder for when a patient needs to return for a checkup.",
      mm: "လူနာ နောက်တစ်ကြိမ် လာရောက်ပြသရမည့်ရက်နှင့် အကြံပြုချက်ကို သတ်မှတ်ပါ။",
    },
    fields: {
      patientId: {
        label: { en: "Patient ID", mm: "လူနာအမှတ် (ID)" },
        placeholder: "e.g., 1",
      },
      dueInDays: {
        label: { en: "Return In (Days)", mm: "လာပြရမည့် ရက်ပေါင်း" },
        placeholder: "e.g., 7 or 14",
      },
      recommendation: {
        label: { en: "Care Recommendation / Note", mm: "အကြံပြုချက် / မှတ်ချက်" },
        placeholder: "e.g., Blood pressure checkup, Blood sugar test",
      },
    },
  },
  get_unread_notifications: {
    category: "alerts",
    categoryLabel: { en: "Alerts", mm: "သတိပေးချက်များ" },
    title: { en: "Clinic System & Inventory Alerts", mm: "ဆေးခန်း သတိပေးချက်များ" },
    description: {
      en: "Check recent unread notices, stock alerts, and clinic reminders.",
      mm: "လတ်တလော ဆေးလက်ကျန်နှင့် ဆေးခန်းဆိုင်ရာ အရေးကြီးအသိပေးချက်များကို ကြည့်ပါ။",
    },
  },
  update_appointment_status: {
    category: "appointments",
    categoryLabel: { en: "Appointments", mm: "ရက်ချိန်းများ" },
    title: { en: "Change Appointment Status", mm: "ချိန်းဆိုမှု အခြေအနေ ပြောင်းရန်" },
    description: {
      en: "Mark an appointment as confirmed, completed, or cancelled by Appointment ID.",
      mm: "ချိန်းဆိုမှုအမှတ်ဖြင့် အတည်ပြု၊ ပြီးဆုံး သို့မဟုတ် ပယ်ဖျက်အဖြစ် ပြောင်းပါ။",
    },
    fields: {
      appointmentId: {
        label: { en: "Appointment ID", mm: "ချိန်းဆိုမှုအမှတ် (ID)" },
        placeholder: "e.g., 1",
      },
      status: {
        label: { en: "New Status", mm: "အခြေအနေအသစ်" },
        placeholder: "pending, confirmed, cancelled, or completed",
      },
      notes: {
        label: { en: "Optional Note", mm: "မှတ်ချက် (မထည့်လည်းရ)" },
        placeholder: "e.g., Patient arrived on time",
      },
    },
  },
  update_appointment_status_by_patient_name: {
    category: "appointments",
    categoryLabel: { en: "Appointments", mm: "ရက်ချိန်းများ" },
    title: { en: "Update Status by Patient Name", mm: "လူနာအမည်ဖြင့် ချိန်းဆိုမှုပြောင်းရန်" },
    description: {
      en: "Search for a patient by name and quickly update their appointment status.",
      mm: "လူနာအမည်ဖြင့် ရှာဖွေပြီး ချိန်းဆိုမှု အခြေအနေကို ပြောင်းလဲပါ။",
    },
    fields: {
      patientName: {
        label: { en: "Patient Name", mm: "လူနာအမည်" },
        placeholder: "e.g., Daw Hla, U Mg Mg",
      },
      status: {
        label: { en: "New Status", mm: "အခြေအနေအသစ်" },
        placeholder: "confirmed, completed, or cancelled",
      },
      notes: {
        label: { en: "Optional Note", mm: "မှတ်ချက်" },
        placeholder: "e.g., Confirmed via phone call",
      },
    },
  },
  reschedule_today_appointments: {
    category: "appointments",
    categoryLabel: { en: "Appointments", mm: "ရက်ချိန်းများ" },
    title: { en: "Shift Today's Clinic Schedule", mm: "ယနေ့ ရက်ချိန်းများ အချိန်ရွှေ့ရန်" },
    description: {
      en: "Move today's remaining appointments forward to start from a new time.",
      mm: "ယနေ့ကျန်ရှိသော ချိန်းဆိုမှုများကို အချိန်အသစ်မှ စတင်ရန် ရွှေ့ပါ။",
    },
    fields: {
      targetStartTime: {
        label: { en: "New Target Start Time", mm: "စတင်မည့် အချိန်အသစ်" },
        placeholder: "e.g., 10:30 AM or 14:00",
      },
    },
  },
  cancel_appointments_in_range: {
    category: "appointments",
    categoryLabel: { en: "Appointments", mm: "ရက်ချိန်းများ" },
    title: { en: "Cancel Appointments in Time Range", mm: "သတ်မှတ်ချိန်အတွင်း ချိန်းဆိုမှုများ ပယ်ဖျက်ရန်" },
    description: {
      en: "Cancel all appointments scheduled within a chosen time window.",
      mm: "သတ်မှတ်ထားသော အချိန်အပိုင်းအခြားအတွင်း ချိန်းဆိုမှုအားလုံးကို ပယ်ဖျက်ပါ။",
    },
    fields: {
      startTime: {
        label: { en: "Start Date & Time", mm: "စတင်ချိန်" },
        placeholder: "e.g., today 09:00 AM",
      },
      endTime: {
        label: { en: "End Date & Time", mm: "ပြီးဆုံးချိန်" },
        placeholder: "e.g., today 12:00 PM",
      },
      reason: {
        label: { en: "Reason for Cancellation", mm: "ပယ်ဖျက်ရသည့် အကြောင်းရင်း" },
        placeholder: "e.g., Doctor emergency leave",
      },
    },
  },
  reschedule_appointments_in_range: {
    category: "appointments",
    categoryLabel: { en: "Appointments", mm: "ရက်ချိန်းများ" },
    title: { en: "Reschedule Appointments in Time Range", mm: "သတ်မှတ်ချိန်အတွင်း ချိန်းဆိုမှုများ အချိန်ရွှေ့ရန်" },
    description: {
      en: "Shift all appointments from one time window to a new start time.",
      mm: "သတ်မှတ်အချိန်အတွင်း ချိန်းဆိုမှုများကို အချိန်အသစ်သို့ ပြောင်းရွှေ့ပါ။",
    },
    fields: {
      sourceStartTime: {
        label: { en: "Original Start Time", mm: "မူလစတင်ချိန်" },
        placeholder: "e.g., today 09:00 AM",
      },
      sourceEndTime: {
        label: { en: "Original End Time", mm: "မူလပြီးဆုံးချိန်" },
        placeholder: "e.g., today 12:00 PM",
      },
      targetStartTime: {
        label: { en: "New Target Start Time", mm: "ပြောင်းရွှေ့မည့် အချိန်အသစ်" },
        placeholder: "e.g., tomorrow 09:00 AM",
      },
    },
  },
  bulk_update_today_appointments_status: {
    category: "appointments",
    categoryLabel: { en: "Appointments", mm: "ရက်ချိန်းများ" },
    title: { en: "Update All Today's Appointments", mm: "ယနေ့ ချိန်းဆိုမှုအားလုံး အခြေအနေပြောင်းရန်" },
    description: {
      en: "Bulk confirm, complete, or cancel all appointments scheduled for today.",
      mm: "ယနေ့အတွက် ချိန်းဆိုမှုအားလုံးကို တစ်ပြိုင်နက် အတည်ပြု၊ ပြီးဆုံး သို့မဟုတ် ပယ်ဖျက်ပါ။",
    },
    fields: {
      status: {
        label: { en: "New Status for All", mm: "ပြောင်းလဲမည့် အခြေအနေ" },
        placeholder: "confirmed, completed, or cancelled",
      },
    },
  },
  get_prescription_templates: {
    category: "prescriptions",
    categoryLabel: { en: "Prescriptions", mm: "ဆေးညွှန်းများ" },
    title: { en: "Saved Prescription Templates", mm: "ဆေးညွှန်း ပုံစံခွက်များ ကြည့်ရန်" },
    description: {
      en: "Browse reusable medicine templates organized by disease or condition.",
      mm: "ရောဂါအလိုက် ကြိုတင်သိမ်းဆည်းထားသော ဆေးညွှန်းပုံစံများကို ရှာဖွေကြည့်ရှုပါ။",
    },
    fields: {
      diseaseName: {
        label: { en: "Filter by Disease (Optional)", mm: "ရောဂါအမည်ဖြင့် ရှာရန် (မထည့်လည်းရ)" },
        placeholder: "e.g., Asthma, Hypertension",
      },
      diseaseId: {
        label: { en: "Disease ID (Optional)", mm: "ရောဂါအမှတ် (မထည့်လည်းရ)" },
        placeholder: "e.g., 1",
      },
    },
  },
  create_prescription_template: {
    category: "prescriptions",
    categoryLabel: { en: "Prescriptions", mm: "ဆေးညွှန်းများ" },
    title: { en: "Create New Prescription Template", mm: "ဆေးညွှန်း ပုံစံခွက်အသစ် ပြုလုပ်ရန်" },
    description: {
      en: "Save a standard combination of medicines, dosages, and days for a disease.",
      mm: "ရောဂါတစ်ခုအတွက် စံဆေးညွှန်းအတွဲအသစ်ကို သိမ်းဆည်းပါ။",
    },
    fields: {
      diseaseName: {
        label: { en: "Disease / Diagnosis", mm: "ရောဂါအမည်" },
        placeholder: "e.g., Acute Bronchitis",
      },
      templateName: {
        label: { en: "Template Title", mm: "ပုံစံခွက်အမည်" },
        placeholder: "e.g., Adult Standard Course",
      },
      notes: {
        label: { en: "Instructions / Notes", mm: "လမ်းညွှန်ချက်" },
        placeholder: "e.g., 5-day course with meals",
      },
    },
  },
  delete_prescription_template: {
    category: "prescriptions",
    categoryLabel: { en: "Prescriptions", mm: "ဆေးညွှန်းများ" },
    title: { en: "Delete Prescription Template", mm: "ဆေးညွှန်း ပုံစံခွက် ဖျက်ရန်" },
    description: {
      en: "Remove a saved prescription template by Template ID.",
      mm: "သိမ်းဆည်းထားသော ဆေးညွှန်းပုံစံခွက်ကို အမှတ်ဖြင့် ဖျက်ပါ။",
    },
    fields: {
      templateId: {
        label: { en: "Template ID", mm: "ပုံစံခွက်အမှတ် (ID)" },
        placeholder: "e.g., 1",
      },
    },
  },
  get_patient_kyp_brief: {
    category: "patients",
    categoryLabel: { en: "Patients", mm: "လူနာများ" },
    title: { en: "Patient Clinical Summary (KYP)", mm: "လူနာ အလုံးစုံကျန်းမာရေး အကျဉ်းချုပ်" },
    description: {
      en: "Generate a complete clinical overview and medical history for a patient.",
      mm: "လူနာ၏ အလုံးစုံကျန်းမာရေးအခြေအနေနှင့် လာရောက်ပြသမှုမှတ်တမ်းကို ကြည့်ပါ။",
    },
    fields: {
      patientId: {
        label: { en: "Patient ID (or Name)", mm: "လူနာအမှတ် (သို့မဟုတ် အမည်)" },
        placeholder: "e.g., 1 or Daw Hla",
      },
    },
  },
};

const CATEGORIES = [
  { id: "all", label: { en: "All", mm: "အားလုံး" } },
  { id: "overview", label: { en: "Overview", mm: "အနှစ်ချုပ်" } },
  { id: "appointments", label: { en: "Appointments", mm: "ရက်ချိန်းများ" } },
  { id: "queue", label: { en: "Queue", mm: "တန်းစီဇယား" } },
  { id: "patients", label: { en: "Patients", mm: "လူနာများ" } },
  { id: "pharmacy", label: { en: "Pharmacy", mm: "ဆေးဝါးများ" } },
  { id: "prescriptions", label: { en: "Prescriptions", mm: "ဆေးညွှန်းများ" } },
  { id: "alerts", label: { en: "Alerts", mm: "သတိပေးချက်များ" } },
];

const CATEGORY_STYLES = {
  overview: "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200/80 dark:border-blue-900/60",
  appointments: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-900/60",
  queue: "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-900/60",
  patients: "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200/80 dark:border-purple-900/60",
  pharmacy: "bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border-cyan-200/80 dark:border-cyan-900/60",
  prescriptions: "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-900/60",
  alerts: "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-900/60",
  default: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700",
};

const renderMessageContent = (content) => {
  if (!content) return null;

  // Auto-translate yyyy-MM-dd dates to dd-MM-yyyy format
  const formattedContent = content.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, "$3-$2-$1");
  const lines = formattedContent.split("\n");

  return lines.map((line, lineIdx) => {
    const trimmed = line.trim();
    const isBullet = trimmed.startsWith("* ") || trimmed.startsWith("- ");
    let lineContent = line;
    if (isBullet) {
      const bulletIndex = line.indexOf(trimmed.startsWith("* ") ? "* " : "- ");
      lineContent = line.substring(bulletIndex + 2);
    }

    const parts = [];
    const regex = /\*\*(.*?)\*\*/g;
    let match;
    let lastIndex = 0;

    while ((match = regex.exec(lineContent)) !== null) {
      const matchIndex = match.index;
      if (matchIndex > lastIndex) {
        parts.push(lineContent.substring(lastIndex, matchIndex));
      }
      parts.push(
        <strong key={matchIndex} className="font-extrabold text-slate-900 dark:text-white">
          {match[1]}
        </strong>
      );
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < lineContent.length) {
      parts.push(lineContent.substring(lastIndex));
    }

    const contentNode = parts.length > 0 ? parts : lineContent;

    if (isBullet) {
      return (
        <ul key={lineIdx} className="list-disc pl-5 my-0.5">
          <li className="font-medium text-slate-700 dark:text-slate-200">{contentNode}</li>
        </ul>
      );
    }

    return (
      <p key={lineIdx} className="min-h-[1.25rem] font-medium text-slate-700 dark:text-slate-200">
        {contentNode}
      </p>
    );
  });
};

export default function AiAssistant() {
  const { language } = useLanguage();
  const [messages, setMessages] = useState([
    {
      role: "model",
      content:
        language === "mm"
          ? "မင်္ဂလာပါ! ကျွန်တော်ကတော့ SCMS ဆေးခန်း AI အကူအညီပေးသူ ဖြစ်ပါတယ်။ ဆေးခန်းလည်ပတ်မှုတွေ၊ လူနာချိန်းဆိုမှုတွေနဲ့ ဆေးဝါးလက်ကျန်တွေကို ရှာဖွေစုံစမ်းဖို့ ဘယ်လိုကူညီပေးရမလဲခင်ဗျာ။"
          : "Hello! I am your intelligent clinic assistant. How can I help you manage clinic operations, check appointments, or review medicine stock today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [tools, setTools] = useState([]);
  const [selectedTool, setSelectedTool] = useState(null);
  const [toolInputs, setToolInputs] = useState({});
  const [toolResponse, setToolResponse] = useState(null);
  const [showRawJson, setShowRawJson] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [loadingChat, setLoadingChat] = useState(false);
  const [loadingTools, setLoadingTools] = useState(false);
  const [loadingToolCall, setLoadingToolCall] = useState(false);
  const [error, setError] = useState("");

  const chatEndRef = useRef(null);

  useEffect(() => {
    loadTools();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loadingChat]);

  const loadTools = async () => {
    try {
      setLoadingTools(true);
      setError("");
      const res = await mcpApi.tools();
      if (res?.isSuccess) {
        setTools(res.data || []);
      } else {
        setError(res?.message || "Failed to load clinic actions.");
      }
    } catch (err) {
      setError(err?.message || "Error connecting to AI backend.");
    } finally {
      setLoadingTools(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const query = input.trim();
    if (!query || loadingChat) return;

    const nextMessages = [...messages, { role: "user", content: query }];
    setMessages(nextMessages);
    setInput("");
    setLoadingChat(true);

    try {
      const res = await mcpApi.chat({
        messages: nextMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      if (res?.isSuccess && res.data?.reply) {
        setMessages((prev) => [
          ...prev,
          { role: "model", content: res.data.reply },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "model",
            content:
              language === "mm"
                ? "တောင်းပန်ပါသည်။ မေးမြန်းချက်ကို ဆောင်ရွက်ရာတွင် အခက်အခဲရှိနေပါသည်။ ကျေးဇူးပြု၍ ထပ်မံကြိုးစားကြည့်ပါ။"
                : "Sorry, I encountered an issue processing that request. Please try again.",
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          content: `Error: ${err?.response?.data?.message || err?.message || "Could not connect to Gemini AI."}`,
        },
      ]);
    } finally {
      setLoadingChat(false);
    }
  };

  const handleToolSelect = (tool) => {
    setSelectedTool(tool);
    setToolResponse(null);
    setShowRawJson(false);
    const initialInputs = {};
    if (tool?.inputSchema?.properties) {
      Object.keys(tool.inputSchema.properties).forEach((k) => {
        initialInputs[k] = "";
      });
    }
    setToolInputs(initialInputs);
  };

  const handleToolInput = (key, val) => {
    setToolInputs((prev) => ({ ...prev, [key]: val }));
  };

  const handleCallTool = async () => {
    if (!selectedTool || loadingToolCall) return;
    setLoadingToolCall(true);
    setToolResponse(null);

    try {
      const parsedArgs = {};
      const props = selectedTool.inputSchema?.properties || {};

      Object.entries(toolInputs).forEach(([k, v]) => {
        if (v === "") return;
        const type = props[k]?.type;
        if (type === "number" || type === "integer") {
          parsedArgs[k] = Number(v);
        } else if (type === "boolean") {
          parsedArgs[k] = v === "true" || v === true;
        } else {
          parsedArgs[k] = v;
        }
      });

      const res = await mcpApi.callTool({
        name: selectedTool.name,
        arguments: parsedArgs,
      });

      if (res?.isSuccess) {
        setToolResponse(res.data);
      } else {
        setToolResponse({ isError: true, error: res?.message || "Execution failed" });
      }
    } catch (err) {
      setToolResponse({ isError: true, error: err?.message || "Error calling action" });
    } finally {
      setLoadingToolCall(false);
    }
  };

  const quickPrompts = [
    {
      label: language === "mm" ? "ယနေ့ ရက်ချိန်းများ" : "Today's Schedule",
      prompt: "What appointments are scheduled for today?",
    },
    {
      label: language === "mm" ? "လက်ကျန်နည်း ဆေးဝါးများ" : "Low Stock Alerts",
      prompt: "Show me all critical medicine stock alerts and low inventory.",
    },
    {
      label: language === "mm" ? "လက်ရှိ တန်းစီလူနာများ" : "Live Queue Status",
      prompt: "Who is currently waiting in the clinic queue?",
    },
    {
      label: language === "mm" ? "အဆုတ်ပန်းနာ ဆေးညွှန်းပုံစံ" : "Asthma Prescription",
      prompt: "What standard prescription templates do we have for Asthma?",
    },
  ];

  // Filtered tools by search and category
  const filteredTools = useMemo(() => {
    return tools.filter((tool) => {
      const meta = ACTION_METADATA[tool.name] || {};
      const category = meta.category || "default";

      if (activeCategory !== "all" && category !== activeCategory) {
        return false;
      }

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const titleEn = (meta.title?.en || "").toLowerCase();
      const titleMm = (meta.title?.mm || "").toLowerCase();
      const descEn = (meta.description?.en || "").toLowerCase();
      const descMm = (meta.description?.mm || "").toLowerCase();
      const rawName = tool.name.toLowerCase();

      return (
        titleEn.includes(q) ||
        titleMm.includes(q) ||
        descEn.includes(q) ||
        descMm.includes(q) ||
        rawName.includes(q)
      );
    });
  }, [tools, activeCategory, searchQuery]);

  // Helper to extract text from toolResponse
  const parsedResponseContent = useMemo(() => {
    if (!toolResponse) return null;
    if (toolResponse.isError) return null;
    if (toolResponse.content && toolResponse.content[0]?.text) {
      try {
        return JSON.parse(toolResponse.content[0].text);
      } catch {
        return toolResponse.content[0].text;
      }
    }
    return toolResponse;
  }, [toolResponse]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.55fr_1.15fr] animate-fadeIn">
      {/* Chat Window */}
      <section className="flex h-[calc(100vh-140px)] flex-col rounded-3xl border border-border/80 bg-card/95 p-6 shadow-scms">
        <div className="flex items-center gap-3 border-b border-border/70 pb-4">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 border border-orange-200/50 dark:border-orange-900/40 shrink-0">
            <MagicWandIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground">
              {language === "mm" ? "AI ဆေးခန်းလက်ထောက်" : "AI Clinical Assistant"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {language === "mm"
                ? "ဆေးခန်းလုပ်ငန်းများနှင့် လူနာစောင့်ရှောက်မှု AI လက်ထောက်"
                : "AI-powered clinical & clinic management assistant"}
            </p>
          </div>
        </div>

        {/* Message Panel */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 scrollbar-thin">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 max-w-[85%] ${
                msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
              }`}
            >
              <div
                className={`grid h-8 w-8 place-items-center rounded-xl text-xs font-bold text-white shrink-0 shadow-2xs ${
                  msg.role === "user" ? "bg-orange-500" : "bg-zinc-800 dark:bg-zinc-700"
                }`}
              >
                {msg.role === "user" ? "U" : "AI"}
              </div>
              <div
                className={`rounded-3xl px-4 py-3 text-sm leading-6 ${
                  msg.role === "user"
                    ? "bg-orange-500 text-white rounded-tr-sm shadow-xs font-medium"
                    : "bg-secondary/70 border border-border/70 text-foreground rounded-tl-sm shadow-2xs"
                }`}
              >
                <div className="space-y-1">{renderMessageContent(msg.content)}</div>
              </div>
            </div>
          ))}
          {loadingChat && (
            <div className="flex gap-3 mr-auto max-w-[85%]">
              <div className="grid h-8 w-8 place-items-center rounded-xl text-xs font-bold text-white bg-zinc-800 dark:bg-zinc-700 shrink-0 animate-pulse">
                AI
              </div>
              <div className="rounded-3xl rounded-tl-sm bg-secondary/70 border border-border/70 px-4 py-3 text-sm">
                <span className="loading loading-dots loading-xs text-orange-500" />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Quick Prompts */}
        {messages.length === 1 && (
          <div className="mb-3">
            <div className="text-[11px] font-bold text-muted-foreground uppercase mb-1.5 px-0.5">
              {language === "mm" ? "အကြံပြုမေးခွန်းများ" : "Suggested Queries"}
            </div>
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((qp, idx) => (
                <button
                  key={idx}
                  onClick={() => setInput(qp.prompt)}
                  className="rounded-full border border-orange-200 dark:border-orange-900 bg-orange-50/60 dark:bg-orange-950/40 px-3 py-1.5 text-xs font-bold text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/60 transition btn-target flex items-center gap-1.5"
                >
                  <LightningBoltIcon className="w-3 h-3 text-orange-500" />
                  <span>{qp.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Bar */}
        <form onSubmit={handleSend} className="relative mt-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              language === "mm"
                ? "မေးမြန်းလိုသောအချက် ရေးပါ (ဥပမာ- 'ယနေ့ ရက်ချိန်းများ ပြပါ', 'ပါရာစီတမော လက်ကျန်စစ်ပေးပါ')..."
                : "Ask anything (e.g. 'What are today's urgent appointments?' or 'Check Paracetamol stock')..."
            }
            className="scms-input w-full pr-12 rounded-2xl h-11 text-xs"
          />
          <button
            type="submit"
            disabled={!input.trim() || loadingChat}
            className="absolute right-2 top-1/2 -translate-y-1/2 grid h-8 w-8 place-items-center rounded-xl bg-orange-500 text-white disabled:opacity-40 hover:bg-orange-600 transition btn-target shadow-2xs"
            aria-label="Send Message"
          >
            <PaperPlaneIcon className="w-4 h-4" />
          </button>
        </form>
      </section>

      {/* Quick Clinic Actions Sidebar */}
      <section className="flex h-[calc(100vh-140px)] flex-col rounded-3xl border border-border/80 bg-card/95 p-6 shadow-scms">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border/70 pb-4">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 border border-orange-200/50 dark:border-orange-900/40 shrink-0">
            <LightningBoltIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">
              {language === "mm" ? "အမြန် လုပ်ဆောင်ချက်များ" : "Quick Clinic Actions"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {language === "mm"
                ? "ဆေးခန်းလုပ်ငန်းများ တိုက်ရိုက်စစ်ဆေးပြီး လုပ်ဆောင်ရန်"
                : "Direct clinic shortcuts & instant lookups"}
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 p-3.5 text-xs font-bold text-rose-700 dark:text-rose-300">
            <ExclamationTriangleIcon className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Search & Category Filter */}
        <div className="mt-3 space-y-2">
          {/* Search Input */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search anything"
              className="scms-input w-full pl-8 pr-7 h-8 text-xs rounded-xl"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <Cross2Icon className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Category Chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold whitespace-nowrap transition btn-target ${
                  activeCategory === cat.id
                    ? "bg-orange-500 text-white shadow-2xs"
                    : "bg-secondary/70 text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                {cat.label[language === "mm" ? "mm" : "en"]}
              </button>
            ))}
          </div>
        </div>

        {/* Action Cards List */}
        <div className="mt-2.5 flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
          {loadingTools ? (
            <div className="grid place-items-center h-40">
              <span className="loading loading-spinner loading-md text-orange-600 dark:text-orange-400" />
            </div>
          ) : filteredTools.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 text-xs font-semibold">
              <QuestionMarkCircledIcon className="w-8 h-8 mb-2 opacity-40" />
              {language === "mm"
                ? "ကိုက်ညီသော လုပ်ဆောင်ချက် မရှိပါ။"
                : "No matching clinic actions found."}
            </div>
          ) : (
            filteredTools.map((tool) => {
              const meta = ACTION_METADATA[tool.name] || {};
              const title =
                (language === "mm" ? meta.title?.mm : meta.title?.en) ||
                tool.name.replace(/_/g, " ");
              const description =
                (language === "mm" ? meta.description?.mm : meta.description?.en) ||
                tool.description;
              const categoryKey = meta.category || "default";
              const categoryBadge =
                (language === "mm" ? meta.categoryLabel?.mm : meta.categoryLabel?.en) ||
                "Action";
              const badgeStyle = CATEGORY_STYLES[categoryKey] || CATEGORY_STYLES.default;
              const isSelected = selectedTool?.name === tool.name;

              return (
                <button
                  key={tool.name}
                  onClick={() => handleToolSelect(tool)}
                  className={`w-full text-left rounded-2xl border p-3 transition btn-target ${
                    isSelected
                      ? "border-orange-500 bg-orange-50/50 dark:bg-orange-950/30 shadow-2xs"
                      : "border-border/70 bg-card hover:bg-secondary/50 hover:border-border"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-md border px-2 py-0.5 text-[10px] font-bold shrink-0 ${badgeStyle}`}
                    >
                      {categoryBadge}
                    </span>
                    <strong className="text-xs font-bold text-foreground truncate">
                      {title}
                    </strong>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {description}
                  </p>
                </button>
              );
            })
          )}
        </div>

        {/* Action Runner Form & Output Area */}
        {selectedTool && (
          <div className="border-t border-border/80 pt-3.5 mt-2.5">
            {(() => {
              const meta = ACTION_METADATA[selectedTool.name] || {};
              const actionTitle =
                (language === "mm" ? meta.title?.mm : meta.title?.en) ||
                selectedTool.name.replace(/_/g, " ");

              return (
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="text-xs font-bold text-foreground">
                      {language === "mm" ? "လုပ်ဆောင်ရန်:" : "Action:"}{" "}
                      <span className="text-orange-600 dark:text-orange-400">
                        {actionTitle}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedTool(null);
                        setToolResponse(null);
                      }}
                      className="text-xs font-bold text-muted-foreground hover:text-foreground btn-target"
                    >
                      {language === "mm" ? "ပိတ်မည်" : "Cancel"}
                    </button>
                  </div>

                  {/* Dynamic Inputs with Friendly Labels */}
                  {selectedTool.inputSchema?.properties &&
                    Object.keys(selectedTool.inputSchema.properties).length > 0 && (
                      <div className="space-y-2 max-h-[130px] overflow-y-auto mb-2.5 pr-1 scrollbar-thin">
                        {Object.entries(selectedTool.inputSchema.properties).map(([k, prop]) => {
                          const fieldMeta = meta.fields?.[k];
                          const fieldLabel =
                            (language === "mm" ? fieldMeta?.label?.mm : fieldMeta?.label?.en) ||
                            k;
                          const placeholder = fieldMeta?.placeholder || `Enter ${k}...`;

                          return (
                            <label key={k} className="block text-xs">
                              <span className="block text-[11px] font-bold text-muted-foreground mb-1">
                                {fieldLabel}
                              </span>
                              <input
                                type="text"
                                className="scms-input w-full text-xs h-8 rounded-xl"
                                placeholder={placeholder}
                                value={toolInputs[k] || ""}
                                onChange={(e) => handleToolInput(k, e.target.value)}
                              />
                            </label>
                          );
                        })}
                      </div>
                    )}

                  <button
                    onClick={handleCallTool}
                    disabled={loadingToolCall}
                    className="scms-btn-primary min-h-9 h-9 w-full flex items-center justify-center gap-2 text-xs font-bold btn-target shadow-2xs"
                  >
                    {loadingToolCall ? (
                      <span className="loading loading-spinner loading-xs" />
                    ) : (
                      <>
                        <PlayIcon className="w-3.5 h-3.5" />
                        <span>
                          {language === "mm" ? "လုပ်ဆောင်မည်" : "Run Action"}
                        </span>
                      </>
                    )}
                  </button>

                  {/* Formatted Output Section */}
                  {toolResponse && (
                    <div className="mt-2.5 rounded-2xl border border-border/80 bg-secondary/40 p-3 text-xs">
                      <div className="flex items-center justify-between border-b border-border/60 pb-1.5 mb-2">
                        <div className="flex items-center gap-1.5 font-bold text-foreground">
                          {toolResponse.isError ? (
                            <>
                              <ExclamationTriangleIcon className="w-3.5 h-3.5 text-rose-500" />
                              <span className="text-rose-600 dark:text-rose-400">
                                {language === "mm" ? "လုပ်ဆောင်မှု မအောင်မြင်ပါ" : "Execution Issue"}
                              </span>
                            </>
                          ) : (
                            <>
                              <CheckCircledIcon className="w-3.5 h-3.5 text-emerald-500" />
                              <span className="text-emerald-600 dark:text-emerald-400">
                                {language === "mm" ? "ရလဒ် အချက်အလက်များ" : "Action Result"}
                              </span>
                            </>
                          )}
                        </div>
                        {!toolResponse.isError && (
                          <button
                            onClick={() => setShowRawJson(!showRawJson)}
                            className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-foreground"
                          >
                            <span>{showRawJson ? "Simple View" : "Raw Data"}</span>
                            {showRawJson ? (
                              <ChevronUpIcon className="w-3 h-3" />
                            ) : (
                              <ChevronDownIcon className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>

                      {toolResponse.isError ? (
                        <div className="text-rose-600 dark:text-rose-400 font-medium">
                          {toolResponse.error}
                        </div>
                      ) : showRawJson ? (
                        <pre className="text-foreground text-[11px] font-mono whitespace-pre-wrap max-h-[140px] overflow-auto bg-card p-2 rounded-xl border border-border/60">
                          {JSON.stringify(parsedResponseContent, null, 2)}
                        </pre>
                      ) : (
                        <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1 scrollbar-thin text-xs">
                          {Array.isArray(parsedResponseContent) ? (
                            parsedResponseContent.length === 0 ? (
                              <p className="text-muted-foreground italic">
                                {language === "mm" ? "မှတ်တမ်း မရှိပါ။" : "No records found."}
                              </p>
                            ) : (
                              parsedResponseContent.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="rounded-xl border border-border/60 bg-card/80 p-2 text-[11px] space-y-0.5"
                                >
                                  {Object.entries(item).map(([k, v]) => (
                                    <div key={k} className="flex justify-between gap-2">
                                      <span className="text-muted-foreground font-medium capitalize">
                                        {k.replace(/([A-Z])/g, " $1")}:
                                      </span>
                                      <span className="font-bold text-foreground text-right truncate">
                                        {typeof v === "object" ? JSON.stringify(v) : String(v)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ))
                            )
                          ) : typeof parsedResponseContent === "object" && parsedResponseContent !== null ? (
                            <div className="space-y-1 bg-card/80 p-2 rounded-xl border border-border/60">
                              {Object.entries(parsedResponseContent).map(([k, v]) => (
                                <div key={k} className="flex justify-between gap-2 text-[11px]">
                                  <span className="text-muted-foreground font-medium capitalize">
                                    {k.replace(/([A-Z])/g, " $1")}:
                                  </span>
                                  <span className="font-bold text-foreground text-right truncate max-w-[60%]">
                                    {typeof v === "object" ? JSON.stringify(v) : String(v)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="font-medium text-foreground">{String(parsedResponseContent)}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </section>
    </div>
  );
}


import {
  BarChartIcon,
  CalendarIcon,
  ListBulletIcon,
  PersonIcon,
  IdCardIcon,
  CounterClockwiseClockIcon,
  FileTextIcon,
  ArchiveIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  BellIcon,
  Pencil2Icon,
  Cross2Icon,
  ReloadIcon,
  PlusCircledIcon,
  TrashIcon,
  CheckCircledIcon,
  MagnifyingGlassIcon,
} from "@radix-ui/react-icons";

/**
 * Category grouping + display order for the Quick Actions panel.
 */
export const CATEGORY_ORDER = [
  "appointments",
  "patients",
  "inventory",
  "prescriptions",
  "reminders",
  "dashboard",
];

export const CATEGORY_LABELS = {
  appointments: { en: "Appointments & Queue", mm: "ချိန်းဆိုမှုနှင့် တန်းစီစာရင်း" },
  patients: { en: "Patients", mm: "လူနာများ" },
  inventory: { en: "Inventory & Stock", mm: "ဆေးဝါးလက်ကျန်" },
  prescriptions: { en: "Prescriptions", mm: "ဆေးညွှန်းများ" },
  reminders: { en: "Reminders & Notifications", mm: "သတိပေးချက်များ" },
  dashboard: { en: "Dashboard & Reports", mm: "ခြုံငုံသုံးသပ်ချက်" },
};

/**
 * Friendly metadata for every MCP tool, keyed by the raw tool name the backend
 * advertises. This is what turns a JSON-schema-shaped tool list into a plain
 * language action grid. `confirm: true` marks tools whose blast radius (bulk
 * mutation, deletion, or a fuzzy patient-name match) warrants an "are you
 * sure?" step before calling the backend.
 */
export const TOOL_CATALOG = {
  get_dashboard_summary: {
    icon: BarChartIcon,
    category: "dashboard",
    label: { en: "Clinic Summary", mm: "ဆေးခန်း ခြုံငုံချုပ်" },
  },
  get_today_appointments: {
    icon: CalendarIcon,
    category: "appointments",
    label: { en: "Today's Appointments", mm: "ယနေ့ချိန်းဆိုမှုများ" },
  },
  get_waiting_queue: {
    icon: ListBulletIcon,
    category: "appointments",
    label: { en: "Waiting Queue", mm: "စောင့်ဆိုင်းနေသော တန်းစီစာရင်း" },
  },
  get_next_patient: {
    icon: PersonIcon,
    category: "appointments",
    label: { en: "Next Patient in Queue", mm: "နောက်လူနာ" },
  },
  get_patient_profile: {
    icon: IdCardIcon,
    category: "patients",
    label: { en: "Patient Profile", mm: "လူနာ အချက်အလက်" },
  },
  get_patient_visit_history: {
    icon: CounterClockwiseClockIcon,
    category: "patients",
    label: { en: "Visit History", mm: "လာရောက်ခဲ့သမှုမှတ်တမ်း" },
  },
  get_patient_prescription_history: {
    icon: FileTextIcon,
    category: "patients",
    label: { en: "Prescription History", mm: "ဆေးညွှန်းမှတ်တမ်း" },
  },
  get_patient_kyp_brief: {
    icon: MagnifyingGlassIcon,
    category: "patients",
    label: { en: "Patient Intelligence Brief", mm: "လူနာ အသေးစိတ်သုံးသပ်ချက်" },
  },
  get_medicine_stock: {
    icon: ArchiveIcon,
    category: "inventory",
    label: { en: "Check Medicine Stock", mm: "ဆေးဝါးလက်ကျန် စစ်ဆေးရန်" },
  },
  get_low_stock_medicines: {
    icon: ExclamationTriangleIcon,
    category: "inventory",
    label: { en: "Low Stock Alerts", mm: "ဆေးဝါးလက်ကျန်နည်းသတိပေးချက်" },
  },
  get_expiring_batches: {
    icon: ClockIcon,
    category: "inventory",
    label: { en: "Expiring Batches", mm: "သက်တမ်းကုန်ခါနီးဆေးဝါးများ" },
  },
  create_follow_up_reminder: {
    icon: BellIcon,
    category: "reminders",
    label: { en: "Create Follow-up Reminder", mm: "နောက်ဆက်တွဲ သတိပေးချက်ဖန်တီးရန်" },
  },
  get_unread_notifications: {
    icon: BellIcon,
    category: "reminders",
    label: { en: "Recent Notifications", mm: "လတ်တလော အသိပေးချက်များ" },
  },
  update_appointment_status: {
    icon: Pencil2Icon,
    category: "appointments",
    label: { en: "Update Appointment Status", mm: "ချိန်းဆိုမှုအခြေအနေ ပြောင်းရန်" },
  },
  update_appointment_status_by_patient_name: {
    icon: Pencil2Icon,
    category: "appointments",
    label: { en: "Update Status by Patient Name", mm: "လူနာအမည်ဖြင့် အခြေအနေပြောင်းရန်" },
    confirm: true,
  },
  cancel_appointments_in_range: {
    icon: Cross2Icon,
    category: "appointments",
    label: { en: "Cancel Appointments in Range", mm: "အချိန်ကာလအတွင်း ချိန်းဆိုမှုများ ပယ်ဖျက်ရန်" },
    confirm: true,
    danger: true,
  },
  reschedule_appointments_in_range: {
    icon: ReloadIcon,
    category: "appointments",
    label: { en: "Reschedule Appointments in Range", mm: "အချိန်ကာလအတွင်း ချိန်းဆိုမှုများ ပြောင်းရန်" },
    confirm: true,
  },
  reschedule_today_appointments: {
    icon: ReloadIcon,
    category: "appointments",
    label: { en: "Reschedule All of Today", mm: "ယနေ့ ချိန်းဆိုမှုအားလုံး ပြောင်းရန်" },
    confirm: true,
  },
  bulk_update_today_appointments_status: {
    icon: CheckCircledIcon,
    category: "appointments",
    label: { en: "Bulk Update Today's Status", mm: "ယနေ့ချိန်းဆိုမှုများ တစ်ပြိုင်နက်ပြောင်းရန်" },
    confirm: true,
    danger: true,
  },
  get_prescription_templates: {
    icon: FileTextIcon,
    category: "prescriptions",
    label: { en: "Browse Prescription Templates", mm: "ဆေးညွှန်းပုံစံများ ကြည့်ရှုရန်" },
  },
  create_prescription_template: {
    icon: PlusCircledIcon,
    category: "prescriptions",
    label: { en: "Create Prescription Template", mm: "ဆေးညွှန်းပုံစံအသစ် ဖန်တီးရန်" },
  },
  delete_prescription_template: {
    icon: TrashIcon,
    category: "prescriptions",
    label: { en: "Delete Prescription Template", mm: "ဆေးညွှန်းပုံစံ ဖျက်ရန်" },
    confirm: true,
    danger: true,
  },
};

/** Field-name overrides for labels that humanizeKey would otherwise get slightly wrong. */
const FIELD_LABEL_OVERRIDES = {
  patientId: "Patient ID",
  appointmentId: "Appointment ID",
  diseaseId: "Disease ID",
  medicineId: "Medicine ID",
  templateId: "Template ID",
  dueInDays: "Due in (days)",
  startTime: "Start Time",
  endTime: "End Time",
  sourceStartTime: "Source Start Time",
  sourceEndTime: "Source End Time",
  targetStartTime: "New Start Time",
  patientName: "Patient Name",
  diseaseName: "Disease Name",
};

const FIELD_LABEL_OVERRIDES_MM = {
  patientId: "လူနာ ID",
  appointmentId: "ချိန်းဆိုမှု ID",
  diseaseId: "ရောဂါ ID",
  medicineId: "ဆေးဝါး ID",
  templateId: "ပုံစံ ID",
  dueInDays: "ရက်အကြာ",
  startTime: "အစအချိန်",
  endTime: "အဆုံးအချိန်",
  sourceStartTime: "မူလ အစအချိန်",
  sourceEndTime: "မူလ အဆုံးအချိန်",
  targetStartTime: "အသစ်ပြောင်းမည့်အချိန်",
  patientName: "လူနာအမည်",
  diseaseName: "ရောဂါအမည်",
};

/** Turn a camelCase JSON-schema key into a human label, e.g. "dueInDays" -> "Due In Days". */
export function humanizeKey(key, language = "en") {
  if (!key) return "";
  const overrides = language === "mm" ? FIELD_LABEL_OVERRIDES_MM : FIELD_LABEL_OVERRIDES;
  if (overrides[key]) return overrides[key];
  if (language === "mm") return key;

  const withSpaces = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();

  return withSpaces.replace(/\bId\b/g, "ID");
}

export function getToolMeta(toolName) {
  return TOOL_CATALOG[toolName] || null;
}

export function getToolLabel(tool, language = "en") {
  const meta = getToolMeta(tool?.name);
  if (meta?.label) return meta.label[language] || meta.label.en;
  return tool?.name || "";
}

export function getCategoryLabel(categoryKey, language = "en") {
  const entry = CATEGORY_LABELS[categoryKey];
  if (!entry) return categoryKey;
  return entry[language] || entry.en;
}

/** Time-ish string fields get quick-pick chips instead of forcing free typing. */
export const TIME_QUICK_PICKS = [
  { label: { en: "Today 09:00", mm: "ယနေ့ ၀၉:၀၀" }, value: "today at 09:00" },
  { label: { en: "Today 14:00", mm: "ယနေ့ ၁၄:၀၀" }, value: "today at 14:00" },
  { label: { en: "Tomorrow 09:00", mm: "မနက်ဖြန် ၀၉:၀၀" }, value: "tomorrow at 09:00" },
  { label: { en: "Tomorrow 14:00", mm: "မနက်ဖြန် ၁၄:၀၀" }, value: "tomorrow at 14:00" },
];

export function isTimeField(key) {
  return /time$/i.test(key);
}

/** Status-style enums get colored pills instead of a plain <select>. */
export const STATUS_PILL_STYLES = {
  pending: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
  confirmed: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
};

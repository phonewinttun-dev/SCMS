import {
  BellIcon,
  CheckIcon,
  DownloadIcon,
  ReloadIcon,
  ExclamationTriangleIcon,
} from "@radix-ui/react-icons";
import ResourcePage from "./ResourcePage";
import { useLanguage } from "../context/LanguageContext";
import { formatDate } from "../utils/format";
import {
  appointmentsApi,
  diseasesApi,
  followUpsApi,
  medicinesApi,
  notificationsApi,
  patientsApi,
  paymentsApi,
  prescriptionsApi,
} from "../services/scmsApi";

const idOf = (...keys) => (row) => keys.map((key) => row?.[key]).find(Boolean);
const asNumber = (value) => (value === "" || value == null ? null : Number(value));
const dateValue = (value) => (value ? formatDate(value) : "");
const money = (value) => `MMK ${Number(value || 0).toLocaleString()}`;

export function PatientsPage() {
  const { t } = useLanguage();
  return (
    <ResourcePage
      config={{
        title: t.patients,
        subtitle: "Patient profiles, contact information and clinic records.",
        list: patientsApi.list,
        create: patientsApi.create,
        getId: idOf("patientId", "id"),
        initialForm: { name: "", email: "", phone: "", gender: "", dateOfBirth: "", address: "" },
        toPayload: (form) => ({
          name: form.name,
          fullName: form.name,
          email: form.email,
          phone: form.phone,
          gender: form.gender,
          dateOfBirth: form.dateOfBirth || null,
          address: form.address,
        }),
        fields: [
          { name: "name", label: t.name, required: true },
          { name: "email", label: t.email, type: "email" },
          { name: "phone", label: t.phone },
          { name: "gender", label: "Gender" },
          { name: "dateOfBirth", label: "Date of birth", type: "date" },
          { name: "address", label: t.address, type: "textarea" },
        ],
        columns: [
          { label: t.name, key: (row) => row.name || row.fullName || row.patientName },
          { label: t.email, key: "email" },
          { label: t.phone, key: (row) => row.phone || row.phoneNumber },
          { label: t.address, key: "address" },
        ],
        rowActions: [
          {
            label: t.downloadPdf,
            download: true,
            run: (row) => patientsApi.summaryPdf(row.patientId || row.id),
            fileName: (row) => `patient-summary-${row.patientId || row.id}.pdf`,
          },
        ],
      }}
    />
  );
}

export function AppointmentsPage() {
  const { t } = useLanguage();
  return (
    <ResourcePage
      config={{
        title: t.appointments,
        subtitle: "Book appointments, manage queue status and update visit progress.",
        list: appointmentsApi.list,
        create: appointmentsApi.create,
        getId: idOf("appointmentId", "id"),
        initialForm: { patientId: "", datetime: "", notes: "" },
        toPayload: (form) => ({
          patientId: asNumber(form.patientId),
          datetime: form.datetime ? `${form.datetime}:00` : null,
          notes: form.notes,
        }),
        fields: [
          { name: "patientId", label: "Patient ID", type: "number", required: true },
          { name: "datetime", label: "Date and time", type: "datetime-local", required: true },
          { name: "notes", label: t.notes, type: "textarea" },
        ],
        columns: [
          { label: t.patient, key: (row) => row.patientName || row.patient?.name || row.patientId },
          { label: t.date, key: (row) => dateValue(row.datetime || row.appointmentDate || row.date) },
          { label: t.notes, key: "notes" },
          { label: t.status, key: (row) => row.status || row.appointmentStatus, type: "status" },
        ],
        extraHeaderActions: [
          {
            label: t.callNext,
            icon: <ReloadIcon className="w-4 h-4" />,
            primary: true,
            run: appointmentsApi.callNext,
            success: "Next appointment called.",
          },
        ],
        rowActions: [
          {
            label: t.complete,
            icon: <CheckIcon className="w-4 h-4" />,
            run: (row) => appointmentsApi.updateStatus(row.appointmentId || row.id, { status: "completed", notes: row.notes || "" }),
          },
        ],
      }}
    />
  );
}

export function MedicinesPage() {
  const { t } = useLanguage();
  return (
    <ResourcePage
      config={{
        title: t.medicines,
        subtitle: "Medicine catalog, stock visibility, batches and inventory warnings.",
        list: medicinesApi.list,
        create: medicinesApi.create,
        update: medicinesApi.update,
        remove: medicinesApi.remove,
        getId: idOf("medicineId", "id"),
        initialForm: { name: "", description: "", unitPrice: "", categoryId: "" },
        toForm: (row) => ({
          name: row.name || row.medicineName || "",
          description: row.description || "",
          unitPrice: row.unitPrice || "",
          categoryId: row.categoryId || "",
        }),
        toPayload: (form) => ({
          name: form.name,
          description: form.description,
          unitPrice: Number(form.unitPrice || 0),
          categoryId: asNumber(form.categoryId),
        }),
        fields: [
          { name: "name", label: t.name, required: true },
          { name: "unitPrice", label: t.price, type: "number", required: true },
          { name: "categoryId", label: "Category ID", type: "number" },
          { name: "description", label: t.description, type: "textarea" },
        ],
        columns: [
          { label: t.name, key: (row) => row.name || row.medicineName },
          { label: t.category, key: (row) => row.categoryName || row.categoryId },
          { label: t.price, key: (row) => money(row.unitPrice || row.price) },
          { label: t.stock, key: (row) => row.totalStock ?? row.stock ?? "-" },
        ],
        extraHeaderActions: [
          {
            label: t.quarantineExpired,
            icon: <ExclamationTriangleIcon className="w-4 h-4" />,
            run: medicinesApi.quarantineExpired,
            success: "Expired batches quarantined.",
          },
        ],
      }}
    />
  );
}

export function DiseasesPage() {
  const { t } = useLanguage();
  return (
    <ResourcePage
      config={{
        title: t.diseases,
        subtitle: "Diagnosis and disease reference data.",
        list: diseasesApi.list,
        create: diseasesApi.create,
        update: (_id, payload) => diseasesApi.update(payload),
        remove: diseasesApi.remove,
        getId: idOf("diseaseId", "id"),
        initialForm: { id: "", name: "", description: "" },
        toForm: (row) => ({ id: row.id || row.diseaseId, name: row.name || row.diseaseName || "", description: row.description || "" }),
        toPayload: (form, editing) => ({
          id: Number(form.id || editing?.id || editing?.diseaseId || 0),
          name: form.name,
          description: form.description,
        }),
        fields: [
          { name: "name", label: t.name, required: true },
          { name: "description", label: t.description, type: "textarea" },
        ],
        columns: [
          { label: t.name, key: (row) => row.name || row.diseaseName },
          { label: t.description, key: "description" },
        ],
      }}
    />
  );
}

export function PrescriptionsPage() {
  const { t } = useLanguage();
  return (
    <ResourcePage
      config={{
        title: t.prescriptions,
        subtitle: "Prescription records and downloadable PDFs.",
        list: prescriptionsApi.list,
        getId: idOf("prescriptionId", "id"),
        fields: [],
        columns: [
          { label: t.patient, key: (row) => row.patientName || row.patientId },
          { label: "Disease", key: (row) => row.diseaseName || row.diseaseId },
          { label: t.date, key: (row) => dateValue(row.createdAt || row.date) },
          { label: t.notes, key: "notes" },
        ],
        rowActions: [
          {
            label: t.downloadPdf,
            download: true,
            icon: <DownloadIcon className="w-4 h-4" />,
            run: (row) => prescriptionsApi.pdf(row.prescriptionId || row.id),
            fileName: (row) => `prescription-${row.prescriptionId || row.id}.pdf`,
          },
        ],
      }}
    />
  );
}

export function PaymentsPage() {
  const { t } = useLanguage();
  return (
    <ResourcePage
      config={{
        title: t.payments,
        subtitle: "Review payments, approve manual proofs and download invoices.",
        list: paymentsApi.list,
        getId: idOf("paymentId", "id"),
        fields: [],
        columns: [
          { label: t.patient, key: (row) => row.patientName || row.patientId },
          { label: "Amount", key: (row) => money(row.amount || row.totalAmount) },
          { label: t.date, key: (row) => dateValue(row.paidAt || row.createdAt || row.date) },
          { label: t.status, key: "status", type: "status" },
        ],
        rowActions: [
          { label: t.approve, icon: <CheckIcon className="w-4 h-4" />, run: (row) => paymentsApi.approve(row.paymentId || row.id) },
          {
            label: t.downloadPdf,
            download: true,
            run: (row) => paymentsApi.invoicePdf(row.paymentId || row.id),
            fileName: (row) => `invoice-${row.paymentId || row.id}.pdf`,
          },
        ],
      }}
    />
  );
}

export function FollowUpsPage() {
  const { t } = useLanguage();
  return (
    <ResourcePage
      config={{
        title: t.followUps,
        subtitle: "Follow-up tasks and patient revisit reminders.",
        list: followUpsApi.list,
        create: followUpsApi.create,
        getId: idOf("followUpId", "id"),
        initialForm: { appointmentId: "", patientId: "", dueDate: "", note: "" },
        toPayload: (form) => ({
          appointmentId: asNumber(form.appointmentId),
          patientId: asNumber(form.patientId),
          dueDate: form.dueDate || null,
          note: form.note,
          notes: form.note,
        }),
        fields: [
          { name: "appointmentId", label: "Appointment ID", type: "number" },
          { name: "patientId", label: "Patient ID", type: "number", required: true },
          { name: "dueDate", label: "Due date", type: "date" },
          { name: "note", label: t.notes, type: "textarea" },
        ],
        columns: [
          { label: t.patient, key: (row) => row.patientName || row.patientId },
          { label: t.date, key: (row) => dateValue(row.dueDate || row.followUpDate) },
          { label: t.notes, key: (row) => row.note || row.notes },
          { label: t.status, key: "status", type: "status" },
        ],
        rowActions: [{ label: t.complete, icon: <CheckIcon className="w-4 h-4" />, run: (row) => followUpsApi.complete(row.followUpId || row.id) }],
      }}
    />
  );
}

export function NotificationsPage() {
  const { t } = useLanguage();
  return (
    <ResourcePage
      config={{
        title: t.notifications,
        subtitle: "Broadcast and manage clinic notifications.",
        list: () => notificationsApi.list({ includeAll: true }),
        create: notificationsApi.create,
        getId: idOf("notificationId", "id"),
        initialForm: { title: "", message: "", actionRoute: "", userId: "" },
        toPayload: (form) => ({
          title: form.title,
          description: form.message,
          actionRoute: form.actionRoute || null,
          userId: asNumber(form.userId),
        }),
        fields: [
          { name: "title", label: "Title", required: true },
          { name: "userId", label: "User ID (optional, empty for broadcast)", type: "number" },
          { name: "actionRoute", label: "Action Route (optional)" },
          { name: "message", label: "Message", type: "textarea", required: true },
        ],
        columns: [
          { label: "Title", key: "title" },
          { label: "Message", key: (row) => row.description || row.message },
          { label: "Recipient", key: (row) => (row.userId ? `User #${row.userId}` : "Broadcast") },
          { label: "Route", key: (row) => row.actionRoute || "-" },
          { label: t.status, key: (row) => (row.isRead || row.read ? "read" : "unread"), type: "status" },
        ],
        rowActions: [{ label: t.markRead, icon: <BellIcon className="w-4 h-4" />, run: (row) => notificationsApi.read(row.notificationId || row.id) }],
      }}
    />
  );
}

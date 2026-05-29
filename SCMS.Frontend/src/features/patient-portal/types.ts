export interface ApiResult<T> {
  isSuccess: boolean;
  message: string;
  data?: T;
}

export interface PagedApiResult<T> extends ApiResult<T[]> {
  pagination?: {
    pageNumber: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

export interface AuthUser {
  userId: number;
  name: string;
  email?: string;
  mobileNo?: string;
  roles: string[];
}

export interface PatientProfile {
  patientId: number;
  userId: number;
  name: string;
  mobileNo?: string;
  email?: string;
}

export interface AppointmentDetails {
  id: number;
  appointmentCode: string;
  patientId: number;
  patientName: string;
  datetime: string;
  status: string;
  notes?: string;
  tokenNumber: number;
  clinicDoctorName: string;
  createdAt: string;
}

export interface QueueStatusData {
  patientTokenNumber: number;
  currentActiveTokenNumber: number;
  patientsAhead: number;
  queueMessage: string;
  estimatedWaitTimeMinutes: number;
  doctorStatus: string;
  progressBarPercentage: number;
  isYourTurn: boolean;
}

export interface PrescriptionItem {
  id: number;
  medicineName: string;
  dosage?: string;
  days: number;
  quantity: number;
  instruction?: string;
}

export interface Prescription {
  id: number;
  appointmentId: number;
  appointmentCode: string;
  patientId: number;
  patientName: string;
  diseaseName?: string;
  items: PrescriptionItem[];
  createdAt: string;
}

export interface UnpaidInvoice {
  paymentId: number;
  appointmentId: number;
  appointmentCode: string;
  amount: number;
  tax: number;
  charges: number;
  paymentStatus: string;
  paymentMethod: string;
}

export interface PatientDashboard {
  patientProfiles: PatientProfile[];
  upcomingAppointments: AppointmentDetails[];
  prescriptionHistory: Prescription[];
  outstandingBalances: UnpaidInvoice[];
}

export interface NotificationItem {
  id: number;
  title: string;
  description?: string;
  actionRoute?: string;
  createdAt: string;
}

export interface LabReportItem {
  id: number;
  testName?: string;
  name?: string;
  result?: string;
  status?: string;
  createdAt?: string;
}

export type SheetId =
  | "book"
  | "queue"
  | "records"
  | "pay"
  | "notif"
  | "appts"
  | null;

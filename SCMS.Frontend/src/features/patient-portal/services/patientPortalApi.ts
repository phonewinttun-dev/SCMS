import api from "../../../services/api";
import type {
  ApiResult,
  AppointmentDetails,
  LabReportItem,
  NotificationItem,
  PatientDashboard,
  PagedApiResult,
  Prescription,
  QueueStatusData,
} from "../types";

const unwrap = <T,>(result: ApiResult<T>): T => {
  if (!result?.isSuccess) {
    throw new Error(result?.message || "Request failed");
  }
  return result.data as T;
};

export const fetchPatientDashboard = async (): Promise<PatientDashboard> => {
  const { data } = await api.get<ApiResult<PatientDashboard>>(
    "/Dashboards/patient-dashboard",
  );
  return unwrap(data);
};

export const fetchAppointments = async (
  patientId?: number,
): Promise<AppointmentDetails[]> => {
  const { data } = await api.get<PagedApiResult<AppointmentDetails>>(
    "/Appointments",
    {
      params: {
        patientId,
        pageNumber: 1,
        pageSize: 50,
      },
    },
  );
  if (!data.isSuccess) {
    throw new Error(data.message);
  }
  return data.data ?? [];
};

export const bookAppointment = async (payload: {
  patientId: number;
  datetime: string;
  notes?: string;
}) => {
  const { data } = await api.post<ApiResult<unknown>>("/Appointments", payload);
  return unwrap(data);
};

export const fetchQueueStatus = async (
  appointmentId: number,
): Promise<QueueStatusData> => {
  const { data } = await api.get<ApiResult<QueueStatusData>>(
    `/Appointments/${appointmentId}/queue-status`,
  );
  return unwrap(data);
};

export const fetchPrescriptions = async (
  patientId?: number,
): Promise<Prescription[]> => {
  const { data } = await api.get<PagedApiResult<Prescription>>(
    "/Prescriptions",
    {
      params: { patientId, pageNumber: 1, pageSize: 50 },
    },
  );
  if (!data.isSuccess) {
    throw new Error(data.message);
  }
  return data.data ?? [];
};

export const fetchNotifications = async (): Promise<NotificationItem[]> => {
  const { data } = await api.get<PagedApiResult<NotificationItem>>(
    "/Notifications",
    { params: { pageNumber: 1, pageSize: 30 } },
  );
  if (!data.isSuccess) {
    throw new Error(data.message);
  }
  return data.data ?? [];
};

export const fetchLabReports = async (
  patientId: number,
): Promise<LabReportItem[]> => {
  try {
    const { data } = await api.get<ApiResult<LabReportItem[]>>(
      `/Patients/${patientId}/lab-reports`,
    );
    return unwrap(data);
  } catch {
    const { data } = await api.get<PagedApiResult<LabReportItem>>(
      "/LabReports",
      { params: { pageNumber: 1, pageSize: 50 } },
    );
    if (!data.isSuccess) {
      return [];
    }
    return data.data ?? [];
  }
};

export const downloadPrescriptionPdf = async (prescriptionId: number) => {
  const response = await api.get(`/Prescriptions/${prescriptionId}/pdf`, {
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.download = `prescription-${prescriptionId}.pdf`;
  link.click();
  window.URL.revokeObjectURL(url);
};

export const submitManualPayment = async (payload: {
  appointmentId: number;
  paymentMethod: string;
  amount: number;
  screenshotUrl: string;
}) => {
  const { data } = await api.post<ApiResult<unknown>>(
    "/Payments/manual-proof",
    {
      appointmentId: payload.appointmentId,
      paymentMethod: payload.paymentMethod,
      amount: payload.amount,
      screenshotUrl: payload.screenshotUrl,
    },
  );
  return unwrap(data);
};

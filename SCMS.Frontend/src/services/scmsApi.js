import api from "./api";

const unwrap = (response) => response.data;

const scmsApi = {
  auth: {
    register: (payload) => api.post("/Auth/register", payload).then(unwrap),
    login: (payload) => api.post("/Auth/login", payload).then(unwrap),
    refresh: (payload) => api.post("/Auth/refresh", payload).then(unwrap),
  },

  dashboard: {
    admin: () => api.get("/Dashboards/dashboard").then(unwrap),
    patient: () => api.get("/Dashboards/patient-dashboard").then(unwrap),
  },

  appointments: {
    create: (payload) => api.post("/Appointments", payload).then(unwrap),
    list: () => api.get("/Appointments").then(unwrap),
    updateStatus: (id, payload) =>
      api.patch(`/Appointments/${id}/status`, payload).then(unwrap),
    reschedule: (id, payload) =>
      api.post(`/Appointments/${id}/reschedule`, payload).then(unwrap),
    queueStatus: (id) =>
      api.get(`/Appointments/${id}/queue-status`).then(unwrap),
    callNext: () => api.post("/Appointments/call-next").then(unwrap),
  },

  patients: {
    create: (payload) => api.post("/Patients", payload).then(unwrap),
    list: () => api.get("/Patients").then(unwrap),
    detail: (id) => api.get(`/Patients/patients/${id}`).then(unwrap),
    history: (id) => api.get(`/Patients/${id}/history`).then(unwrap),
    summary: (id) => api.get(`/Patients/${id}/summary`).then(unwrap),
    summaryHtml: (id) => api.get(`/Patients/${id}/summary/html`).then(unwrap),
    summaryPdf: (id) =>
      api.get(`/Patients/${id}/summary/pdf`, { responseType: "blob" }),
    labReports: (id) => api.get(`/Patients/${id}/lab-reports`).then(unwrap),
  },

  diseases: {
    list: () => api.get("/Diseases").then(unwrap),
    create: (payload) => api.post("/Diseases", payload).then(unwrap),
    update: (payload) => api.put("/Diseases", payload).then(unwrap),
    remove: (id) => api.delete(`/Diseases/${id}`).then(unwrap),
  },

  followUps: {
    list: () => api.get("/FollowUps").then(unwrap),
    create: (payload) => api.post("/FollowUps", payload).then(unwrap),
    complete: (id) => api.post(`/FollowUps/${id}/complete`).then(unwrap),
  },

  labReports: {
    create: (payload) => api.post("/LabReports", payload).then(unwrap),
    submitResult: (id, payload) =>
      api.post(`/LabReports/${id}/result`, payload).then(unwrap),
    list: () => api.get("/LabReports").then(unwrap),
    pdf: (id) => api.get(`/LabReports/${id}/pdf`, { responseType: "blob" }),
  },

  medicines: {
    list: () => api.get("/Medicines").then(unwrap),
    create: (payload) => api.post("/Medicines", payload).then(unwrap),
    update: (id, payload) => api.put(`/Medicines/${id}`, payload).then(unwrap),
    remove: (id) => api.delete(`/Medicines/${id}`).then(unwrap),
    categories: () => api.get("/Medicines/categories").then(unwrap),
    quarantineExpired: () =>
      api.post("/Medicines/quarantine-expired").then(unwrap),
    alerts: () => api.get("/Medicines/alerts").then(unwrap),
    batches: () => api.get("/Medicines/batches").then(unwrap),
    batchDetail: (id) => api.get(`/Medicines/batches/${id}`).then(unwrap),
    updateBatch: (id, payload) =>
      api.put(`/Medicines/batches/${id}`, payload).then(unwrap),
    removeBatch: (id) => api.delete(`/Medicines/batches/${id}`).then(unwrap),
  },

  notifications: {
    list: () => api.get("/Notifications").then(unwrap),
    create: (payload) => api.post("/Notifications", payload).then(unwrap),
    markAsRead: (id) => api.post(`/Notifications/${id}/read`).then(unwrap),
  },

  payments: {
    list: () => api.get("/Payments").then(unwrap),
    gatewayCallback: (payload) =>
      api.post("/Payments/gateway-callback", payload).then(unwrap),
    manualProof: (payload) =>
      api.post("/Payments/manual-proof", payload).then(unwrap),
    approve: (id) => api.post(`/Payments/${id}/approve`).then(unwrap),
    invoicePdf: (id) =>
      api.get(`/Payments/${id}/invoice/pdf`, { responseType: "blob" }),
  },

  prescriptions: {
    list: () => api.get("/Prescriptions").then(unwrap),
    create: (payload) => api.post("/Prescriptions", payload).then(unwrap),
    detail: (id) => api.get(`/Prescriptions/prescriptions/${id}`).then(unwrap),
    templates: () => api.get("/Prescriptions/templates").then(unwrap),
    createTemplate: (payload) =>
      api.post("/Prescriptions/templates", payload).then(unwrap),
    pdf: (id) => api.get(`/Prescriptions/${id}/pdf`, { responseType: "blob" }),
  },
};

export default scmsApi;

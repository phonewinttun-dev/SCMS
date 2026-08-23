import api, { unwrap } from "./api";

const toQuery = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== "" && value != null));

export const authApi = {
  register: (payload) => api.post("/Auth/register", payload).then(unwrap),
  login: (payload) => api.post("/Auth/login", payload).then(unwrap),
  refresh: (payload) => api.post("/Auth/refresh", payload).then(unwrap),
  logout: (payload = {}) => api.post("/Auth/logout", payload).then(unwrap),
};

export const dashboardsApi = {
  admin: (params) => api.get("/Dashboards/dashboard", { params: toQuery(params) }).then(unwrap),
  patient: () => api.get("/Dashboards/patient-dashboard").then(unwrap),
};

export const appointmentsApi = {
  list: (params) => api.get("/Appointments", { params: toQuery(params) }).then(unwrap),
  create: (payload) => api.post("/Appointments", payload).then(unwrap),
  updateStatus: (id, payload) => api.patch(`/Appointments/${id}/status`, payload).then(unwrap),
  reschedule: (id, payload) => api.post(`/Appointments/${id}/reschedule`, payload).then(unwrap),
  queueStatus: (id) => api.get(`/Appointments/${id}/queue-status`).then(unwrap),
  callNext: () => api.post("/Appointments/call-next").then(unwrap),
};

export const patientsApi = {
  list: (params) => api.get("/Patients", { params: toQuery(params) }).then(unwrap),
  search: (params) => api.get("/Patients/search", { params: toQuery(params) }).then(unwrap),
  create: (payload) => api.post("/Patients", payload).then(unwrap),
  update: (id, payload) => api.put(`/Patients/${id}`, payload).then(unwrap),
  get: (id) => api.get(`/Patients/patients/${id}`).then(unwrap),
  history: (id) => api.get(`/Patients/${id}/history`).then(unwrap),
  summary: (id) => api.get(`/Patients/${id}/summary`).then(unwrap),
  summaryHtml: (id) => api.get(`/Patients/${id}/summary/html`).then(unwrap),
  summaryPdf: (id) => api.get(`/Patients/${id}/summary/pdf`, { responseType: "blob" }),
  delete: (id) => api.delete(`/Patients/${id}`).then(unwrap),
  remove: (id) => api.delete(`/Patients/${id}`).then(unwrap),
};

export const prescriptionsApi = {
  list: (params) => api.get("/Prescriptions", { params: toQuery(params) }).then(unwrap),
  create: (payload) => api.post("/Prescriptions", payload).then(unwrap),
  get: (id) => api.get(`/Prescriptions/prescriptions/${id}`).then(unwrap),
  saveTemplate: (payload) => api.post("/Prescriptions/templates", payload).then(unwrap),
  templates: (params) => api.get("/Prescriptions/templates", { params: toQuery(params) }).then(unwrap),
  deleteTemplate: (id) => api.delete(`/Prescriptions/templates/${id}`).then(unwrap),
  pdf: (id) => api.get(`/Prescriptions/${id}/pdf`, { responseType: "blob" }),
};

export const medicinesApi = {
  list: (params) => api.get("/Medicines", { params: toQuery(params) }).then(unwrap),
  search: (params) => api.get("/Medicines/search", { params: toQuery(params) }).then(unwrap),
  create: (payload) => api.post("/Medicines", payload, { headers: { "Content-Type": "multipart/form-data" } }).then(unwrap),
  update: (id, payload) => api.put(`/Medicines/${id}`, payload, { headers: { "Content-Type": "multipart/form-data" } }).then(unwrap),
  delete: (id) => api.delete(`/Medicines/${id}`).then(unwrap),
  remove: (id) => api.delete(`/Medicines/${id}`).then(unwrap),
  categories: () => api.get("/Medicines/categories").then(unwrap),
  quarantineExpired: () => api.post("/Medicines/quarantine-expired").then(unwrap),
  alerts: () => api.get("/Medicines/alerts").then(unwrap),
  batches: (params) => api.get("/Medicines/batches", { params: toQuery(params) }).then(unwrap),
  searchBatches: (params) => api.get("/Medicines/batches/search", { params: toQuery(params) }).then(unwrap),
  batch: (id) => api.get(`/Medicines/batches/${id}`).then(unwrap),
  createBatch: (payload) => api.post("/Medicines/batches", payload).then(unwrap),
  updateBatch: (id, payload) => api.put(`/Medicines/batches/${id}`, payload).then(unwrap),
  deleteBatch: (id) => api.delete(`/Medicines/batches/${id}`).then(unwrap),
};

export const diseasesApi = {
  list: (params) => api.get("/Diseases", { params: toQuery(params) }).then(unwrap),
  search: (params) => api.get("/Diseases/search", { params: toQuery(params) }).then(unwrap),
  create: (payload) => api.post("/Diseases", payload).then(unwrap),
  update: (payload) => api.put("/Diseases", payload).then(unwrap),
  delete: (id) => api.delete(`/Diseases/${id}`).then(unwrap),
  remove: (id) => api.delete(`/Diseases/${id}`).then(unwrap),
};

export const paymentsApi = {
  list: (params) => api.get("/Payments", { params: toQuery(params) }).then(unwrap),
  search: (params) => api.get("/Payments/search", { params: toQuery(params) }).then(unwrap),
  get: (id) => api.get(`/Payments/${id}`).then(unwrap),
  gatewayCallback: (payload) => api.post("/Payments/gateway-callback", payload).then(unwrap),
  manualProof: (payload) =>
    api
      .post(
        "/Payments/manual-proof",
        payload,
        payload instanceof FormData ? { headers: { "Content-Type": "multipart/form-data" } } : undefined
      )
      .then(unwrap),
  approve: (id) => api.post(`/Payments/${id}/approve`).then(unwrap),
  invoicePdf: (id) => api.get(`/Payments/${id}/invoice/pdf`, { responseType: "blob" }),
};

export const usersApi = {
  list: (params) => api.get("/Users", { params: toQuery(params) }).then(unwrap),
  search: (params) => api.get("/Users/search", { params: toQuery(params) }).then(unwrap),
  get: (id) => api.get(`/Users/${id}`).then(unwrap),
  createStaff: (payload) => api.post("/Users/staff", payload).then(unwrap),
  updateRoles: (id, payload) => api.put(`/Users/${id}/roles`, payload).then(unwrap),
  delete: (id) => api.delete(`/Users/${id}`).then(unwrap),
  remove: (id) => api.delete(`/Users/${id}`).then(unwrap),
};

export const followUpsApi = {
  list: (params) => api.get("/FollowUps", { params: toQuery(params) }).then(unwrap),
  create: (payload) => api.post("/FollowUps", payload).then(unwrap),
  complete: (id) => api.post(`/FollowUps/${id}/complete`).then(unwrap),
};

export const notificationsApi = {
  list: (params) => api.get("/Notifications", { params: toQuery(params) }).then(unwrap),
  create: (payload) => api.post("/Notifications", payload).then(unwrap),
  read: (id) => api.post(`/Notifications/${id}/read`).then(unwrap),
};

export const reportsApi = {
  appointments: (params) => api.get("/Reports/appointments", { params: toQuery(params) }).then(unwrap),
  appointmentPdf: (params) => api.get("/Reports/appointments/pdf", { params: toQuery(params), responseType: "blob" }),
  revenue: (params) => api.get("/Reports/revenue", { params: toQuery(params) }).then(unwrap),
  revenuePdf: (params) => api.get("/Reports/revenue/pdf", { params: toQuery(params), responseType: "blob" }),
  patients: (params) => api.get("/Reports/patients", { params: toQuery(params) }).then(unwrap),
  patientsPdf: (params) => api.get("/Reports/patients/pdf", { params: toQuery(params), responseType: "blob" }),
  medicineStock: (params) => api.get("/Reports/medicine-stock", { params: toQuery(params) }).then(unwrap),
  medicineStockPdf: (params) => api.get("/Reports/medicine-stock/pdf", { params: toQuery(params), responseType: "blob" }),
  followUps: (params) => api.get("/Reports/follow-ups", { params: toQuery(params) }).then(unwrap),
  followUpsPdf: (params) => api.get("/Reports/follow-ups/pdf", { params: toQuery(params), responseType: "blob" }),
  prescriptions: (params) => api.get("/Reports/prescriptions", { params: toQuery(params) }).then(unwrap),
  prescriptionsPdf: (params) => api.get("/Reports/prescriptions/pdf", { params: toQuery(params), responseType: "blob" }),
  businessSummary: (params) => api.get("/Reports/business-summary", { params: toQuery(params) }).then(unwrap),
  businessSummaryPdf: (params) => api.get("/Reports/business-summary/pdf", { params: toQuery(params), responseType: "blob" }),
};

export const mcpApi = {
  tools: () => api.get("/mcp/tools").then(unwrap),
  callTool: (payload) => api.post("/mcp/tools/call", payload).then(unwrap),
  chat: (payload) => api.post("/mcp/chat", payload).then(unwrap),
};

export const downloadBlob = (response, fileName) => {
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};

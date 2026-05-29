import axios from "axios";

const api = axios.create({
  // baseURL: "http://localhost:8080/api",
  baseURL: 'http://localhost:5140/api',
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.clear();
      const path = window.location.pathname;
      window.location.href = path.startsWith("/patient-portal")
        ? "/patient-portal"
        : "/login";
      window.location.href = "/login";
    }

    return Promise.reject(error);
  },
);

export default api;

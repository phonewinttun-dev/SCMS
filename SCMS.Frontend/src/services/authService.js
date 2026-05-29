import api from "./api";

/**
 * Unwrap SCMS Result<T> envelope from API responses.
 */
const unwrapResult = (result) => {
  if (!result?.isSuccess) {
    const error = new Error(result?.message || "Request failed");
    error.response = { data: result };
    throw error;
  }
  return result.data;
};

const persistSession = (auth) => {
  const role = auth.user?.roles?.[0]?.toLowerCase() ?? "patient";
  localStorage.setItem("token", auth.accessToken);
  localStorage.setItem("refreshToken", auth.refreshToken);
  localStorage.setItem("userRole", role);
  localStorage.setItem("userName", auth.user?.name ?? "");
  localStorage.setItem("userId", String(auth.user?.userId ?? ""));
  return { token: auth.accessToken, refreshToken: auth.refreshToken, role, user: auth.user };
};

/**
 * Mobile or email + password login.
 * @param {{ mobileNo?: string, emailOrMobile?: string, password: string }} credentials
 */
export const loginAPI = async (credentials) => {
  const response = await api.post("/Auth/login", {
    emailOrMobile: credentials.emailOrMobile ?? credentials.mobileNo,
    password: credentials.password,
  });
  const auth = unwrapResult(response.data);
  return persistSession(auth);
};

/**
 * Patient account registration.
 * @param {{ name: string, mobileNo?: string, email?: string, password: string }} userData
 */
export const registerAPI = async (userData) => {
  const mobile = userData.mobileNo?.trim();
  const email =
    userData.email?.trim() ||
    (mobile ? `${mobile.replace(/\D/g, "")}@patient.scms` : "");

  const response = await api.post("/Auth/register", {
    name: userData.name,
    mobileNo: mobile,
    email,
    password: userData.password,
  });
  const auth = unwrapResult(response.data);
  return persistSession(auth);
};

export const logoutAPI = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("userRole");
  localStorage.removeItem("userName");
  localStorage.removeItem("userId");
};

export const isAuthenticated = () => Boolean(localStorage.getItem("token"));

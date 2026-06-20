import { createContext, useContext, useMemo, useState } from "react";
import { authApi } from "../services/scmsApi";

const AuthContext = createContext(null);

const readJson = (key, fallback = null) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const pickToken = (data) =>
  data?.accessToken ||
  data?.access_token ||
  data?.token ||
  data?.data?.accessToken ||
  data?.data?.access_token ||
  data?.data?.token ||
  data?.result?.accessToken ||
  data?.result?.token ||
  "";

const pickUser = (data, email) => {
  const user = data?.user || data?.data?.user || data?.result?.user || {};
  const roles = user?.roles || data?.roles || data?.data?.roles || [];

  return {
    ...user,
    email: user?.email || email,
    roles: roles.map((role) => String(role).toLowerCase()),
    role: String(roles?.[0] || user?.role || data?.role || "user").toLowerCase(),
  };
};

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("scms_token") || localStorage.getItem("token") || "");
  const [user, setUser] = useState(readJson("scms_user", null));

  const login = async ({ emailOrMobile, email, password }) => {
    const loginId = emailOrMobile || email;
    const data = await authApi.login({
      emailOrMobile: loginId,
      password: password,
    });
    const nextToken = pickToken(data);

    if (!nextToken) {
      throw new Error("Token not found in login response.");
    }

    const nextUser = pickUser(data, loginId);
    localStorage.setItem("scms_token", nextToken);
    localStorage.setItem("token", nextToken);
    localStorage.setItem("scms_user", JSON.stringify(nextUser));
    localStorage.setItem("userRole", nextUser.role);
    setToken(nextToken);
    setUser(nextUser);

    return nextUser;
  };

  const register = async (payload) => authApi.register(payload);

  const logout = () => {
    localStorage.removeItem("scms_token");
    localStorage.removeItem("token");
    localStorage.removeItem("scms_user");
    localStorage.removeItem("userRole");
    setToken("");
    setUser(null);
  };

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token),
      login,
      logout,
      register,
    }),
    [token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

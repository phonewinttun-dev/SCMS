import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Route protection wrapper enforcing authentication and role-based access control.
 * Prevents unauthorized URL skipping across Doctor, Patient, and Admin portals.
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = String(user?.role || "").toLowerCase();
    const userRoles = Array.isArray(user?.roles)
      ? user.roles.map((r) => String(r).toLowerCase())
      : [userRole];

    const isAllowed = allowedRoles.some((allowed) => {
      const target = String(allowed).toLowerCase();
      return userRoles.includes(target) || userRole === target;
    });

    if (!isAllowed) {
      // User is authenticated but unauthorized for this workspace.
      // Redirect safely to their own authorized portal.
      if (
        userRoles.includes("owner") ||
        userRoles.includes("admin") ||
        userRoles.includes("staff") ||
        userRole === "owner" ||
        userRole === "admin" ||
        userRole === "staff"
      ) {
        return <Navigate to="/app/dashboard" replace />;
      }
      if (userRoles.includes("doctor") || userRole === "doctor") {
        return <Navigate to="/doctor/dashboard" replace />;
      }
      if (userRoles.includes("user") || userRoles.includes("patient") || userRole === "user" || userRole === "patient") {
        return <Navigate to="/user/dashboard" replace />;
      }
      return <Navigate to="/app/dashboard" replace />;
    }
  }

  return children;
}

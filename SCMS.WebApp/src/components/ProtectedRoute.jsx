import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const staffRoles = ["owner", "admin", "doctor"];

const homeForRole = (role) => (staffRoles.includes(role) ? "/app/dashboard" : "/user/dashboard");

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const role = String(user?.role || "user").toLowerCase();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to={homeForRole(role)} replace />;
  }

  return children;
}

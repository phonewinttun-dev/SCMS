import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./features/auth/pages/Login";
import Register from "./features/auth/pages/Register";
import NotFound from "./pages/NotFound";
import PatientPortal from "./pages/PatientPortal";

import AdminLayout from "./features/admin/components/AdminLayout";
import AdminDashboard from "./features/admin/components/AdminDashboard";

import Patients from "./features/patients/Patients";
import Appointments from "./features/appointments/Appointment";
import Prescriptions from "./features/prescriptions/Prescriptions";
import FollowUps from "./features/followUps/FollowUps";
import Payments from "./features/payments/Payments";
import Notification from "./features/noti/Notification";
import Medicines from "./features/medicines/Medicines";
import Disease from "./features/disease/Disease";
import Documents from "./features/document/Documents";

const SplashScreen = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
    <div className="animate-bounce h-16 w-16 bg-indigo-600 text-white font-black text-2xl rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 mb-4">
      S
    </div>
    <h1 className="text-xl font-bold text-gray-800 tracking-wider animate-pulse">
      SCMS PORTAL LOADING...
    </h1>
  </div>
);

function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsAuthenticated(Boolean(token));

    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  if (isInitializing) {
    return <SplashScreen />;
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate to="/admin/dashboard" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="patients" element={<Patients />} />
        <Route path="appointments" element={<Appointments />} />
        <Route path="prescriptions" element={<Prescriptions />} />
        <Route path="followups" element={<FollowUps />} />
        <Route path="payments" element={<Payments />} />
        <Route path="notifications" element={<Notification />} />
        <Route path="medicines" element={<Medicines />} />
        <Route path="diseases" element={<Disease />} />
        <Route path="documents" element={<Documents />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;

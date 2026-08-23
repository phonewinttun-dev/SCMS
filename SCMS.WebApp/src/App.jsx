import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import DoctorShell from "./components/DoctorShell";
import ProtectedRoute from "./components/ProtectedRoute";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import {
  FollowUpsPage,
  NotificationsPage,
} from "./pages/FeaturePages";
import PatientsPage from "./pages/PatientsPage";
import AppointmentsPage from "./pages/AppointmentsPage";
import MedicinesPage from "./pages/MedicinesPage";
import BatchesPage from "./pages/BatchesPage";
import DiseasesPage from "./pages/DiseasesPage";
import PrescriptionsPage from "./pages/PrescriptionsPage";
import PaymentsPage from "./pages/PaymentsPage";
import NotFound from "./pages/NotFound";
import Reports from "./pages/Reports";
import AiAssistant from "./pages/AiAssistant";

// Doctor Workspace Pages
import DoctorDashboard from "./pages/doctor/DoctorDashboard";
import DoctorAppointments from "./pages/doctor/DoctorAppointments";
import DoctorConsultation from "./pages/doctor/DoctorConsultation";
import DoctorPatients from "./pages/doctor/DoctorPatients";
import DoctorPrescriptions from "./pages/doctor/DoctorPrescriptions";
import DoctorFollowUps from "./pages/doctor/DoctorFollowUps";

// User / Patient Portal Pages
import UserLayout from "./pages/user/UserLayout";
import UserDashboard from "./pages/user/UserDashboard";
import UserAppointments from "./pages/user/UserAppointments";
import UserBilling from "./pages/user/UserBilling";
import UserFamilyProfiles from "./pages/user/UserFamilyProfiles";
import UserFollowUps from "./pages/user/UserFollowUps";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />

      {/* Owner / Admin Workspace */}
      <Route
        path="/app"
        element={
          <ProtectedRoute allowedRoles={["owner", "admin", "staff"]}>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/app/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="patients" element={<PatientsPage />} />
        <Route path="appointments" element={<AppointmentsPage />} />
        <Route path="medicines" element={<MedicinesPage />} />
        <Route path="medicines/batches" element={<BatchesPage />} />
        <Route path="diseases" element={<DiseasesPage />} />
        <Route path="prescriptions" element={<PrescriptionsPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="follow-ups" element={<FollowUpsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="reports" element={<Reports />} />
        <Route path="ai-assistant" element={<AiAssistant />} />
      </Route>

      {/* Doctor Workspace */}
      <Route
        path="/doctor"
        element={
          <ProtectedRoute allowedRoles={["doctor", "owner", "admin"]}>
            <DoctorShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/doctor/dashboard" replace />} />
        <Route path="dashboard" element={<DoctorDashboard />} />
        <Route path="appointments" element={<DoctorAppointments />} />
        <Route path="consult/:appointmentId" element={<DoctorConsultation />} />
        <Route path="patients" element={<DoctorPatients />} />
        <Route path="prescriptions" element={<DoctorPrescriptions />} />
        <Route path="follow-ups" element={<DoctorFollowUps />} />
        <Route path="ai-assistant" element={<AiAssistant />} />
      </Route>

      {/* Patient / Family Portal */}
      <Route
        path="/user"
        element={
          <ProtectedRoute allowedRoles={["user", "patient", "owner", "admin"]}>
            <UserLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/user/dashboard" replace />} />
        <Route path="dashboard" element={<UserDashboard />} />
        <Route path="appointments" element={<UserAppointments />} />
        <Route path="prescriptions" element={<Navigate to="/user/dashboard" replace />} />
        <Route path="billing" element={<UserBilling />} />
        <Route path="family" element={<UserFamilyProfiles />} />
        <Route path="follow-ups" element={<UserFollowUps />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

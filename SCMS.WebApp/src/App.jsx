import { Navigate, Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";
import AppShell from "./components/AppShell";
import ProtectedRoute from "./components/ProtectedRoute";
import AuthPage from "./pages/AuthPage";
import UserLayout from "./pages/user/UserLayout";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const PatientsPage = lazy(() => import("./pages/PatientsPage"));
const AppointmentsPage = lazy(() => import("./pages/AppointmentsPage"));
const MedicinesPage = lazy(() => import("./pages/MedicinesPage"));
const BatchesPage = lazy(() => import("./pages/BatchesPage"));
const DiseasesPage = lazy(() => import("./pages/DiseasesPage"));
const PrescriptionsPage = lazy(() => import("./pages/PrescriptionsPage"));
const PaymentsPage = lazy(() => import("./pages/PaymentsPage"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const AiAssistant = lazy(() => import("./pages/AiAssistant"));
const NotFound = lazy(() => import("./pages/NotFound"));
const FollowUpsPage = lazy(() => import("./pages/FeaturePages").then((module) => ({ default: module.FollowUpsPage })));
const NotificationsPage = lazy(() => import("./pages/FeaturePages").then((module) => ({ default: module.NotificationsPage })));
const UserDashboard = lazy(() => import("./pages/user/UserDashboard"));
const UserAppointments = lazy(() => import("./pages/user/UserAppointments"));
const UserRecords = lazy(() => import("./pages/user/UserRecords"));
const UserBilling = lazy(() => import("./pages/user/UserBilling"));
const UserPrescriptions = lazy(() => import("./pages/user/UserPrescriptions"));
const UserNotifications = lazy(() => import("./pages/user/UserNotifications"));

const routeFallback = (
  <div className="grid min-h-[50vh] place-items-center text-sm font-bold text-slate-500">
    Loading...
  </div>
);

export default function App() {
  return (
    <Suspense fallback={routeFallback}>
      <Routes>
        <Route path="/" element={<Navigate to="/app/dashboard" replace />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />

        <Route
          path="/app"
          element={
            <ProtectedRoute allowedRoles={["owner", "admin", "doctor"]}>
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
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route
          path="/user"
          element={
            <ProtectedRoute allowedRoles={["user"]}>
              <UserLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/user/dashboard" replace />} />
          <Route path="dashboard" element={<UserDashboard />} />
          <Route path="appointments" element={<UserAppointments />} />
          <Route path="records" element={<UserRecords />} />
          <Route path="billing" element={<UserBilling />} />
          <Route path="prescriptions" element={<UserPrescriptions />} />
          <Route path="notifications" element={<UserNotifications />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

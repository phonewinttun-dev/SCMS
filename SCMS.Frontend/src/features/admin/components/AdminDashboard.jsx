import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../../services/api";

const PRIMARY = "#0052CC";
const PRIMARY_DARK = "#003D99";
const PRIMARY_LIGHT = "#EBF2FF";
const SUCCESS = "#027A48";
const WARNING = "#B54708";
const DANGER = "#D92D20";
const BG = "#F6F8FB";
const CARD = "#FFFFFF";
const TEXT = "#1D2939";
const MUTED = "#667085";
const BORDER = "#E4E7EC";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  html, body, #root {
    width: 100%;
    min-height: 100%;
  }

  body {
    font-family: 'Inter', sans-serif;
    background: ${BG};
    color: ${TEXT};
  }

  .manrope {
    font-family: 'Manrope', sans-serif;
  }

  .app-shell {
    width: 100vw;
    min-height: 100vh;
    display: flex;
    background: ${BG};
    overflow: hidden;
  }

  .sidebar {
    width: 264px;
    min-width: 264px;
    height: 100vh;
    background: ${CARD};
    border-right: 1px solid ${BORDER};
    padding: 24px 16px;
    display: flex;
    flex-direction: column;
  }

  .brand {
    padding: 0 12px 22px;
    border-bottom: 1px solid ${BORDER};
  }

  .brand-title {
    color: ${PRIMARY};
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  .brand-subtitle {
    margin-top: 4px;
    color: ${MUTED};
    font-size: 12px;
    line-height: 1.4;
  }

  .nav {
    flex: 1;
    margin-top: 18px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    overflow-y: auto;
    padding-right: 2px;
  }

  .nav::-webkit-scrollbar {
    width: 4px;
  }

  .nav::-webkit-scrollbar-thumb {
    background: #D0D5DD;
    border-radius: 999px;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 12px 14px;
    border-radius: 12px;
    border: 0;
    background: transparent;
    color: #475467;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: 0.18s ease;
    text-align: left;
  }

  .nav-item:hover {
    background: #F2F4F7;
    color: ${TEXT};
    transform: translateX(2px);
  }

  .nav-item.active {
    background: ${PRIMARY_LIGHT};
    color: ${PRIMARY};
  }

  .sidebar-footer {
    border-top: 1px solid ${BORDER};
    padding-top: 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .main {
    flex: 1;
    height: 100vh;
    overflow: auto;
    padding: 28px 32px;
  }

  .main-inner {
    width: 100%;
    max-width: 1440px;
    margin: 0 auto;
  }

  .topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 18px;
    margin-bottom: 24px;
  }

  .title {
    font-size: 30px;
    font-weight: 800;
    letter-spacing: -0.04em;
    color: ${TEXT};
  }

  .subtitle {
    margin-top: 6px;
    color: ${MUTED};
    font-size: 14px;
  }

  .top-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .btn {
    border: 0;
    border-radius: 12px;
    padding: 11px 16px;
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: 0.18s ease;
    white-space: nowrap;
  }

  .btn-primary {
    background: ${PRIMARY};
    color: white;
    box-shadow: 0 8px 18px rgba(0,82,204,0.18);
  }

  .btn-primary:hover {
    background: ${PRIMARY_DARK};
    transform: translateY(-1px);
  }

  .btn-outline {
    background: ${CARD};
    color: ${TEXT};
    border: 1px solid ${BORDER};
  }

  .btn-outline:hover {
    background: #F9FAFB;
    transform: translateY(-1px);
  }

  .profile-card {
    display: flex;
    align-items: center;
    gap: 12px;
    background: ${CARD};
    border: 1px solid ${BORDER};
    border-radius: 16px;
    padding: 10px 14px;
    min-width: 190px;
  }

  .profile-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: ${PRIMARY};
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
  }

  .profile-name {
    font-size: 14px;
    font-weight: 800;
    color: ${TEXT};
  }

  .profile-role {
    margin-top: 2px;
    font-size: 12px;
    color: ${MUTED};
  }

  .alert {
    margin-top: 12px;
    color: ${DANGER};
    background: #FFF1F0;
    border: 1px solid #FECDCA;
    border-radius: 12px;
    padding: 10px 12px;
    font-size: 13px;
    line-height: 1.5;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 16px;
    margin-bottom: 18px;
  }

  .stat-card {
    background: ${CARD};
    border: 1px solid ${BORDER};
    border-radius: 18px;
    padding: 18px;
    min-height: 132px;
    box-shadow: 0 1px 2px rgba(16,24,40,0.04);
    transition: 0.18s ease;
  }

  .stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 28px rgba(16,24,40,0.08);
  }

  .stat-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .stat-icon {
    width: 34px;
    height: 34px;
    border-radius: 12px;
    background: #F2F4F7;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
  }

  .stat-label {
    margin-top: 16px;
    color: ${MUTED};
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.06em;
    line-height: 1.45;
    text-transform: uppercase;
  }

  .stat-value {
    margin-top: 5px;
    font-family: 'Manrope', sans-serif;
    font-size: 30px;
    font-weight: 800;
    letter-spacing: -0.04em;
  }

  .badge {
    font-size: 11px;
    font-weight: 800;
    padding: 4px 9px;
    border-radius: 999px;
  }

  .badge-success {
    background: #ECFDF3;
    color: ${SUCCESS};
    border: 1px solid #A9EFC5;
  }

  .badge-danger {
    background: #FFF1F0;
    color: ${DANGER};
    border: 1px solid #FECDCA;
  }

  .content-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.65fr) minmax(330px, 0.8fr);
    gap: 18px;
    margin-bottom: 18px;
  }

  .card {
    background: ${CARD};
    border: 1px solid ${BORDER};
    border-radius: 18px;
    overflow: hidden;
    box-shadow: 0 1px 2px rgba(16,24,40,0.04);
  }

  .card-header {
    padding: 18px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
  }

  .section-title {
    font-family: 'Manrope', sans-serif;
    font-size: 17px;
    font-weight: 800;
    color: ${TEXT};
  }

  .section-subtitle {
    margin-top: 4px;
    color: ${MUTED};
    font-size: 13px;
    line-height: 1.45;
  }

  .table-head {
    display: grid;
    grid-template-columns: 72px minmax(170px,1.1fr) minmax(180px,1fr) 96px 110px;
    gap: 12px;
    padding: 12px 20px;
    background: #F9FAFB;
    border-top: 1px solid ${BORDER};
    border-bottom: 1px solid ${BORDER};
  }

  .table-head div {
    color: ${MUTED};
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .table-row {
    display: grid;
    grid-template-columns: 72px minmax(170px,1.1fr) minmax(180px,1fr) 96px 110px;
    gap: 12px;
    align-items: center;
    padding: 14px 20px;
    border-bottom: 1px solid ${BORDER};
    transition: 0.15s ease;
  }

  .table-row:hover {
    background: #F9FAFB;
  }

  .token {
    font-family: 'Manrope', sans-serif;
    font-weight: 800;
    color: ${PRIMARY};
    font-size: 14px;
  }

  .patient-cell {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .avatar {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 12px;
    font-weight: 800;
    flex: 0 0 auto;
  }

  .patient-name {
    color: ${TEXT};
    font-size: 14px;
    font-weight: 700;
    line-height: 1.35;
  }

  .patient-meta {
    margin-top: 2px;
    color: ${MUTED};
    font-size: 12px;
  }

  .cell-text {
    color: ${MUTED};
    font-size: 13px;
    line-height: 1.5;
  }

  .pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    padding: 5px 10px;
    font-size: 12px;
    font-weight: 800;
    white-space: nowrap;
  }

  .pill-waiting {
    background: #FFFAEB;
    color: ${WARNING};
    border: 1px solid #FEDF89;
  }

  .pill-in-progress {
    background: ${PRIMARY_LIGHT};
    color: ${PRIMARY};
    border: 1px solid #B2CCFF;
  }

  .pill-done {
    background: #ECFDF3;
    color: ${SUCCESS};
    border: 1px solid #A9EFC5;
  }

  .pill-critical {
    background: #FFF1F0;
    color: ${DANGER};
    border: 1px solid #FECDCA;
  }

  .summary-card {
    background: linear-gradient(150deg, #0052CC 0%, #003D99 100%);
    color: white;
    border: 0;
    padding: 22px;
    min-height: 100%;
  }

  .summary-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
  }

  .summary-badge {
    background: rgba(255,255,255,0.16);
    padding: 5px 11px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 800;
  }

  .revenue-label {
    color: rgba(255,255,255,0.75);
    font-size: 13px;
  }

  .revenue {
    margin-top: 5px;
    font-family: 'Manrope', sans-serif;
    font-size: 38px;
    line-height: 1.1;
    font-weight: 800;
    letter-spacing: -0.04em;
  }

  .metric {
    margin-top: 16px;
  }

  .metric-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 7px;
    color: rgba(255,255,255,0.9);
    font-size: 13px;
    font-weight: 600;
  }

  .progress {
    height: 7px;
    background: rgba(255,255,255,0.22);
    border-radius: 999px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: white;
    border-radius: 999px;
    transition: width 0.4s ease;
  }

  .patient-flow {
    margin-top: 20px;
    padding-top: 18px;
    border-top: 1px solid rgba(255,255,255,0.18);
  }

  .bottom-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px;
    padding-bottom: 8px;
  }

  .list {
    padding: 8px 0;
  }

  .list-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 13px 20px;
    border-top: 1px solid ${BORDER};
    transition: 0.15s ease;
  }

  .list-item:hover {
    background: #F9FAFB;
  }

  .list-icon {
    width: 42px;
    height: 42px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
  }

  .list-title {
    font-size: 14px;
    color: ${TEXT};
    font-weight: 700;
  }

  .list-sub {
    margin-top: 3px;
    color: ${MUTED};
    font-size: 12px;
    line-height: 1.45;
  }

  .empty {
    padding: 20px;
    color: ${MUTED};
    font-size: 13px;
    text-align: center;
  }

  .hide-mobile {
    display: inline-flex;
  }

  @media (max-width: 1280px) {
    .stats-grid { grid-template-columns: repeat(3, 1fr); }
    .content-grid { grid-template-columns: 1fr; }
  }

  @media (max-width: 900px) {
    .sidebar {
      width: 78px;
      min-width: 78px;
      padding: 18px 10px;
    }

    .brand-subtitle,
    .nav-text,
    .profile-card,
    .hide-mobile {
      display: none;
    }

    .brand {
      padding: 0 6px 18px;
    }

    .brand-title {
      font-size: 18px;
      text-align: center;
    }

    .nav-item {
      justify-content: center;
      padding: 12px;
    }

    .main {
      padding: 22px 18px;
    }

    .topbar {
      align-items: flex-start;
      flex-direction: column;
    }

    .stats-grid,
    .bottom-grid {
      grid-template-columns: 1fr;
    }

    .table-head,
    .table-row {
      grid-template-columns: 66px 1fr 96px;
    }

    .table-head div:nth-child(3),
    .table-head div:nth-child(4),
    .table-row > div:nth-child(3),
    .table-row > div:nth-child(4) {
      display: none;
    }
  }

  /* Sleek circular spinner */
  .spinner-ring {
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.25);
    border-radius: 50%;
    border-top-color: white;
    animation: spin 0.8s linear infinite;
  }

  .spinner-ring-dark {
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 2px solid rgba(0, 82, 204, 0.15);
    border-radius: 50%;
    border-top-color: ${PRIMARY};
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Shimmer effect for skeleton loading */
  @keyframes shimmer {
    0% {
      background-position: -468px 0;
    }
    100% {
      background-position: 468px 0;
    }
  }

  .skeleton {
    animation: shimmer 1.2s infinite linear;
    background: linear-gradient(to right, #F2F4F7 8%, #EAECF0 18%, #F2F4F7 33%);
    background-size: 800px 104px;
    position: relative;
    border-radius: 8px;
    overflow: hidden;
  }

  .skeleton-light {
    animation: shimmer 1.2s infinite linear;
    background: linear-gradient(to right, rgba(255,255,255,0.12) 8%, rgba(255,255,255,0.24) 18%, rgba(255,255,255,0.12) 33%);
    background-size: 800px 104px;
    position: relative;
    border-radius: 8px;
    overflow: hidden;
  }

  .skeleton-text {
    height: 12px;
    border-radius: 4px;
  }
`;

const safeArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.value)) return data.value;
  return [];
};

const pickNumber = (...values) => {
  for (const value of values) {
    const number = Number(value);
    if (!Number.isNaN(number) && value !== undefined && value !== null) {
      return number;
    }
  }
  return 0;
};

const getName = (item) =>
  item?.patientName ||
  item?.name ||
  item?.fullName ||
  item?.patient?.name ||
  item?.patient?.fullName ||
  item?.user?.name ||
  "Unknown Patient";

const getInitials = (name) =>
  String(name || "U")
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const formatDateTime = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("en-MY", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const normalizeStatus = (value) => {
  const s = String(value || "waiting").toLowerCase();

  if (s.includes("progress") || s.includes("called") || s.includes("active")) {
    return "in-progress";
  }

  if (
    s.includes("complete") ||
    s.includes("done") ||
    s.includes("paid") ||
    s.includes("ready")
  ) {
    return "done";
  }

  if (s.includes("urgent") || s.includes("critical")) {
    return "critical";
  }

  return "waiting";
};

const navItems = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: "dashboard",
    route: "/admin/dashboard",
  },
  {
    key: "patients",
    label: "Patients",
    icon: "patients",
    route: "/admin/patients",
  },
  {
    key: "appointments",
    label: "Appointments",
    icon: "appointments",
    route: "/admin/appointments",
  },
  {
    key: "medicines",
    label: "Medicines",
    icon: "medicines",
    route: "/admin/medicines",
  },
  {
    key: "prescriptions",
    label: "Prescriptions",
    icon: "prescriptions",
    route: "/admin/prescriptions",
  },
  {
    key: "followups",
    label: "Follow-Ups",
    icon: "followups",
    route: "/admin/followups",
  },
  {
    key: "payments",
    label: "Payments",
    icon: "payments",
    route: "/admin/payments",
  },
  {
    key: "notifications",
    label: "Notifications",
    icon: "notif",
    route: "/admin/notifications",
  },
];

const apiEndpoints = {
  dashboard: "/Dashboards/dashboard",
  patients: "/Patients",
  appointments: "/Appointments",
  callNext: "/Appointments/call-next",
  prescriptions: "/Prescriptions",
  followUps: "/FollowUps",
  payments: "/Payments",
  notifications: "/Notifications",
};

const chartData = [
  { label: "MON", sch: 8, wlk: 4 },
  { label: "TUE", sch: 12, wlk: 6 },
  { label: "WED", sch: 15, wlk: 9 },
  { label: "THU", sch: 7, wlk: 5 },
  { label: "FRI", sch: 18, wlk: 11 },
  { label: "SAT", sch: 10, wlk: 7 },
  { label: "SUN", sch: 5, wlk: 3 },
];

const NavIcon = ({ type }) => {
  const icons = {
    dashboard: (
      <svg
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    patients: (
      <svg
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <circle cx="9" cy="7" r="4" />
        <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        <path d="M21 21v-2a4 4 0 0 0-3-3.85" />
      </svg>
    ),
    medicines: (
      <svg
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path d="M10.5 20.5 3.5 13.5a4.95 4.95 0 0 1 7-7l7 7a4.95 4.95 0 0 1-7 7Z" />
        <path d="M8.5 8.5 15.5 15.5" />
      </svg>
    ),
    appointments: (
      <svg
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    prescriptions: (
      <svg
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path d="M14 3v4a1 1 0 0 0 1 1h4" />
        <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
        <line x1="9" y1="12" x2="15" y2="12" />
        <line x1="9" y1="16" x2="13" y2="16" />
      </svg>
    ),
    lab: (
      <svg
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v11l-5 5h16l-5-5V3" />
      </svg>
    ),
    followups: (
      <svg
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
        <line x1="12" y1="7" x2="12" y2="12" />
        <line x1="12" y1="12" x2="15" y2="14" />
      </svg>
    ),
    payments: (
      <svg
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    ),
    notif: (
      <svg
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
    settings: (
      <svg
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
      </svg>
    ),
    logout: (
      <svg
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
    ),
  };

  return icons[type] || null;
};

const MiniBarChart = ({ data }) => {
  const max = Math.max(...data.map((d) => Math.max(d.sch, d.wlk)), 1);

  return (
    <div
      style={{ display: "flex", alignItems: "flex-end", gap: 7, height: 82 }}
    >
      {data.map((d, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 7,
          }}
        >
          <div
            style={{
              width: "100%",
              height: 58,
              display: "flex",
              alignItems: "flex-end",
              gap: 4,
            }}
          >
            <div
              style={{
                flex: 1,
                height: `${(d.sch / max) * 58}px`,
                background: "white",
                borderRadius: "6px 6px 0 0",
              }}
            />
            <div
              style={{
                flex: 1,
                height: `${(d.wlk / max) * 58}px`,
                background: "rgba(255,255,255,0.42)",
                borderRadius: "6px 6px 0 0",
              }}
            />
          </div>

          <span
            style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [calling, setCalling] = useState(false);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  const [dashboard, setDashboard] = useState({});
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [payments, setPayments] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    return () => clearInterval(timer);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setApiError("");

      const results = await Promise.allSettled([
        api.get(apiEndpoints.dashboard),
        api.get(apiEndpoints.patients),
        api.get(apiEndpoints.appointments),
        api.get(apiEndpoints.prescriptions),
        api.get(apiEndpoints.followUps),

        api.get(apiEndpoints.payments),
        api.get(apiEndpoints.notifications),
      ]);

      const [
        dashboardRes,
        patientsRes,
        appointmentsRes,
        prescriptionsRes,
        followUpsRes,

        paymentsRes,
        notificationsRes,
      ] = results;

      if (dashboardRes.status === "fulfilled") {
        setDashboard(dashboardRes.value.data || {});
      }

      if (patientsRes.status === "fulfilled") {
        setPatients(safeArray(patientsRes.value.data));
      }

      if (appointmentsRes.status === "fulfilled") {
        setAppointments(safeArray(appointmentsRes.value.data));
      }

      if (prescriptionsRes.status === "fulfilled") {
        setPrescriptions(safeArray(prescriptionsRes.value.data));
      }

      if (followUpsRes.status === "fulfilled") {
        setFollowUps(safeArray(followUpsRes.value.data));
      }
      if (paymentsRes.status === "fulfilled") {
        setPayments(safeArray(paymentsRes.value.data));
      }

      if (notificationsRes.status === "fulfilled") {
        setNotifications(safeArray(notificationsRes.value.data));
      }

      if (results.some((result) => result.status === "rejected")) {
        setApiError(
          "Some APIs failed. Dashboard is showing available data only.",
        );
      }
    } catch (error) {
      console.error("Dashboard load error:", error);
      setApiError("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleNavigate = (item) => {
    navigate(item.route);
  };

  const handleCallNext = async () => {
    try {
      setCalling(true);

      await api.post(apiEndpoints.callNext);

      const res = await api.get(apiEndpoints.appointments);

      setAppointments(safeArray(res.data));
    } catch (error) {
      console.error("Call next error:", error);
      setApiError("Call Next failed. Please check appointment API.");
    } finally {
      setCalling(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userRole");
    localStorage.removeItem("user");

    navigate("/login");
  };

  const dateStr = currentTime.toLocaleDateString("en-MY", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  const statusLabel = {
    "in-progress": "In Progress",
    waiting: "Waiting",
    critical: "Critical",
    done: "Done",
  };

  const statusClass = {
    "in-progress": "pill-in-progress",
    waiting: "pill-waiting",
    critical: "pill-critical",
    done: "pill-done",
  };

  const queue = useMemo(
    () =>
      appointments.slice(0, 6).map((item, index) => {
        const name = getName(item);

        const status = normalizeStatus(
          item?.status || item?.appointmentStatus || item?.queueStatus,
        );

        return {
          id: item?.id || item?.appointmentId || index + 1,
          name,
          age: item?.age || item?.patientAge || item?.patient?.age || "-",
          reason:
            item?.reason ||
            item?.symptoms ||
            item?.description ||
            item?.notes ||
            "Consultation",
          status,
          wait:
            item?.waitTime ||
            item?.estimatedWaitTime ||
            item?.queueTime ||
            (status === "in-progress" ? "Now" : "Waiting"),
          token:
            item?.tokenNo ||
            item?.queueNo ||
            item?.token ||
            `Q-${String(index + 1).padStart(2, "0")}`,
          avatar:
            status === "critical"
              ? DANGER
              : index % 2 === 0
                ? PRIMARY
                : "#475467",
        };
      }),
    [appointments],
  );

  const recentFollowUps = useMemo(
    () =>
      followUps.slice(0, 4).map((item) => ({
        id: item?.id || item?.followUpId,
        name: getName(item),
        date: formatDateTime(
          item?.date ||
            item?.followUpDate ||
            item?.appointmentDate ||
            item?.createdAt,
        ),
        reason:
          item?.reason ||
          item?.notes ||
          item?.description ||
          "Follow-up consultation",
        urgent: Boolean(
          item?.urgent ||
          item?.isUrgent ||
          normalizeStatus(item?.status) === "critical",
        ),
      })),
    [followUps],
  );

  const stats = useMemo(() => {
    return [
      {
        label: "Total Patients",
        value: pickNumber(
          dashboard?.totalPatients,
          dashboard?.patientCount,
          patients.length,
        ),

        badge: "+3%",
        color: PRIMARY,
      },
      {
        label: "Today's Appts",
        value: pickNumber(
          dashboard?.todayAppointments,
          dashboard?.appointmentsToday,
          dashboard?.appointmentCount,
          appointments.length,
        ),

        badge: "Live",
        badgeType: "live",
        color: "#475467",
      },
      {
        label: "In Queue",
        value: pickNumber(
          dashboard?.queueCount,
          dashboard?.inQueue,
          queue.length,
        ),

        color: "#7A5AF8",
      },

      {
        label: "Follow-Ups",
        value: pickNumber(
          dashboard?.followUps,
          dashboard?.followUpCount,
          followUps.length,
        ),

        color: "#0E7090",
      },
      {
        label: "Prescriptions",
        value: pickNumber(
          dashboard?.prescriptions,
          dashboard?.prescriptionCount,
          prescriptions.length,
        ),

        badge: "Today",
        color: PRIMARY,
      },
    ];
  }, [dashboard, patients, appointments, queue, followUps, prescriptions]);

  const summary = useMemo(() => {
    const completedAppointments = appointments.filter(
      (item) =>
        normalizeStatus(item?.status || item?.appointmentStatus) === "done",
    ).length;

    const completedPrescriptions = prescriptions.filter(
      (item) => normalizeStatus(item?.status) === "done",
    ).length;

    const totalRevenue = payments.reduce(
      (sum, item) =>
        sum +
        pickNumber(
          item?.amount,
          item?.totalAmount,
          item?.paidAmount,
          item?.price,
        ),
      0,
    );

    return {
      revenue: pickNumber(
        dashboard?.revenueToday,
        dashboard?.todayRevenue,
        dashboard?.totalRevenue,
        totalRevenue,
      ),
      consultations: {
        val: `${completedAppointments}/${appointments.length || 0}`,
        pct: appointments.length
          ? Math.round((completedAppointments / appointments.length) * 100)
          : 0,
      },

      prescriptions: {
        val: `${completedPrescriptions}/${prescriptions.length || 0}`,
        pct: prescriptions.length
          ? Math.round((completedPrescriptions / prescriptions.length) * 100)
          : 0,
      },
    };
  }, [dashboard, appointments, prescriptions, payments]);

  return (
    <>
      <style>{styles}</style>

      <div className="dashboard-content" style={{ width: "100%" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
            gap: 16,
            flexWrap: "wrap"
          }}
        >
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: MUTED }}>
              Clinic A • {dateStr}
            </h2>
            {apiError ? <div className="alert" style={{ marginTop: 8 }}>{apiError}</div> : null}
          </div>

          <div className="top-actions" style={{ display: "flex", gap: 12 }}>
            <button className="btn btn-outline" onClick={loadDashboardData} disabled={loading} style={{ minWidth: 100 }}>
              {loading ? (
                <>
                  <span className="spinner-ring-dark" style={{ marginRight: 8 }} />
                  <span>Loading</span>
                </>
              ) : (
                "Refresh"
              )}
            </button>

            <button className="btn btn-primary">
              <span>+</span>
              <span className="hide-mobile">New Prescription</span>
            </button>
          </div>
        </header>

            <section className="stats-grid">
              {stats.map((stat, index) => (
                <article key={index} className="stat-card">
                  <div className="stat-top">
                    <div className="stat-icon">{stat.icon}</div>

                    {stat.badge ? (
                      <span
                        className={`badge ${
                          stat.badgeType === "danger"
                            ? "badge-danger"
                            : "badge-success"
                        }`}
                      >
                        {stat.badge}
                      </span>
                    ) : null}
                  </div>

                  <div className="stat-label">{stat.label}</div>

                  <div className="stat-value" style={{ color: stat.color, display: "flex", alignItems: "center" }}>
                    {loading ? (
                      <div className="skeleton" style={{ width: 80, height: 32, margin: "4px 0" }} />
                    ) : (
                      stat.value
                    )}
                  </div>
                </article>
              ))}
            </section>

            <section className="content-grid">
              <article className="card">
                <div className="card-header">
                  <div>
                    <div className="section-title">Patient Queue</div>
                    <div className="section-subtitle">
                      Today's appointments and walk-ins
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                    }}
                  >
                    <span className="badge badge-success">● Live</span>

                    <button
                      className="btn btn-primary"
                      onClick={handleCallNext}
                    >
                      {calling ? "Calling..." : "Call Next ▶"}
                    </button>
                  </div>
                </div>

                <div className="table-head">
                  {["Token", "Patient", "Reason", "Wait", "Status"].map(
                    (head) => (
                      <div key={head}>{head}</div>
                    ),
                  )}
                </div>

                {loading ? (
                  Array.from({ length: 4 }).map((_, idx) => (
                    <div key={idx} className="table-row">
                      <div className="token"><div className="skeleton skeleton-text" style={{ width: 45 }} /></div>

                      <div className="patient-cell">
                        <div
                          className="avatar skeleton"
                          style={{ background: "#EAECF0" }}
                        />

                        <div style={{ flex: 1 }}>
                          <div className="skeleton skeleton-text" style={{ width: "70%", height: 14 }} />
                          <div className="skeleton skeleton-text" style={{ width: "40%", height: 10, marginTop: 4 }} />
                        </div>
                      </div>

                      <div className="cell-text">
                        <div className="skeleton skeleton-text" style={{ width: "65%" }} />
                      </div>

                      <div className="cell-text">
                        <div className="skeleton skeleton-text" style={{ width: "45%" }} />
                      </div>

                      <div>
                        <div className="skeleton skeleton-text" style={{ width: 75, height: 24, borderRadius: 12 }} />
                      </div>
                    </div>
                  ))
                ) : queue.length === 0 ? (
                  <div className="empty">No appointments found.</div>
                ) : (
                  queue.map((patient) => (
                    <div key={patient.id} className="table-row">
                      <div className="token">{patient.token}</div>

                      <div className="patient-cell">
                        <div
                          className="avatar"
                          style={{ background: patient.avatar }}
                        >
                          {getInitials(patient.name)}
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <div className="patient-name">{patient.name}</div>
                          <div className="patient-meta">Age {patient.age}</div>
                        </div>
                      </div>

                      <div className="cell-text">{patient.reason}</div>

                      <div className="cell-text">{patient.wait}</div>

                      <div>
                        <span className={`pill ${statusClass[patient.status]}`}>
                          {statusLabel[patient.status]}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </article>

              <article className="card summary-card">
                <div className="summary-top">
                  <div className="section-title" style={{ color: "white" }}>
                    Today's Summary
                  </div>

                  <span className="summary-badge">Daily</span>
                </div>

                <div>
                  <div className="revenue-label">Revenue Collected</div>
                  <div className="revenue" style={{ display: "flex", alignItems: "center" }}>
                    {loading ? (
                      <div className="skeleton-light" style={{ width: 140, height: 38, margin: "5px 0" }} />
                    ) : (
                      <>RM {summary.revenue.toLocaleString()}</>
                    )}
                  </div>
                </div>

                {[
                  {
                    label: "Consultations",
                    pct: summary.consultations.pct,
                    val: summary.consultations.val,
                  },

                  {
                    label: "Prescriptions",
                    pct: summary.prescriptions.pct,
                    val: summary.prescriptions.val,
                  },
                ].map((metric) => (
                  <div key={metric.label} className="metric">
                    <div className="metric-row">
                      <span>{metric.label}</span>
                      <span>
                        {loading ? (
                          <div className="skeleton-light" style={{ width: 42, height: 14, display: "inline-block" }} />
                        ) : (
                          metric.val
                        )}
                      </span>
                    </div>

                    <div className="progress">
                      <div
                        className="progress-fill"
                        style={{ width: `${loading ? 0 : metric.pct}%` }}
                      />
                    </div>
                  </div>
                ))}

                <div className="patient-flow">
                  <div
                    style={{
                      textAlign: "center",
                      fontWeight: 800,
                      marginBottom: 14,
                    }}
                  >
                    Patient Flow
                  </div>

                  <MiniBarChart data={chartData} />

                  <div
                    style={{
                      display: "flex",
                      gap: 16,
                      marginTop: 14,
                      fontSize: 12,
                      color: "rgba(255,255,255,0.78)",
                    }}
                  >
                    <span>■ Scheduled</span>
                    <span>■ Walk-in</span>
                  </div>
                </div>
              </article>
            </section>

            <section className="bottom-grid">
              <article className="card">
                <div className="card-header">
                  <div>
                    <div className="section-title">Upcoming Follow-Ups</div>
                    <div className="section-subtitle">
                      Patients who need review
                    </div>
                  </div>

                  <button className="btn btn-outline">View All</button>
                </div>

                <div className="list">
                  {loading ? (
                    Array.from({ length: 3 }).map((_, idx) => (
                      <div key={idx} className="list-item">
                        <div
                          className="list-icon skeleton"
                          style={{
                            background: "#EAECF0",
                            width: 42,
                            height: 42,
                            borderRadius: 14
                          }}
                        />

                        <div style={{ flex: 1 }}>
                          <div className="skeleton skeleton-text" style={{ width: "40%", height: 14 }} />
                          <div className="skeleton skeleton-text" style={{ width: "70%", height: 10, marginTop: 6 }} />
                        </div>

                        <div style={{ width: 80, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                          <div className="skeleton skeleton-text" style={{ width: 50, height: 10 }} />
                        </div>
                      </div>
                    ))
                  ) : recentFollowUps.length === 0 ? (
                    <div className="empty">No follow-ups found.</div>
                  ) : (
                    recentFollowUps.map((followUp, index) => (
                      <div key={followUp.id || index} className="list-item">
                        <div
                          className="list-icon"
                          style={{
                            background: followUp.urgent
                              ? "#FFF1F0"
                              : PRIMARY_LIGHT,
                            color: followUp.urgent ? DANGER : PRIMARY,
                          }}
                        >
                          <NavIcon type="followups" />
                        </div>

                        <div style={{ flex: 1 }}>
                          <div className="list-title">{followUp.name}</div>
                          <div className="list-sub">{followUp.reason}</div>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          {followUp.urgent ? (
                            <span className="badge badge-danger">Urgent</span>
                          ) : null}

                          <div className="list-sub">{followUp.date}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </article>
            </section>
      </div>
    </>
  );
}

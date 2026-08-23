import { useState, useEffect, useCallback } from "react";
import {
  DownloadIcon,
  ActivityLogIcon,
  BarChartIcon,
  ReaderIcon,
} from "@radix-ui/react-icons";
import PageHeader from "../components/PageHeader";
import DateInput from "../components/DateInput";
import { Select } from "../components/ui/select";
import { useLanguage } from "../context/LanguageContext";
import { downloadBlob, reportsApi } from "../services/scmsApi";
import { showError, showAlert } from "../services/dialogs";

const formatCurrency = (val) => {
  if (val === null || val === undefined || isNaN(Number(val))) return "0.00";
  return Number(val).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatDate = (val) => {
  if (!val) return "-";
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

const formatDateTime = (val) => {
  if (!val) return "-";
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getUTCHours()).padStart(2, "0");
  const minutes = String(d.getUTCMinutes()).padStart(2, "0");
  return `${day}-${month}-${year} ${hours}:${minutes}`;
};

const unwrapPayload = (res) => {
  if (!res) return null;
  if (res.data !== undefined && res.data !== null && typeof res.data === "object") {
    return res.data;
  }
  return res;
};

const pad2 = (n) => String(n).padStart(2, "0");

const calculateWeekEndDate = (startStr) => {
  if (!startStr) return "";
  const d = new Date(startStr);
  if (isNaN(d.getTime())) return "";
  const end = new Date(d);
  end.setDate(end.getDate() + 6);
  return `${end.getFullYear()}-${pad2(end.getMonth() + 1)}-${pad2(end.getDate())}`;
};

const MONTH_OPTIONS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 7 }, (_, i) => {
  const y = currentYear - 3 + i;
  return { value: String(y), label: String(y) };
});

const reportConfigs = {
  revenue: {
    label: "Financial & Revenue",
    load: (p) => reportsApi.revenue(p),
    pdf: (p) => reportsApi.revenuePdf(p),
    file: "revenue-report.pdf",
    description: "Gross income, tax collected, extra service charges, and payment method distribution.",
    hasInterval: true,
    defaultInterval: "weekly",
    intervals: [
      { value: "weekly", label: "Weekly Summary" },
      { value: "monthly", label: "Monthly Summary" },
      { value: "daily", label: "Daily Summary" },
      { value: "custom", label: "Custom Range" },
    ],
  },
  appointments: {
    label: "Appointments Summary",
    load: (p) => reportsApi.appointments(p),
    pdf: (p) => reportsApi.appointmentPdf(p),
    file: "appointments-report.pdf",
    description: "Daily, weekly, monthly, or custom overview of bookings, completed consultations, and cancellations.",
    hasInterval: true,
    defaultInterval: "daily",
    intervals: [
      { value: "daily", label: "Daily Summary" },
      { value: "weekly", label: "Weekly Summary" },
      { value: "monthly", label: "Monthly Summary" },
      { value: "custom", label: "Custom Range" },
    ],
  },
  businessSummary: {
    label: "Executive Overview",
    load: (p) => reportsApi.businessSummary({ month: p.month, year: p.year }),
    pdf: (p) => reportsApi.businessSummaryPdf({ month: p.month, year: p.year }),
    file: "business-summary.pdf",
    description: "Monthly operational summary of clinic revenue, patient growth, and appointment volumes.",
    hasInterval: false,
    isMonthlyOnly: true,
  },
  patients: {
    label: "Patient Demographics",
    load: () => reportsApi.patients(),
    pdf: () => reportsApi.patientsPdf(),
    file: "patients-report.pdf",
    description: "Directory of registered patients, age groups, and gender breakdown.",
    hasInterval: false,
    hasDate: false,
  },
  medicineStock: {
    label: "Pharmacy & Stock Inventory",
    load: () => reportsApi.medicineStock(),
    pdf: () => reportsApi.medicineStockPdf(),
    file: "medicine-stock-report.pdf",
    description: "Current stock quantities, batch expiry milestones, and low-inventory alerts.",
    hasInterval: false,
    hasDate: false,
  },
  followUps: {
    label: "Patient Follow-Ups",
    load: (p) => reportsApi.followUps({ startDate: p.startDate, endDate: p.endDate, status: p.statusFilter || "all" }),
    pdf: (p) => reportsApi.followUpsPdf({ startDate: p.startDate, endDate: p.endDate, status: p.statusFilter || "all" }),
    file: "follow-ups-report.pdf",
    description: "Care follow-up schedules, completed check-ins, and overdue reminders.",
    hasInterval: true,
    defaultInterval: "all",
    intervalLabel: "Status Filter",
    intervals: [
      { value: "all", label: "All Statuses" },
      { value: "pending", label: "Pending" },
      { value: "completed", label: "Completed" },
    ],
    isDateRange: true,
  },
  prescriptions: {
    label: "Prescriptions Log",
    load: () => reportsApi.prescriptions(),
    pdf: () => reportsApi.prescriptionsPdf(),
    file: "prescriptions-report.pdf",
    description: "Prescription records, medications dispensed, and consultation history.",
    hasInterval: false,
    hasDate: false,
  },
};

export default function Reports() {
  const { t } = useLanguage();
  const todayIso = new Date().toISOString().slice(0, 10);
  const [reportKey, setReportKey] = useState("");
  const [intervalValue, setIntervalValue] = useState("");
  const [date, setDate] = useState(todayIso);
  const [startDate, setStartDate] = useState(todayIso);
  const [endDate, setEndDate] = useState(calculateWeekEndDate(todayIso));
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [reportData, setReportData] = useState(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const currentConfig = reportKey ? reportConfigs[reportKey] : null;
  const isMonthlyMode = intervalValue === "monthly" || currentConfig?.isMonthlyOnly;
  const isWeeklyMode = intervalValue === "weekly";
  const isCustomMode = intervalValue === "custom" || currentConfig?.isDateRange;
  const isDailyMode = intervalValue === "daily";

  const canGenerate = Boolean(
    reportKey &&
      (!currentConfig?.hasInterval || intervalValue) &&
      (!isWeeklyMode || (startDate && endDate)) &&
      (!isCustomMode || (startDate && endDate)) &&
      (!isDailyMode || date) &&
      (!isMonthlyMode || (selectedMonth && selectedYear))
  );

  const handleStartDateChange = (val) => {
    setStartDate(val);
    if (intervalValue === "weekly") {
      setEndDate(calculateWeekEndDate(val));
    }
    setReportData(null);
    setHasGenerated(false);
  };

  const handleCategoryChange = (val) => {
    setReportKey(val);
    const cfg = reportConfigs[val];
    const defInterval = cfg?.defaultInterval || "";
    setIntervalValue(defInterval);
    if (defInterval === "weekly") {
      setEndDate(calculateWeekEndDate(startDate));
    }
    setReportData(null);
    setHasGenerated(false);
  };

  const handleIntervalChange = (val) => {
    setIntervalValue(val);
    if (val === "weekly") {
      setEndDate(calculateWeekEndDate(startDate));
    }
    setReportData(null);
    setHasGenerated(false);
  };

  const buildReportParams = () => {
    return {
      reportType: intervalValue || currentConfig?.defaultInterval || "weekly",
      statusFilter: intervalValue || currentConfig?.defaultInterval || "all",
      date: isMonthlyMode ? `${selectedYear}-${pad2(selectedMonth)}-01` : date,
      startDate: isWeeklyMode || isCustomMode ? startDate : undefined,
      endDate: isWeeklyMode || isCustomMode ? endDate : undefined,
      month: isMonthlyMode ? Number(selectedMonth) : undefined,
      year: isMonthlyMode ? Number(selectedYear) : undefined,
    };
  };

  const loadReport = useCallback(async () => {
    if (!currentConfig) {
      showError("Please choose a report category first.");
      return;
    }
    if (currentConfig.hasInterval && !intervalValue) {
      showError("Please choose a timeframe interval.");
      return;
    }
    try {
      setLoading(true);
      setHasGenerated(true);
      const params = buildReportParams();
      const rawRes = await currentConfig.load(params);
      const payload = unwrapPayload(rawRes);
      setReportData(payload);
    } catch (error) {
      showError(error?.response?.data?.message || "Failed to load clinic report data.");
      setReportData(null);
    } finally {
      setLoading(false);
    }
  }, [currentConfig, intervalValue, date, startDate, endDate, selectedMonth, selectedYear]);

  const handleDownloadPdf = async () => {
    if (!currentConfig) return;
    try {
      setDownloading(true);
      const params = buildReportParams();
      const response = await currentConfig.pdf(params);
      downloadBlob(response, currentConfig.file);
      showAlert("PDF report downloaded successfully.");
    } catch {
      showError("Failed to export PDF report.");
    } finally {
      setDownloading(false);
    }
  };

  const domainOptions = Object.entries(reportConfigs).map(([key, config]) => ({
    value: key,
    label: config.label,
  }));

  const currentIntervalOptions = currentConfig?.intervals || [];

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader
        title={t.reports || "Reports"}
        subtitle="Generate, review, and export official clinical audits, operational summaries, and financial reports."
      />

      {/* Filter and Control Panel with high z-index */}
      <section
        aria-label="Report Filter Controls"
        className="relative z-30 rounded-3xl border border-border/80 bg-card/95 p-6 shadow-scms backdrop-blur-md"
      >
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 items-end">
          {/* Report Category Selection */}
          <div className="w-full sm:col-span-1 lg:col-span-3">
            <label
              id="report-domain-label"
              className="mb-2 block text-xs font-bold text-foreground"
            >
              Report Category
            </label>
            <Select
              ariaLabel="Select report category"
              placeholder={t.choose || "Choose"}
              value={reportKey}
              onChange={handleCategoryChange}
              options={domainOptions}
            />
          </div>

          {/* Timeframe or Status Filter */}
          <div className="w-full sm:col-span-1 lg:col-span-3">
            <label
              id="report-interval-label"
              className="mb-2 block text-xs font-bold text-foreground"
            >
              {currentConfig?.intervalLabel || "Timeframe Interval"}
            </label>
            {currentConfig?.hasInterval ? (
              <Select
                ariaLabel={currentConfig.intervalLabel || "Select timeframe interval"}
                placeholder={t.choose || "Choose"}
                value={intervalValue}
                onChange={handleIntervalChange}
                options={currentIntervalOptions}
              />
            ) : (
              <div className="flex h-11 w-full items-center rounded-2xl border border-dashed border-input bg-secondary/30 px-3.5 text-xs text-muted-foreground italic select-none">
                {currentConfig?.isMonthlyOnly ? "Monthly Overview" : currentConfig ? "All records active" : (t.chooseCategory || "Choose category first")}
              </div>
            )}
          </div>

          {/* Dynamic Date & Timeframe Selection Inputs */}
          {isWeeklyMode ? (
            <>
              {/* Start Date */}
              <div className="w-full sm:col-span-1 lg:col-span-2">
                <label className="mb-2 block text-xs font-bold text-foreground">
                  {t.startDate || "Start Date"}
                </label>
                <DateInput
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="w-full"
                  aria-label={t.startDate || "Start Date"}
                />
              </div>

              {/* Auto End Date (Disabled - 1 Week Span) */}
              <div className="w-full sm:col-span-1 lg:col-span-2">
                <label className="mb-2 block text-xs font-bold text-foreground flex items-center justify-between">
                  <span>{t.endDate || "End Date"}</span>
                  <span className="text-[10px] text-muted-foreground font-normal">(1 Week Span)</span>
                </label>
                <DateInput
                  value={endDate}
                  disabled={true}
                  className="w-full opacity-80"
                  aria-label={t.endDate || "End Date"}
                />
              </div>
            </>
          ) : isCustomMode ? (
            <>
              {/* Custom Start Date */}
              <div className="w-full sm:col-span-1 lg:col-span-2">
                <label className="mb-2 block text-xs font-bold text-foreground">
                  {t.startDate || "Start Date"}
                </label>
                <DateInput
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setReportData(null);
                    setHasGenerated(false);
                  }}
                  className="w-full"
                  aria-label={t.startDate || "Start Date"}
                />
              </div>

              {/* Custom End Date */}
              <div className="w-full sm:col-span-1 lg:col-span-2">
                <label className="mb-2 block text-xs font-bold text-foreground">
                  {t.endDate || "End Date"}
                </label>
                <DateInput
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setReportData(null);
                    setHasGenerated(false);
                  }}
                  className="w-full"
                  aria-label={t.endDate || "End Date"}
                />
              </div>
            </>
          ) : isMonthlyMode ? (
            <>
              {/* Month Dropdown */}
              <div className="w-full sm:col-span-1 lg:col-span-2">
                <label className="mb-2 block text-xs font-bold text-foreground">
                  {t.month || "Month"}
                </label>
                <Select
                  ariaLabel="Select Month"
                  value={selectedMonth}
                  onChange={(val) => {
                    setSelectedMonth(val);
                    setReportData(null);
                    setHasGenerated(false);
                  }}
                  options={MONTH_OPTIONS}
                />
              </div>

              {/* Year Dropdown */}
              <div className="w-full sm:col-span-1 lg:col-span-2">
                <label className="mb-2 block text-xs font-bold text-foreground">
                  {t.year || "Year"}
                </label>
                <Select
                  ariaLabel="Select Year"
                  value={selectedYear}
                  onChange={(val) => {
                    setSelectedYear(val);
                    setReportData(null);
                    setHasGenerated(false);
                  }}
                  options={YEAR_OPTIONS}
                />
              </div>
            </>
          ) : currentConfig && currentConfig.hasDate !== false ? (
            /* Daily Date Picker */
            <div className="w-full sm:col-span-1 lg:col-span-4">
              <label
                id="report-date-label"
                className="mb-2 block text-xs font-bold text-foreground"
              >
                {currentConfig?.dateLabel || "Report Date"}
              </label>
              <DateInput
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setReportData(null);
                  setHasGenerated(false);
                }}
                className="w-full"
                aria-label={currentConfig?.dateLabel || "Report Date"}
              />
            </div>
          ) : (
            /* Snapshot Badge for Non-Date Categories */
            <div className="w-full sm:col-span-1 lg:col-span-4">
              <label className="mb-2 block text-xs font-bold text-foreground">
                Data Scope
              </label>
              <div className="flex h-11 w-full items-center rounded-2xl border border-dashed border-input bg-secondary/30 px-3.5 text-xs text-muted-foreground italic select-none">
                {currentConfig ? "Current snapshot" : (t.chooseCategory || "Choose category first")}
              </div>
            </div>
          )}

          {/* Action Button: Download PDF */}
          <div className="flex items-center gap-2 w-full sm:col-span-2 lg:col-span-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloading || loading || !canGenerate}
              aria-label="Download report as PDF"
              className="scms-btn-apricot w-full h-11 text-xs font-bold flex items-center justify-center gap-2 btn-target rounded-2xl shadow-sm bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer border-none"
              title={!canGenerate ? (t.chooseTimeframePrompt || "Choose a category and timeframe first") : (t.exportPdf || "Download PDF")}
            >
              <DownloadIcon className={`w-4 h-4 shrink-0 ${downloading ? "animate-bounce" : ""}`} aria-hidden="true" />
              <span>{downloading ? "Exporting..." : t.exportPdf || "Download PDF"}</span>
            </button>
          </div>
        </div>

        {/* Informative Context Bar */}
        {currentConfig && (
          <div
            role="note"
            className="mt-4 text-xs font-medium text-muted-foreground bg-secondary/50 p-3.5 rounded-2xl border border-border/80 flex items-center gap-2.5 animate-fadeIn"
          >
            <ActivityLogIcon className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0" aria-hidden="true" />
            <span>
              <strong className="text-foreground">{currentConfig.label}:</strong> {currentConfig.description}
            </span>
          </div>
        )}
      </section>

      {/* Dedicated In-Page Full Document Report Preview */}
      {loading ? (
        <div
          role="status"
          aria-live="polite"
          className="grid place-items-center h-96 rounded-3xl border border-border/80 bg-card/95 shadow-scms"
        >
          <div className="flex flex-col items-center gap-3">
            <span className="loading loading-spinner loading-lg text-orange-600 dark:text-orange-400" />
            <span className="text-xs text-muted-foreground font-medium">
              {t.generating || "Generating official report document..."}
            </span>
          </div>
        </div>
      ) : !hasGenerated ? (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col items-center justify-center p-16 text-center rounded-3xl border border-dashed border-border/80 bg-card/95 shadow-scms space-y-4"
        >
          <div className="grid h-16 w-16 place-items-center rounded-3xl bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 shadow-xs">
            <ReaderIcon className="w-8 h-8" aria-hidden="true" />
          </div>
          <div className="max-w-md space-y-1">
            <h3 className="text-base font-bold text-foreground">
              {t.readyToGenerate || "Ready to Generate Report"}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {!reportKey
                ? (t.chooseCategoryPrompt || "Please choose a report category from the dropdown above to begin.")
                : currentConfig?.hasInterval && !intervalValue
                ? (t.chooseTimeframePrompt || "Please choose a timeframe interval above, then click Generate Report.")
                : (t.readyToGenerateDesc || "Click Generate Report to preview and export the document.")}
            </p>
          </div>
          <button
            type="button"
            onClick={loadReport}
            disabled={!canGenerate}
            className="scms-btn-apricot px-5 h-10 text-xs font-bold flex items-center gap-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white rounded-2xl shadow-xs btn-target disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer border-none"
          >
            <ReaderIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{t.generateReport || "Generate Report"}</span>
          </button>
        </div>
      ) : !reportData ? (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col items-center justify-center p-16 text-center rounded-3xl border border-dashed border-border/80 bg-card/95 shadow-scms"
        >
          <BarChartIcon className="w-12 h-12 text-muted-foreground/40 mb-3" aria-hidden="true" />
          <h3 className="text-base font-bold text-foreground">No Report Data Available</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            There are no recorded entries for this period or category. Select a different date or interval above.
          </p>
        </div>
      ) : (
        <main
          aria-label="Official Report Document Preview"
          className="bg-white text-slate-900 border border-slate-200/80 shadow-2xl rounded-2xl p-8 sm:p-12 max-w-5xl mx-auto dark:bg-slate-900 dark:text-slate-100 dark:border-slate-800 transition-all"
        >
          {/* Revenue Report Layout */}
          {reportKey === "revenue" && (
            <div className="space-y-6 font-sans">
              {/* Document Header */}
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white uppercase">
                  {intervalValue === "weekly"
                    ? "WEEKLY REVENUE"
                    : intervalValue === "monthly"
                    ? "MONTHLY REVENUE"
                    : intervalValue === "custom"
                    ? "CUSTOM REVENUE"
                    : "DAILY REVENUE"}
                </h1>
                <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200 mt-1">
                  {reportData.reportTitle ||
                    `Revenue Report (${formatDate(reportData.periodStart)} to ${formatDate(reportData.periodEnd)})`}
                </h2>
                <div className="text-xs text-slate-500 font-mono mt-1">
                  Generated: {formatDateTime(reportData.generatedAt || new Date())} UTC
                </div>
              </div>

              {/* Summary Section */}
              <div className="space-y-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Revenue Summary</h3>
                <div className="text-xs text-slate-700 dark:text-slate-300">
                  Period: {formatDate(reportData.periodStart)} to {formatDate(reportData.periodEnd)}
                </div>
                <ul className="text-xs font-semibold text-slate-800 dark:text-slate-200 space-y-1 mt-2">
                  <li className="flex items-center gap-2">
                    <span className="text-slate-700 dark:text-slate-400">▪</span>
                    <span>Transactions - {reportData.totalTransactions || 0}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-slate-700 dark:text-slate-400">▪</span>
                    <span>Amount - {formatCurrency(reportData.totalAmount)}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-slate-700 dark:text-slate-400">▪</span>
                    <span>Tax - {formatCurrency(reportData.totalTax)}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-slate-700 dark:text-slate-400">▪</span>
                    <span>Charges - {formatCurrency(reportData.totalCharges)}</span>
                  </li>
                  <li className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                    <span className="text-slate-700 dark:text-slate-400">▪</span>
                    <span>Grand Total - {formatCurrency(reportData.grandTotal)}</span>
                  </li>
                </ul>
              </div>

              {/* Breakdown by Payment Method Table */}
              {Array.isArray(reportData.byMethod) && (
                <div className="space-y-2 pt-2">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Breakdown by Payment Method
                  </h3>
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-sm">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-[#1d4ed8] text-white font-bold">
                        <tr>
                          <th className="px-3 py-2 border-r border-blue-600 last:border-r-0">Payment Method</th>
                          <th className="px-3 py-2 border-r border-blue-600 last:border-r-0">Transactions</th>
                          <th className="px-3 py-2 border-r border-blue-600 last:border-r-0">Amount</th>
                          <th className="px-3 py-2 border-r border-blue-600 last:border-r-0">Tax</th>
                          <th className="px-3 py-2 border-r border-blue-600 last:border-r-0">Charges</th>
                          <th className="px-3 py-2">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {reportData.byMethod.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-3 py-2 text-center text-slate-500 italic">
                              No payment method transactions recorded
                            </td>
                          </tr>
                        ) : (
                          reportData.byMethod.map((m, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                              <td className="px-3 py-2 font-medium border-r border-slate-200 dark:border-slate-700">
                                {m.paymentMethod || "Direct"}
                              </td>
                              <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-700 font-mono">
                                {m.count || 0}
                              </td>
                              <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-700 font-mono">
                                {formatCurrency(m.amount)}
                              </td>
                              <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-700 font-mono">
                                {formatCurrency(m.tax)}
                              </td>
                              <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-700 font-mono">
                                {formatCurrency(m.charges)}
                              </td>
                              <td className="px-3 py-2 font-bold font-mono text-slate-900 dark:text-white">
                                {formatCurrency(m.total)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Transaction Details Table */}
              <div className="space-y-2 pt-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Transaction Details
                </h3>
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-sm">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#1d4ed8] text-white font-bold">
                      <tr>
                        <th className="px-3 py-2 border-r border-blue-600 last:border-r-0 w-12 text-center">No.</th>
                        <th className="px-3 py-2 border-r border-blue-600 last:border-r-0">Appointment</th>
                        <th className="px-3 py-2 border-r border-blue-600 last:border-r-0">Patient</th>
                        <th className="px-3 py-2 border-r border-blue-600 last:border-r-0">Method</th>
                        <th className="px-3 py-2 border-r border-blue-600 last:border-r-0">Amount</th>
                        <th className="px-3 py-2 border-r border-blue-600 last:border-r-0">Tax</th>
                        <th className="px-3 py-2">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {!Array.isArray(reportData.items) || reportData.items.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-3 py-3 text-center text-slate-500 italic">
                            No transactions found for this period
                          </td>
                        </tr>
                      ) : (
                        reportData.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="px-3 py-2 text-center font-mono border-r border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="px-3 py-2 font-mono text-[11px] border-r border-slate-200 dark:border-slate-700 font-semibold">
                              {item.appointmentCode || "-"}
                            </td>
                            <td className="px-3 py-2 font-medium border-r border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                              {item.patientName || "Unknown"}
                            </td>
                            <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-700">
                              {item.paymentMethod || "Cash"}
                            </td>
                            <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-700 font-mono">
                              {formatCurrency(item.amount)}
                            </td>
                            <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-700 font-mono">
                              {formatCurrency(item.tax)}
                            </td>
                            <td className="px-3 py-2 font-bold font-mono text-slate-900 dark:text-white">
                              {formatCurrency(item.total)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Appointments Report Layout */}
          {reportKey === "appointments" && (
            <div className="space-y-6 font-sans">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white uppercase">
                  {intervalValue === "weekly"
                    ? "WEEKLY APPOINTMENTS REPORT"
                    : intervalValue === "monthly"
                    ? "MONTHLY APPOINTMENTS REPORT"
                    : intervalValue === "custom"
                    ? "CUSTOM APPOINTMENTS REPORT"
                    : "DAILY APPOINTMENTS REPORT"}
                </h1>
                <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200 mt-1">
                  {reportData.reportTitle ||
                    `Appointments Report (${formatDate(reportData.periodStart)} to ${formatDate(reportData.periodEnd)})`}
                </h2>
                <div className="text-xs text-slate-500 font-mono mt-1">
                  Generated: {formatDateTime(reportData.generatedAt || new Date())} UTC
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Appointment Summary</h3>
                <div className="text-xs text-slate-700 dark:text-slate-300">
                  Period: {formatDate(reportData.periodStart)} to {formatDate(reportData.periodEnd)}
                </div>
                <ul className="text-xs font-semibold text-slate-800 dark:text-slate-200 space-y-1 mt-2">
                  <li className="flex items-center gap-2">
                    <span className="text-slate-700 dark:text-slate-400">▪</span>
                    <span>Total Appointments - {reportData.totalAppointments || 0}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-slate-700 dark:text-slate-400">▪</span>
                    <span>Completed - {reportData.completedCount || 0}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-slate-700 dark:text-slate-400">▪</span>
                    <span>Confirmed - {reportData.confirmedCount || 0}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-slate-700 dark:text-slate-400">▪</span>
                    <span>Pending - {reportData.pendingCount || 0}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-slate-700 dark:text-slate-400">▪</span>
                    <span>Cancelled - {reportData.cancelledCount || 0}</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-2 pt-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Appointment Details
                </h3>
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-sm">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#1d4ed8] text-white font-bold">
                      <tr>
                        <th className="px-3 py-2 border-r border-blue-600 last:border-r-0 w-12 text-center">No.</th>
                        <th className="px-3 py-2 border-r border-blue-600 last:border-r-0">Appointment Code</th>
                        <th className="px-3 py-2 border-r border-blue-600 last:border-r-0">Date & Time</th>
                        <th className="px-3 py-2 border-r border-blue-600 last:border-r-0">Patient Name</th>
                        <th className="px-3 py-2 border-r border-blue-600 last:border-r-0">Status</th>
                        <th className="px-3 py-2 border-r border-blue-600 last:border-r-0">Token</th>
                        <th className="px-3 py-2">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {!Array.isArray(reportData.items) || reportData.items.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-3 py-3 text-center text-slate-500 italic">
                            No appointments found for this period
                          </td>
                        </tr>
                      ) : (
                        reportData.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="px-3 py-2 text-center font-mono border-r border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="px-3 py-2 font-mono text-[11px] border-r border-slate-200 dark:border-slate-700 font-semibold">
                              {item.appointmentCode || "-"}
                            </td>
                            <td className="px-3 py-2 font-mono border-r border-slate-200 dark:border-slate-700">
                              {formatDateTime(item.datetime)}
                            </td>
                            <td className="px-3 py-2 font-medium border-r border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                              {item.patientName || "Unknown"}
                            </td>
                            <td className="px-3 py-2 font-semibold capitalize border-r border-slate-200 dark:border-slate-700">
                              {item.status || "Unknown"}
                            </td>
                            <td className="px-3 py-2 font-mono border-r border-slate-200 dark:border-slate-700">
                              {item.tokenNumber > 0 ? `#${item.tokenNumber}` : "-"}
                            </td>
                            <td className="px-3 py-2 text-slate-600 dark:text-slate-400 truncate max-w-xs">
                              {item.notes || "-"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Business Summary Report Layout */}
          {reportKey === "businessSummary" && (
            <div className="space-y-6 font-sans">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white uppercase">
                  MONTHLY BUSINESS SUMMARY
                </h1>
                <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200 mt-1">
                  {reportData.reportTitle || "Clinic Executive Performance Report"}
                </h2>
                <div className="text-xs text-slate-500 font-mono mt-1">
                  Generated: {formatDateTime(reportData.generatedAt || new Date())} UTC
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-2 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Operational Highlights</h3>
                  <ul className="text-xs font-semibold text-slate-800 dark:text-slate-200 space-y-2 mt-2">
                    <li className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-1.5">
                      <span>New Patients Registered:</span>
                      <strong className="font-mono text-slate-900 dark:text-white">{reportData.newPatients || 0}</strong>
                    </li>
                    <li className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-1.5">
                      <span>Total Registered Patients:</span>
                      <strong className="font-mono text-slate-900 dark:text-white">{reportData.totalPatients || 0}</strong>
                    </li>
                    <li className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-1.5">
                      <span>Total Appointments:</span>
                      <strong className="font-mono text-slate-900 dark:text-white">{reportData.totalAppointments || 0}</strong>
                    </li>
                    <li className="flex justify-between pb-1">
                      <span>Total Prescriptions:</span>
                      <strong className="font-mono text-slate-900 dark:text-white">{reportData.totalPrescriptions || 0}</strong>
                    </li>
                  </ul>
                </div>

                <div className="space-y-2 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Financial Summary</h3>
                  <ul className="text-xs font-semibold text-slate-800 dark:text-slate-200 space-y-2 mt-2">
                    <li className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-1.5">
                      <span>Gross Income:</span>
                      <strong className="font-mono text-slate-900 dark:text-white">{formatCurrency(reportData.totalIncome)} MMK</strong>
                    </li>
                    <li className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-1.5">
                      <span>Tax Collected:</span>
                      <strong className="font-mono text-slate-900 dark:text-white">{formatCurrency(reportData.totalTax)} MMK</strong>
                    </li>
                    <li className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-1.5">
                      <span>Additional Charges:</span>
                      <strong className="font-mono text-slate-900 dark:text-white">{formatCurrency(reportData.totalCharges)} MMK</strong>
                    </li>
                    <li className="flex justify-between pb-1 font-bold text-slate-900 dark:text-white">
                      <span>Grand Total Revenue:</span>
                      <strong className="font-mono text-[#1d4ed8] dark:text-blue-400">
                        {formatCurrency((reportData.totalIncome || 0) + (reportData.totalTax || 0) + (reportData.totalCharges || 0))} MMK
                      </strong>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Patients Directory Report Layout */}
          {reportKey === "patients" && (
            <div className="space-y-6 font-sans">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white uppercase">
                  PATIENT DIRECTORY REPORT
                </h1>
                <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200 mt-1">
                  {reportData.reportTitle || "Clinic Patient Directory and Demographics"}
                </h2>
                <div className="text-xs text-slate-500 font-mono mt-1">
                  Generated: {formatDateTime(reportData.generatedAt || new Date())} UTC
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Demographic Summary</h3>
                <ul className="text-xs font-semibold text-slate-800 dark:text-slate-200 space-y-1 mt-2">
                  <li className="flex items-center gap-2">
                    <span>▪ Total Patients - {reportData.totalPatients || 0}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span>▪ Male Patients - {reportData.maleCount || 0}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span>▪ Female Patients - {reportData.femaleCount || 0}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span>▪ Other / Unspecified - {reportData.otherGenderCount || 0}</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-2 pt-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Patient Records
                </h3>
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-sm">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#1d4ed8] text-white font-bold">
                      <tr>
                        <th className="px-3 py-2 border-r border-blue-600 last:border-r-0 w-12 text-center">No.</th>
                        <th className="px-3 py-2 border-r border-blue-600 last:border-r-0">Name</th>
                        <th className="px-3 py-2 border-r border-blue-600 last:border-r-0">Age</th>
                        <th className="px-3 py-2 border-r border-blue-600 last:border-r-0">Gender</th>
                        <th className="px-3 py-2 border-r border-blue-600 last:border-r-0">Blood Type</th>
                        <th className="px-3 py-2 border-r border-blue-600 last:border-r-0">Mobile No.</th>
                        <th className="px-3 py-2">Registered At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {!Array.isArray(reportData.items) || reportData.items.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-3 py-3 text-center text-slate-500 italic">
                            No patient records found
                          </td>
                        </tr>
                      ) : (
                        reportData.items.map((patient, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="px-3 py-2 text-center font-mono border-r border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="px-3 py-2 font-medium border-r border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                              {patient.name || "Unknown"}
                            </td>
                            <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-700 font-mono">
                              {patient.age ? `${patient.age} yrs` : "-"}
                            </td>
                            <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-700 capitalize">
                              {patient.gender || "-"}
                            </td>
                            <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-700 font-bold text-rose-600 dark:text-rose-400">
                              {patient.bloodType || "-"}
                            </td>
                            <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-700 font-mono">
                              {patient.mobileNo || "-"}
                            </td>
                            <td className="px-3 py-2 font-mono text-slate-600 dark:text-slate-400">
                              {formatDate(patient.registeredAt)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Medicine Stock Report Layout */}
          {reportKey === "medicineStock" && (
            <div className="space-y-6 font-sans">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white uppercase">
                  MEDICINE STOCK INVENTORY
                </h1>
                <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200 mt-1">
                  {reportData.reportTitle || "Pharmacy Inventory & Batch Status Report"}
                </h2>
                <div className="text-xs text-slate-500 font-mono mt-1">
                  Generated: {formatDateTime(reportData.generatedAt || new Date())} UTC
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Inventory Summary</h3>
                <ul className="text-xs font-semibold text-slate-800 dark:text-slate-200 space-y-1 mt-2">
                  <li className="flex items-center gap-2">
                    <span>▪ Total Medicines - {reportData.totalMedicines || 0}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span>▪ Total Stock Batches - {reportData.totalBatches || 0}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span>▪ Low Stock Alerts - {reportData.lowStockCount || 0}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span>▪ Expired Batches - {reportData.expiredCount || 0}</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-2 pt-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Medicine Stock & Batches
                </h3>
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-sm">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#1d4ed8] text-white font-bold">
                      <tr>
                        <th className="px-3 py-2 border-r border-blue-600 last:border-r-0 w-12 text-center">No.</th>
                        <th className="px-3 py-2 border-r border-blue-600 last:border-r-0">Medicine Name</th>
                        <th className="px-3 py-2 border-r border-blue-600 last:border-r-0">Category</th>
                        <th className="px-3 py-2 border-r border-blue-600 last:border-r-0">Total Stock</th>
                        <th className="px-3 py-2">Batch Breakdown</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {!Array.isArray(reportData.items) || reportData.items.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-3 text-center text-slate-500 italic">
                            No inventory items found
                          </td>
                        </tr>
                      ) : (
                        reportData.items.map((med, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="px-3 py-2 text-center font-mono border-r border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="px-3 py-2 font-medium border-r border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                              {med.name || "Unknown"}
                            </td>
                            <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-700">
                              {med.category || "General"}
                            </td>
                            <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-700 font-bold font-mono">
                              {Number(med.totalQuantity || 0).toLocaleString()} units
                            </td>
                            <td className="px-3 py-2 text-[11px] text-slate-600 dark:text-slate-400">
                              {Array.isArray(med.batches) && med.batches.length > 0 ? (
                                <div className="space-y-1">
                                  {med.batches.map((b, bIdx) => (
                                    <div key={bIdx} className="flex items-center gap-2">
                                      <span className="font-mono font-semibold text-slate-900 dark:text-white">
                                        Batch #{b.batchNo}:
                                      </span>
                                      <span>{b.quantity} units</span>
                                      <span className="text-slate-400">(Exp: {formatDate(b.expiryDate)})</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                "No active batches"
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Follow-Ups Report Layout */}
          {reportKey === "followUps" && (
            <div className="space-y-6 font-sans">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white uppercase">
                  PATIENT FOLLOW-UP REPORT
                </h1>
                <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200 mt-1">
                  {reportData.reportTitle || "Patient Care Follow-Up Consultation Schedules"}
                </h2>
                <div className="text-xs text-slate-500 font-mono mt-1">
                  Generated: {formatDateTime(reportData.generatedAt || new Date())} UTC
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Care Summary</h3>
                <ul className="text-xs font-semibold text-slate-800 dark:text-slate-200 space-y-1 mt-2">
                  <li className="flex items-center gap-2">
                    <span>▪ Total Follow-Ups - {reportData.totalFollowUps || 0}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span>▪ Pending - {reportData.pendingCount || 0}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span>▪ Completed - {reportData.completedCount || 0}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span>▪ Overdue - {reportData.overdueCount || 0}</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-2 pt-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Follow-Up Details
                </h3>
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-sm">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#1d4ed8] text-white font-bold">
                      <tr>
                        <th className="px-3 py-2 border-r border-blue-600 last:border-r-0 w-12 text-center">No.</th>
                        <th className="px-3 py-2 border-r border-blue-600 last:border-r-0">Patient Name</th>
                        <th className="px-3 py-2 border-r border-blue-600 last:border-r-0">Mobile No.</th>
                        <th className="px-3 py-2 border-r border-blue-600 last:border-r-0">Due Date</th>
                        <th className="px-3 py-2 border-r border-blue-600 last:border-r-0">Recommendation</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {!Array.isArray(reportData.items) || reportData.items.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-3 py-3 text-center text-slate-500 italic">
                            No follow-up consultations found
                          </td>
                        </tr>
                      ) : (
                        reportData.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="px-3 py-2 text-center font-mono border-r border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="px-3 py-2 font-medium border-r border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                              {item.patientName || "Unknown"}
                            </td>
                            <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-700 font-mono">
                              {item.mobileNo || "-"}
                            </td>
                            <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-700 font-mono">
                              {formatDateTime(item.dueAt)}
                            </td>
                            <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-700">
                              {item.recommendation || "-"}
                            </td>
                            <td className="px-3 py-2 font-bold capitalize">
                              {item.isOverdue ? "Overdue" : item.status || "Pending"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Prescriptions Report Layout */}
          {reportKey === "prescriptions" && (
            <div className="space-y-6 font-sans">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white uppercase">
                  PRESCRIPTION REPORT
                </h1>
                <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200 mt-1">
                  {reportData.reportTitle || "Clinic Prescriptions & Medication Dispensing Log"}
                </h2>
                <div className="text-xs text-slate-500 font-mono mt-1">
                  Generated: {formatDateTime(reportData.generatedAt || new Date())} UTC
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Prescription Summary</h3>
                <ul className="text-xs font-semibold text-slate-800 dark:text-slate-200 space-y-1 mt-2">
                  <li className="flex items-center gap-2">
                    <span>▪ Total Prescriptions - {reportData.totalPrescriptions || 0}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span>▪ Total Medicines Dispensed - {reportData.totalMedicines || 0}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span>▪ Distinct Patients - {reportData.distinctPatients || 0}</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-2 pt-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Prescription Details
                </h3>
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-sm">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#1d4ed8] text-white font-bold">
                      <tr>
                        <th className="px-3 py-2 border-r border-blue-600 last:border-r-0 w-12 text-center">No.</th>
                        <th className="px-3 py-2 border-r border-blue-600 last:border-r-0">Patient Name</th>
                        <th className="px-3 py-2 border-r border-blue-600 last:border-r-0">Appointment</th>
                        <th className="px-3 py-2 border-r border-blue-600 last:border-r-0">Diagnosis</th>
                        <th className="px-3 py-2 border-r border-blue-600 last:border-r-0">Date</th>
                        <th className="px-3 py-2">Medicines Prescribed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {!Array.isArray(reportData.items) || reportData.items.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-3 py-3 text-center text-slate-500 italic">
                            No prescriptions found
                          </td>
                        </tr>
                      ) : (
                        reportData.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="px-3 py-2 text-center font-mono border-r border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="px-3 py-2 font-medium border-r border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                              {item.patientName || "Unknown"}
                            </td>
                            <td className="px-3 py-2 font-mono text-[11px] border-r border-slate-200 dark:border-slate-700">
                              {item.appointmentCode || "-"}
                            </td>
                            <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-700">
                              {item.diseaseName || "General Consultation"}
                            </td>
                            <td className="px-3 py-2 font-mono border-r border-slate-200 dark:border-slate-700">
                              {formatDate(item.createdAt)}
                            </td>
                            <td className="px-3 py-2 font-bold font-mono">
                              {item.medicineCount || 0} ({item.totalQuantity || 0} total)
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      )}
    </div>
  );
}




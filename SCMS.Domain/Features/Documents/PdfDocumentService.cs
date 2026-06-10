using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;

using SCMS.Domain.DTOs.Patients;
using SCMS.Domain.DTOs.Payments;
using SCMS.Domain.DTOs.Prescriptions;
using SCMS.Domain.DTOs.Reports;

namespace SCMS.Domain.Features.Documents
{
    public class PdfDocumentService
    {
        // ── Clinic branding constants ──────────────────────────────────
        private const string ClinicName = "Smart Clinic Management System";
        private const string ClinicTagline = "";
        private const string ClinicContact = "";
        private const string Confidential = "This document is confidential and intended for the named recipient only.";

        // ── Page geometry ──────────────────────────────────────────────
        private const float PageW = 595f;
        private const float PageH = 842f;
        private const float MarginL = 50f;
        private const float MarginR = 50f;
        private const float MarginTop = 50f;
        private const float ContentW = PageW - MarginL - MarginR;

        // ════════════════════════════════════════════════════════════════
        //  PUBLIC API
        // ════════════════════════════════════════════════════════════════

        public byte[] CreateMedicalSummaryPdf(string title, string html)
        {
            var plainText = StripHtml(html);
            var b = new PdfBuilder();
            float y = PageH - MarginTop;

            y = DrawClinicHeader(b, y, "MEDICAL SUMMARY");

            // Patient info from stripped text (best-effort)
            y = DrawSectionTitle(b, y, "Patient Information");
            foreach (var line in WrapLines(plainText, 90))
            {
                if (y < 60)
                {
                    b.AddPage();
                    y = PageH - MarginTop;
                }
                b.AddText(MarginL, y, 9, "F1", line);
                y -= 13;
            }

            DrawFooter(b, y);
            return b.Build();
        }

        public byte[] CreateMedicalSummaryPdf(MedicalSummaryResponse s)
        {
            var b = new PdfBuilder();
            float y = PageH - MarginTop;

            // ── Header ─────────────────────────────────────────────────
            y = DrawClinicHeader(b, y, "MEDICAL SUMMARY");

            b.AddText(MarginL, y, 8, "F1",
                $"Generated: {DateTime.UtcNow:dd-MM-yyyy HH:mm} UTC", gray: 0.5f);
            y -= 16;

            // ── Personal Info ──────────────────────────────────────────
            y = DrawSectionTitle(b, y, "Personal Information");
            var infoRows = new List<string[]>
            {
                new[] { "Full Name", s.PatientName },
                new[] { "Date of Birth", s.DateOfBirth.HasValue ? s.DateOfBirth.Value.ToString("dd-MM-yyyy") : "-" },
                new[] { "Gender", s.Gender ?? "Not Specified" },
                new[] { "Blood Type", s.BloodType ?? "Not Specified" }
            };
            y = DrawKeyValueTable(b, y, infoRows);
            y -= 8;

            // ── Clinical Notes & History ──────────────────────────────
            y = DrawSectionTitle(b, y, "Clinical Notes & History");
            var clinicalRows = new List<string[]>
            {
                new[] { "Allergies", s.Allergies ?? "None Known" },
                new[] { "Chronic Conditions", s.ChronicConditions ?? "None" },
                new[] { "Past Surgeries", s.PastSurgeries ?? "None" },
                new[] { "Family History", s.FamilyHistory ?? "None" },
                new[] { "Vaccination History", s.VaccinationHistory ?? "None" }
            };
            y = DrawKeyValueTable(b, y, clinicalRows);
            y -= 8;

            // ── Vitals History Table ──────────────────────────────────
            y = DrawSectionTitle(b, y, "Vital Signs Trends");
            var vitalsHeaders = new[] { "Date", "Weight (kg)", "BP (mmHg)", "Temp (°C)", "Pulse (bpm)", "SpO2 (%)", "Height (cm)", "BMI" };
            var vitalsWidths = new[] { 90f, 60f, 65f, 55f, 55f, 50f, 55f, ContentW - 430f };
            var vitalsRows = s.VitalsHistory.Select(v => new[]
            {
                v.Date.ToString("dd-MM-yyyy HH:mm"),
                v.WeightKg?.ToString("F1") ?? "-",
                v.BloodPressureSystolic.HasValue && v.BloodPressureDiastolic.HasValue
                    ? $"{v.BloodPressureSystolic}/{v.BloodPressureDiastolic}" : "-",
                v.TemperatureC?.ToString("F1") ?? "-",
                v.PulseBpm?.ToString() ?? "-",
                v.Spo2Percent?.ToString() ?? "-",
                v.HeightCm?.ToString("F1") ?? "-",
                v.Bmi?.ToString("F1") ?? "-"
            }).ToList();

            if (vitalsRows.Count == 0)
            {
                vitalsRows.Add(new[] { "-", "No vitals recorded yet", "-", "-", "-", "-", "-", "-" });
            }
            y = DrawTable(b, y, vitalsHeaders, vitalsRows, vitalsWidths);
            y -= 8;

            // ── Active Prescriptions ───────────────────────────────────
            y = DrawSectionTitle(b, y, "Active Prescriptions (Past 30 Days)");
            var rxHeaders = new[] { "Prescription #", "Date", "Diagnosis", "Medicines" };
            var rxWidths = new[] { 80f, 100f, 130f, ContentW - 310f };
            var rxRows = s.ActivePrescriptions.Select(rx => new[]
            {
                $"RX-{rx.PrescriptionId:D5}",
                rx.Date.ToString("dd-MM-yyyy"),
                rx.DiseaseName,
                string.Join(", ", rx.Medicines)
            }).ToList();

            if (rxRows.Count == 0)
            {
                rxRows.Add(new[] { "-", "No active prescriptions", "-", "-" });
            }
            y = DrawTable(b, y, rxHeaders, rxRows, rxWidths);

            DrawFooter(b, y - 30);
            return b.Build();
        }

        public byte[] CreatePrescriptionPdf(PrescriptionResponse rx)
        {
            var b = new PdfBuilder();
            float y = PageH - MarginTop;

            // ── Header ─────────────────────────────────────────────────
            y = DrawClinicHeader(b, y, "PRESCRIPTION");

            b.AddText(MarginL, y, 8, "F1",
                $"Generated: {rx.CreatedAt:dd-MM-yyyy HH:mm} UTC", gray: 0.5f);
            y -= 16;

            // ── Patient & visit info (2-column key-value table) ────────
            y = DrawSectionTitle(b, y, "Patient & Visit Details");
            var infoRows = new List<string[]>
            {
                new[] { "Prescription #", rx.Id.ToString() },
                new[] { "Patient Name", rx.PatientName ?? "-" },
                new[] { "Appointment", rx.AppointmentCode ?? "-" },
                new[] { "Diagnosis", rx.DiseaseName ?? "General Consultation" },
                new[] { "Date", rx.CreatedAt.ToString("dd-MM-yyyy HH:mm") }
            };
            y = DrawKeyValueTable(b, y, infoRows);
            y -= 8;

            // ── Vitals table ───────────────────────────────────────────
            y = DrawSectionTitle(b, y, "Vital Signs");
            var vitalsHeaders = new[] { "Weight (kg)", "BP (mmHg)", "Temp (°C)", "Pulse (bpm)", "SpO2 (%)", "Height (cm)", "BMI" };
            var vitalsData = new List<string[]>
            {
                new[]
                {
                    Fmt(rx.WeightKg),
                    rx.BloodPressureSystolic.HasValue && rx.BloodPressureDiastolic.HasValue
                        ? $"{rx.BloodPressureSystolic}/{rx.BloodPressureDiastolic}" : "-",
                    Fmt(rx.TemperatureC),
                    Fmt(rx.PulseBpm),
                    Fmt(rx.Spo2Percent),
                    Fmt(rx.HeightCm),
                    Fmt(rx.Bmi)
                }
            };
            y = DrawTable(b, y, vitalsHeaders, vitalsData, EvenColumnWidths(7));
            y -= 8;

            // ── Medicines table ────────────────────────────────────────
            y = DrawSectionTitle(b, y, "Prescribed Medicines");
            var medHeaders = new[] { "No.", "Medicine", "Dosage", "Qty", "Days", "Instruction" };
            var medWidths = new[] { 30f, 150f, 75f, 40f, 40f, ContentW - 335f };
            var medRows = rx.Items.Select((item, idx) => new[]
            {
                (idx + 1).ToString(),
                item.MedicineName ?? "-",
                item.Dosage ?? "-",
                item.Quantity.ToString(),
                item.Days.ToString(),
                BuildInstruction(item)
            }).ToList();

            if (medRows.Count == 0)
            {
                medRows.Add(new[] { "-", "No medicines prescribed", "-", "-", "-", "-" });
            }
            y = DrawTable(b, y, medHeaders, medRows, medWidths);
            y -= 8;

            // ── Lab requests ───────────────────────────────────────────
            if (!string.IsNullOrWhiteSpace(rx.LabTestRequests))
            {
                y = DrawSectionTitle(b, y, "Lab Test Requests");
                b.AddText(MarginL + 5, y, 9, "F1", rx.LabTestRequests);
                y -= 14;
            }

            // ── Notes ──────────────────────────────────────────────────
            if (!string.IsNullOrWhiteSpace(rx.Notes))
            {
                y = DrawSectionTitle(b, y, "Doctor's Notes");
                foreach (var line in WrapLines(rx.Notes, 90))
                {
                    b.AddText(MarginL + 5, y, 9, "F1", line);
                    y -= 13;
                }
            }

            // ── Signature line ─────────────────────────────────────────
            y -= 30;
            b.AddLine(MarginL + 300, y, MarginL + ContentW, y, 0.5f);
            b.AddText(MarginL + 340, y - 12, 8, "F1", "Authorized Signature");

            DrawFooter(b, y - 30);
            return b.Build();
        }

        public byte[] CreatePrescriptionReportPdf(PrescriptionReportResponse report)
        {
            var b = new PdfBuilder();
            float y = PageH - MarginTop;

            y = DrawClinicHeader(b, y, "PRESCRIPTION REPORT");

            b.AddText(MarginL, y, 12, "F2", report.ReportTitle);
            y -= 14;
            b.AddText(MarginL, y, 8, "F1",
                $"Generated: {report.GeneratedAt:dd-MM-yyyy HH:mm} UTC", gray: 0.5f);
            y -= 16;

            y = DrawSectionTitle(b, y, "Summary");
            var stats = new List<(string, string, string)>
            {
                ("Total Prescriptions", report.TotalPrescriptions.ToString(), "0.1 0.4 0.8"),
                ("Total Medicines", report.TotalMedicines.ToString(), "0.1 0.7 0.3"),
                ("Patients", report.DistinctPatients.ToString(), "0.5 0.2 0.7")
            };
            y = DrawStatsRow(b, y, stats);

            y = DrawSectionTitle(b, y, "Prescription Details");
            var headers = new[] { "No.", "Patient Name", "Appointment", "Diagnosis", "Date", "Items" };
            var colWidths = new[] { 30f, 130f, 100f, 120f, 80f, ContentW - 460f };

            var dataRows = report.Items.Select((item, idx) => new[]
            {
                (idx + 1).ToString(),
                item.PatientName,
                item.AppointmentCode,
                item.DiseaseName ?? "-",
                item.CreatedAt.ToString("dd-MM-yyyy"),
                $"{item.MedicineCount} ({item.TotalQuantity} total)"
            }).ToList();

            if (dataRows.Count == 0)
            {
                dataRows.Add(new[] { "-", "No prescriptions found", "-", "-", "-", "-" });
            }

            int rowIdx = 0;
            bool firstPage = true;
            while (rowIdx < dataRows.Count)
            {
                if (!firstPage)
                {
                    b.AddPage();
                    y = PageH - MarginTop;
                    y = DrawClinicHeader(b, y, "PRESCRIPTION REPORT");
                    b.AddText(MarginL, y, 10, "F2", report.ReportTitle + " (continued)");
                    y -= 16;
                }

                float availableH = y - 70;
                float headerH = 20f;
                float rowH = 18f;
                int maxRows = Math.Max(1, (int)((availableH - headerH) / rowH));
                int endIdx = Math.Min(rowIdx + maxRows, dataRows.Count);

                var pageRows = dataRows.GetRange(rowIdx, endIdx - rowIdx);
                y = DrawTable(b, y, headers, pageRows, colWidths);
                rowIdx = endIdx;
                firstPage = false;
            }

            DrawFooter(b, y - 30);
            return b.Build();
        }

        public byte[] CreateInvoicePdf(PaymentDetailsResponse payment)
        {
            var total = payment.Amount + payment.Tax + payment.Charges;
            var b = new PdfBuilder();
            float y = PageH - MarginTop;

            // ── Header ─────────────────────────────────────────────────
            y = DrawClinicHeader(b, y, "INVOICE");

            // ── Invoice meta (2-column key-value) ──────────────────────
            y = DrawSectionTitle(b, y, "Invoice Details");
            var infoRows = new List<string[]>
            {
                new[] { "Invoice #", $"INV-{payment.Id:D5}" },
                new[] { "Patient Name", payment.PatientName ?? "-" },
                new[] { "Appointment", payment.AppointmentCode ?? "-" },
                new[] { "Payment Method", payment.PaymentMethod ?? "-" },
                new[] { "Status", payment.PaymentStatus ?? "-" },
                new[] { "Date", payment.PaidAt?.ToString("dd-MM-yyyy HH:mm") ?? "Unpaid" }
            };
            y = DrawKeyValueTable(b, y, infoRows);
            y -= 8;

            // ── Charges breakdown table ────────────────────────────────
            y = DrawSectionTitle(b, y, "Charges Breakdown");
            var chargeHeaders = new[] { "Description", "Amount" };
            var chargeWidths = new[] { ContentW - 120f, 120f };
            var chargeRows = new List<string[]>
            {
                new[] { "Consultation / Service Fee", payment.Amount.ToString("N2") },
                new[] { "Tax", payment.Tax.ToString("N2") },
                new[] { "Additional Charges", payment.Charges.ToString("N2") }
            };
            y = DrawTable(b, y, chargeHeaders, chargeRows, chargeWidths);

            // ── Grand total row ────────────────────────────────────────
            float totalRowH = 22;
            // Dark background for total row
            b.AddRect(MarginL, y - totalRowH, ContentW, totalRowH, fill: true, fillGray: 0.15f);
            b.AddText(MarginL + 8, y - 15, 10, "F2", "GRAND TOTAL", gray: 1f);
            b.AddText(MarginL + ContentW - 115, y - 15, 10, "F2", total.ToString("N2"), gray: 1f);
            y -= totalRowH + 8;

            // ── Payment status badge ───────────────────────────────────
            var statusText = $"Payment Status: {(payment.PaymentStatus ?? "unknown").ToUpper()}";
            b.AddText(MarginL + 5, y, 9, "F2", statusText);
            y -= 20;

            // ── Signature line ─────────────────────────────────────────
            y -= 20;
            b.AddLine(MarginL + 300, y, MarginL + ContentW, y, 0.5f);
            b.AddText(MarginL + 350, y - 12, 8, "F1", "Cashier Signature");

            DrawFooter(b, y - 30);
            return b.Build();
        }

        public byte[] CreateAppointmentReportPdf(AppointmentReportResponse report)
        {
            var b = new PdfBuilder();
            float y = PageH - MarginTop;

            // ── Header ─────────────────────────────────────────────────
            var docType = report.ReportType == "weekly" ? "WEEKLY REPORT" : "DAILY REPORT";
            y = DrawClinicHeader(b, y, docType);

            // ── Report title ───────────────────────────────────────────
            b.AddText(MarginL, y, 12, "F2", report.ReportTitle);
            y -= 14;
            y -= 16;

            // ── Summary statistics (key-value table) ───────────────────
            y = DrawSectionTitle(b, y, "Summary");
            if (report.ReportType != "daily")
            {
                b.AddText(MarginL, y, 9, "F1", $"Period: {report.PeriodStart:dd-MM-yyyy} to {report.PeriodEnd:dd-MM-yyyy}");
                y -= 16;
            }
            var stats = new List<(string, string, string)>
            {
                ("Total", report.TotalAppointments.ToString(), "0.1 0.4 0.8"),
                ("Completed", report.CompletedCount.ToString(), "0.1 0.7 0.3"),
                ("Confirmed", report.ConfirmedCount.ToString(), "0.5 0.2 0.7"),
                ("Pending", report.PendingCount.ToString(), "0.9 0.5 0.1"),
                ("Cancelled", report.CancelledCount.ToString(), "0.8 0.2 0.2")
            };
            y = DrawStatsRow(b, y, stats);
            y -= 10;

            // ── Appointment list table ──────────────────────────────────
            var headers = new[] { "No.", "Code", "Date", "Time", "Patient Name", "Status", "Token" };
            var colWidths = new[] { 30f, 90f, 75f, 50f, 120f, 70f, ContentW - 435f };

            if (report.ReportType == "weekly")
            {
                // Split by day for weekly reports
                var groupedByDay = report.Items
                    .GroupBy(i => i.Datetime.Date)
                    .OrderBy(g => g.Key)
                    .ToList();

                foreach (var dayGroup in groupedByDay)
                {
                    // Check if we need a new page (reserve space for day title + header + at least 1 row)
                    if (y < 120)
                    {
                        b.AddPage();
                        y = PageH - MarginTop;
                        y = DrawClinicHeader(b, y, docType);
                        b.AddText(MarginL, y, 10, "F2", report.ReportTitle + " (continued)");
                        y -= 16;
                    }

                    // Day sub-heading
                    y = DrawSectionTitle(b, y, dayGroup.Key.ToString("dddd, dd-MM-yyyy"));

                    var dayRows = dayGroup.Select((item, idx) => new[]
                    {
                        (idx + 1).ToString(),
                        item.AppointmentCode,
                        item.Datetime.ToString("dd-MM-yyyy"),
                        item.Datetime.ToString("HH:mm"),
                        item.PatientName,
                        CapitalizeFirst(item.Status),
                        item.TokenNumber > 0 ? item.TokenNumber.ToString() : "-"
                    }).ToList();

                    // Handle multi-page for large day groups
                    int rowIdx = 0;
                    bool firstChunk = true;
                    while (rowIdx < dayRows.Count)
                    {
                        if (!firstChunk)
                        {
                            b.AddPage();
                            y = PageH - MarginTop;
                            y = DrawClinicHeader(b, y, docType);
                            b.AddText(MarginL, y, 10, "F2", report.ReportTitle + " (continued)");
                            y -= 16;
                        }

                        float availableH = y - 70;
                        float headerH = 20f;
                        float rowH = 18f;
                        int maxRows = Math.Max(1, (int)((availableH - headerH) / rowH));
                        int endIdx = Math.Min(rowIdx + maxRows, dayRows.Count);

                        var pageRows = dayRows.GetRange(rowIdx, endIdx - rowIdx);
                        y = DrawTable(b, y, headers, pageRows, colWidths);
                        rowIdx = endIdx;
                        firstChunk = false;
                    }
                    y -= 14;
                }

                if (groupedByDay.Count == 0)
                {
                    y = DrawSectionTitle(b, y, "Appointment Details");
                    var emptyRows = new List<string[]> { new[] { "-", "No appointments", "-", "-", "-", "-", "-" } };
                    y = DrawTable(b, y, headers, emptyRows, colWidths);
                }
            }
            else
            {
                // Daily report: single table
                y = DrawSectionTitle(b, y, "Appointment Details");

                var dataRows = report.Items.Select((item, idx) => new[]
                {
                    (idx + 1).ToString(),
                    item.AppointmentCode,
                    item.Datetime.ToString("dd-MM-yyyy"),
                    item.Datetime.ToString("HH:mm"),
                    item.PatientName,
                    CapitalizeFirst(item.Status),
                    item.TokenNumber > 0 ? item.TokenNumber.ToString() : "-"
                }).ToList();

                if (dataRows.Count == 0)
                {
                    dataRows.Add(new[] { "-", "No appointments", "-", "-", "-", "-", "-" });
                }

                // Handle multi-page: draw table in chunks
                int rowIdx = 0;
                bool firstPage = true;
                while (rowIdx < dataRows.Count)
                {
                    if (!firstPage)
                    {
                        b.AddPage();
                        y = PageH - MarginTop;
                        y = DrawClinicHeader(b, y, docType);
                        b.AddText(MarginL, y, 10, "F2", report.ReportTitle + " (continued)");
                        y -= 16;
                    }

                    float availableH = y - 70;
                    float headerH = 20f;
                    float rowH = 18f;
                    int maxRows = Math.Max(1, (int)((availableH - headerH) / rowH));
                    int endIdx = Math.Min(rowIdx + maxRows, dataRows.Count);

                    var pageRows = dataRows.GetRange(rowIdx, endIdx - rowIdx);
                    y = DrawTable(b, y, headers, pageRows, colWidths);
                    rowIdx = endIdx;
                    firstPage = false;
                }
            }

            DrawFooter(b, y - 30);
            return b.Build();
        }

        public byte[] CreateRevenueReportPdf(RevenueReportResponse report)
        {
            var b = new PdfBuilder();
            float y = PageH - MarginTop;

            // ── Header ─────────────────────────────────────────────────
            var docType = report.ReportType switch
            {
                "weekly" => "WEEKLY REVENUE",
                "monthly" => "MONTHLY REVENUE",
                _ => "DAILY REVENUE"
            };
            y = DrawClinicHeader(b, y, docType);

            // ── Report title ───────────────────────────────────────────
            b.AddText(MarginL, y, 12, "F2", report.ReportTitle);
            y -= 14;
            b.AddText(MarginL, y, 8, "F1",
                $"Generated: {report.GeneratedAt:dd-MM-yyyy HH:mm} UTC", gray: 0.5f);
            y -= 16;

            // ── Summary (key-value table) ──────────────────────────────
            y = DrawSectionTitle(b, y, "Revenue Summary");
            if (report.ReportType != "daily")
            {
                b.AddText(MarginL, y, 9, "F1", $"Period: {report.PeriodStart:dd-MM-yyyy} to {report.PeriodEnd:dd-MM-yyyy}");
                y -= 16;
            }
            var stats = new List<(string, string, string)>
            {
                ("Transactions", report.TotalTransactions.ToString(), "0.5 0.5 0.5"),
                ("Amount", report.TotalAmount.ToString("N2"), "0.1 0.4 0.8"),
                ("Tax", report.TotalTax.ToString("N2"), "0.8 0.2 0.2"),
                ("Charges", report.TotalCharges.ToString("N2"), "0.9 0.5 0.1"),
                ("Grand Total", report.GrandTotal.ToString("N2"), "0.1 0.7 0.3")
            };
            y = DrawStatsRow(b, y, stats);

            // ── Revenue by Payment Method ──────────────────────────────
            y = DrawSectionTitle(b, y, "Breakdown by Payment Method");
            var methodHeaders = new[] { "Payment Method", "Transactions", "Amount", "Tax", "Charges", "Total" };
            var methodWidths = new[] { 130f, 80f, 90f, 70f, 70f, ContentW - 440f };
            var methodRows = report.ByMethod.Select(m => new[]
            {
                CapitalizeFirst(m.PaymentMethod),
                m.Count.ToString(),
                m.Amount.ToString("N2"),
                m.Tax.ToString("N2"),
                m.Charges.ToString("N2"),
                m.Total.ToString("N2")
            }).ToList();

            if (methodRows.Count == 0)
            {
                methodRows.Add(new[] { "No payments", "-", "-", "-", "-", "-" });
            }
            y = DrawTable(b, y, methodHeaders, methodRows, methodWidths);
            y -= 12;

            // ── Detailed Transactions table ────────────────────────────
            y = DrawSectionTitle(b, y, "Transaction Details");
            var txHeaders = new[] { "No.", "Appointment", "Patient", "Method", "Amount", "Tax", "Total" };
            var txWidths = new[] { 30f, 100f, 130f, 70f, 70f, 60f, ContentW - 460f };

            var txRows = report.Items.Select((item, idx) => new[]
            {
                (idx + 1).ToString(),
                item.AppointmentCode,
                item.PatientName,
                CapitalizeFirst(item.PaymentMethod),
                item.Amount.ToString("N2"),
                item.Tax.ToString("N2"),
                item.Total.ToString("N2"),
                item.PaidAt?.ToString("dd-MM-yyyy") ?? "-",
                item.Total.ToString("N2")
            }).ToList();

            if (txRows.Count == 0)
            {
                txRows.Add(new[] { "-", "No transactions", "-", "-", "-", "-", "-" });
            }

            // Handle multi-page
            int rowIdx = 0;
            bool firstPage = true;
            while (rowIdx < txRows.Count)
            {
                if (!firstPage)
                {
                    b.AddPage();
                    y = PageH - MarginTop;
                    y = DrawClinicHeader(b, y, docType);
                    b.AddText(MarginL, y, 10, "F2", report.ReportTitle + " (continued)");
                    y -= 16;
                }

                float availableH = y - 70;
                float headerH = 20f;
                float rowH = 18f;
                int maxRows = Math.Max(1, (int)((availableH - headerH) / rowH));
                int endIdx = Math.Min(rowIdx + maxRows, txRows.Count);

                var pageRows = txRows.GetRange(rowIdx, endIdx - rowIdx);
                y = DrawTable(b, y, txHeaders, pageRows, txWidths);
                rowIdx = endIdx;
                firstPage = false;
            }

            // ── Grand total row ────────────────────────────────────────
            y -= 8;
            float totRowH = 22;
            b.AddRect(MarginL, y - totRowH, ContentW, totRowH, fill: true, fillGray: 0.15f);
            b.AddRect(MarginL, y - totRowH, ContentW, totRowH);
            b.AddText(MarginL + 8, y - 15, 10, "F2", "GRAND TOTAL", gray: 1f);
            b.AddText(MarginL + ContentW - 115, y - 15, 10, "F2",
                report.GrandTotal.ToString("N2"), gray: 1f);
            y -= totRowH;

            // ── Signature ──────────────────────────────────────────────


            DrawFooter(b, y - 30);
            return b.Build();
        }

        public byte[] CreatePatientListReportPdf(PatientListReportResponse report)
        {
            var b = new PdfBuilder();
            float y = PageH - MarginTop;

            // ── Header ─────────────────────────────────────────────────
            y = DrawClinicHeader(b, y, "PATIENT LIST");

            // ── Title ──────────────────────────────────────────────────
            b.AddText(MarginL, y, 12, "F2", report.ReportTitle);
            y -= 14;
            b.AddText(MarginL, y, 8, "F1",
                $"Generated: {report.GeneratedAt:dd-MM-yyyy HH:mm} UTC", gray: 0.5f);
            y -= 16;

            // ── Summary (key-value table) ──────────────────────────────
            y = DrawSectionTitle(b, y, "Summary");
            var stats = new List<(string, string, string)>
            {
                ("Total Patients", report.TotalPatients.ToString(), "0.1 0.4 0.8"),
                ("Male", report.MaleCount.ToString(), "0.1 0.7 0.3"),
                ("Female", report.FemaleCount.ToString(), "0.8 0.2 0.5")
            };
            y = DrawStatsRow(b, y, stats);

            // ── Patient list table ─────────────────────────────────────
            y = DrawSectionTitle(b, y, "Patient Details");
            var headers = new[] { "No.", "Name", "Age", "Gender", "Blood Type", "Contact", "Registered" };
            var colWidths = new[] { 30f, 130f, 40f, 60f, 65f, 120f, ContentW - 445f };

            var dataRows = report.Items.Select((item, idx) => new[]
            {
                (idx + 1).ToString(),
                item.Name,
                item.Age?.ToString() ?? "-",
                item.Gender,
                item.BloodType,
                item.MobileNo ?? item.Email ?? "-",
                item.RegisteredAt.ToString("dd-MM-yyyy")
            }).ToList();

            if (dataRows.Count == 0)
            {
                dataRows.Add(new[] { "-", "No patients found", "-", "-", "-", "-", "-" });
            }

            // Handle multi-page
            int rowIdx = 0;
            bool firstPage = true;
            while (rowIdx < dataRows.Count)
            {
                if (!firstPage)
                {
                    b.AddPage();
                    y = PageH - MarginTop;
                    y = DrawClinicHeader(b, y, "PATIENT LIST");
                    b.AddText(MarginL, y, 10, "F2", report.ReportTitle + " (continued)");
                    y -= 16;
                }

                float availableH = y - 70;
                float headerH = 20f;
                float rowH = 18f;
                int maxRows = Math.Max(1, (int)((availableH - headerH) / rowH));
                int endIdx = Math.Min(rowIdx + maxRows, dataRows.Count);

                var pageRows = dataRows.GetRange(rowIdx, endIdx - rowIdx);
                y = DrawTable(b, y, headers, pageRows, colWidths);
                rowIdx = endIdx;
                firstPage = false;
            }



            // ── Signature ──────────────────────────────────────────────


            DrawFooter(b, y - 30);
            return b.Build();
        }

        public byte[] CreateMedicineStockReportPdf(MedicineStockReportResponse report)
        {
            var b = new PdfBuilder();
            float y = PageH - MarginTop;

            // ── Header ─────────────────────────────────────────────────
            y = DrawClinicHeader(b, y, "MEDICINE STOCK REPORT");

            // ── Title ──────────────────────────────────────────────────
            b.AddText(MarginL, y, 12, "F2", report.ReportTitle);
            y -= 14;
            b.AddText(MarginL, y, 8, "F1",
                $"Generated: {report.GeneratedAt:dd-MM-yyyy HH:mm} UTC", gray: 0.5f);
            y -= 16;

            // ── Summary (key-value table) ──────────────────────────────
            y = DrawSectionTitle(b, y, "Inventory Summary");
            var stats = new List<(string, string, string)>
            {
                ("Total Medicines", report.TotalMedicines.ToString(), "0.1 0.4 0.8"),
                ("Total Batches", report.TotalBatches.ToString(), "0.5 0.5 0.5"),
                ("Low Stock", report.LowStockCount.ToString(), "0.9 0.5 0.1"),
                ("Expired", report.ExpiredCount.ToString(), "0.8 0.2 0.2")
            };
            y = DrawStatsRow(b, y, stats);

            // ── Stock list table ─────────────────────────────────────
            y = DrawSectionTitle(b, y, "Medicine Stock Details");
            var headers = new[] { "No.", "Medicine Name", "Category", "Batch No", "Quantity", "Expiry Date", "Status" };
            var colWidths = new[] { 30f, 130f, 90f, 70f, 60f, 70f, ContentW - 450f };

            var dataRows = new List<string[]>();
            int idx = 1;

            foreach (var m in report.Items)
            {
                if (m.Batches.Count == 0)
                {
                    dataRows.Add(new[]
                    {
                        idx.ToString(),
                        m.Name,
                        m.Category,
                        "-",
                        "0",
                        "-",
                        "Out of Stock"
                    });
                    idx++;
                    continue;
                }

                foreach (var batch in m.Batches)
                {
                    string status = CapitalizeFirst(batch.Status);
                    if (batch.IsExpired) status = "Expired";
                    else if (batch.IsLowStock) status = "Low Stock";

                    dataRows.Add(new[]
                    {
                        idx.ToString(),
                        m.Name,
                        m.Category,
                        batch.BatchNo,
                        batch.Quantity.ToString(),
                        batch.ExpiryDate.ToString("dd-MM-yyyy"),
                        status
                    });
                    idx++;
                }
            }

            if (dataRows.Count == 0)
            {
                dataRows.Add(new[] { "-", "No medicines found", "-", "-", "-", "-", "-" });
            }

            // Handle multi-page
            int rowIdx = 0;
            bool firstPage = true;
            while (rowIdx < dataRows.Count)
            {
                if (!firstPage)
                {
                    b.AddPage();
                    y = PageH - MarginTop;
                    y = DrawClinicHeader(b, y, "MEDICINE STOCK REPORT");
                    b.AddText(MarginL, y, 10, "F2", report.ReportTitle + " (continued)");
                    y -= 16;
                }

                float availableH = y - 70;
                float headerH = 20f;
                float rowH = 18f;
                int maxRows = Math.Max(1, (int)((availableH - headerH) / rowH));
                int endIdx = Math.Min(rowIdx + maxRows, dataRows.Count);

                var pageRows = dataRows.GetRange(rowIdx, endIdx - rowIdx);
                y = DrawTable(b, y, headers, pageRows, colWidths);
                rowIdx = endIdx;
                firstPage = false;
            }



            // ── Signature ──────────────────────────────────────────────


            DrawFooter(b, y - 30);
            return b.Build();
        }

        public byte[] CreateFollowUpReportPdf(FollowUpReportResponse report)
        {
            var b = new PdfBuilder();
            float y = PageH - MarginTop;

            // ── Header ─────────────────────────────────────────────────
            y = DrawClinicHeader(b, y, "FOLLOW-UP REPORT");

            // ── Title ──────────────────────────────────────────────────
            b.AddText(MarginL, y, 12, "F2", report.ReportTitle);
            y -= 14;
            b.AddText(MarginL, y, 8, "F1",
                $"Generated: {report.GeneratedAt:dd-MM-yyyy HH:mm} UTC", gray: 0.5f);
            y -= 16;

            // ── Summary (key-value table) ──────────────────────────────
            y = DrawSectionTitle(b, y, "Follow-Up Summary");
            string periodStr = report.PeriodStart == DateTime.MinValue ? "All Time" : $"{report.PeriodStart:dd-MM-yyyy} to {report.PeriodEnd?.ToString("dd-MM-yyyy") ?? "present"}";
            b.AddText(MarginL, y, 9, "F1", $"Period: {periodStr}");
            y -= 16;
            var stats = new List<(string, string, string)>
            {
                ("Total", report.TotalFollowUps.ToString(), "0.1 0.4 0.8"),
                ("Pending", report.PendingCount.ToString(), "0.9 0.5 0.1"),
                ("Completed", report.CompletedCount.ToString(), "0.1 0.7 0.3"),
                ("Overdue", report.OverdueCount.ToString(), "0.8 0.2 0.2")
            };
            y = DrawStatsRow(b, y, stats);

            // ── Follow-Up list table ───────────────────────────────────
            y = DrawSectionTitle(b, y, "Follow-Up Details");
            var headers = new[] { "No.", "Patient Name", "Contact", "Due Date", "Status", "Recommendation" };
            var colWidths = new[] { 30f, 130f, 90f, 80f, 70f, ContentW - 400f };

            var dataRows = report.Items.Select((item, idx) =>
            {
                string status = CapitalizeFirst(item.Status);
                if (item.IsOverdue) status = "Overdue";

                return new[]
                {
                    (idx + 1).ToString(),
                    item.PatientName,
                    item.MobileNo ?? "-",
                    item.DueAt.ToString("dd-MM-yyyy HH:mm"),
                    status,
                    item.Recommendation
                };
            }).ToList();

            if (dataRows.Count == 0)
            {
                dataRows.Add(new[] { "-", "No follow-ups found", "-", "-", "-", "-" });
            }

            // Handle multi-page
            int rowIdx = 0;
            bool firstPage = true;
            while (rowIdx < dataRows.Count)
            {
                if (!firstPage)
                {
                    b.AddPage();
                    y = PageH - MarginTop;
                    y = DrawClinicHeader(b, y, "FOLLOW-UP REPORT");
                    b.AddText(MarginL, y, 10, "F2", report.ReportTitle + " (continued)");
                    y -= 16;
                }

                float availableH = y - 70;
                float headerH = 20f;
                float rowH = 18f;
                int maxRows = Math.Max(1, (int)((availableH - headerH) / rowH));
                int endIdx = Math.Min(rowIdx + maxRows, dataRows.Count);

                var pageRows = dataRows.GetRange(rowIdx, endIdx - rowIdx);
                y = DrawTable(b, y, headers, pageRows, colWidths);
                rowIdx = endIdx;
                firstPage = false;
            }



            // ── Signature ──────────────────────────────────────────────


            DrawFooter(b, y - 30);
            return b.Build();
        }

        public byte[] CreateBusinessSummaryReportPdf(BusinessSummaryReportResponse report)
        {
            var grandTotal = report.TotalIncome + report.TotalTax + report.TotalCharges;
            var b = new PdfBuilder();
            float y = PageH - MarginTop;

            // ── Header ─────────────────────────────────────────────────
            y = DrawClinicHeader(b, y, "BUSINESS SUMMARY");

            // ── Title ──────────────────────────────────────────────────
            b.AddText(MarginL, y, 12, "F2", report.ReportTitle);
            y -= 14;
            b.AddText(MarginL, y, 8, "F1",
                $"Generated: {report.GeneratedAt:dd-MM-yyyy HH:mm} UTC", gray: 0.5f);
            y -= 10;
            b.AddText(MarginL, y, 9, "F1", $"Period: {report.PeriodStart:dd-MM-yyyy} to {report.PeriodEnd:dd-MM-yyyy}");
            y -= 20;

            // ── Patient Overview (key-value table) ──────────────────────
            y = DrawSectionTitle(b, y, "Patient Overview");
            var patientRows = new List<string[]>
            {
                new[] { "Total Registered Patients", report.TotalPatients.ToString() },
                new[] { "New Patients (This Month)", report.NewPatients.ToString() }
            };
            y = DrawKeyValueTable(b, y, patientRows);
            y -= 12;

            // ── Clinical Activity ────────────────────────────────────────
            y = DrawSectionTitle(b, y, "Clinical Activity");
            var activityRows = new List<string[]>
            {
                new[] { "Total Appointments", report.TotalAppointments.ToString() },
                new[] { "Total Prescriptions", report.TotalPrescriptions.ToString() }
            };
            y = DrawKeyValueTable(b, y, activityRows);
            y -= 12;

            // ── Financial Summary (table) ────────────────────────────────
            y = DrawSectionTitle(b, y, "Financial Summary");
            var finHeaders = new[] { "Category", "Amount" };
            var finWidths = new[] { ContentW - 140f, 140f };
            var finRows = new List<string[]>
            {
                new[] { "Service Income", report.TotalIncome.ToString("N2") },
                new[] { "Tax Collected", report.TotalTax.ToString("N2") },
                new[] { "Additional Charges", report.TotalCharges.ToString("N2") }
            };
            y = DrawTable(b, y, finHeaders, finRows, finWidths);

            // ── Grand total row ────────────────────────────────────────
            float totRowH = 22;
            b.AddRect(MarginL, y - totRowH, ContentW, totRowH, fill: true, fillRgb: "0.1 0.3 0.6");
            b.AddText(MarginL + 8, y - 15, 10, "F2", "GRAND TOTAL", gray: 1f);
            b.AddText(MarginL + ContentW - 135, y - 15, 10, "F2", grandTotal.ToString("N2"), gray: 1f);
            y -= totRowH;

            DrawFooter(b, y - 30);
            return b.Build();
        }

        private static string CapitalizeFirst(string s)
        {
            if (string.IsNullOrEmpty(s)) return "-";
            return char.ToUpper(s[0]) + s[1..];
        }

        // ════════════════════════════════════════════════════════════════
        //  DRAWING HELPERS
        // ════════════════════════════════════════════════════════════════

        /// <summary>Draws the standard clinic header and returns new Y position.</summary>
        private static float DrawClinicHeader(PdfBuilder b, float y, string documentType)
        {
            y -= 18;

            // Document type as main heading (bold, large)
            b.AddText(MarginL, y, 16, "F2", documentType);
            
            y -= 30;
            return y;
        }

        /// <summary>Draws a section title with an underline.</summary>
        private static float DrawSectionTitle(PdfBuilder b, float y, string title)
        {
            b.AddText(MarginL, y, 11, "F2", title);
            y -= 15;
            return y;
        }

        /// <summary>Draws a 2-column key-value info table with borders.</summary>
        /// <summary>Draws a 2-column key-value info table with borders.</summary>
        private static float DrawKeyValueTable(PdfBuilder b, float y, List<string[]> rows)
        {
            float labelW = 150f;
            float valueW = ContentW - labelW;
            float rowH = 18f;

            foreach (var row in rows)
            {
                // Light blue background on label cell with border
                b.AddRect(MarginL, y - rowH, labelW, rowH, fill: true, fillRgb: "0.92 0.96 1.0");
                // Value cell border
                b.AddRect(MarginL + labelW, y - rowH, valueW, rowH, fill: false);

                b.AddText(MarginL + 5, y - 13, 9, "F2", row[0]);
                b.AddText(MarginL + labelW + 5, y - 13, 9, "F1", row.Length > 1 ? row[1] : "");
                y -= rowH;
            }
            return y;
        }

        private static float DrawStatsRow(PdfBuilder b, float y, List<(string label, string value, string color)> stats)
        {
            foreach (var stat in stats)
            {
                // Draw bullet point (small square)
                b.AddRect(MarginL, y - 6, 3, 3, fill: true, fillGray: 0f);
                
                b.AddText(MarginL + 10, y - 8, 9, "F2", $"{stat.label} - {stat.value}");
                y -= 16;
            }
            return y - 6;
        }

        /// <summary>Draws a full table with header row, borders on every cell.</summary>
        private static float DrawTable(PdfBuilder b, float y, string[] headers, List<string[]> dataRows, float[] colWidths)
        {
            float rowH = 18f;
            float headerH = 20f;
            int cols = headers.Length;

            // ── Header row (dark blue background, white text) ───────────────
            float x = MarginL;
            for (int c = 0; c < cols; c++)
            {
                b.AddRect(x, y - headerH, colWidths[c], headerH, fill: true, fillRgb: "0.1 0.3 0.6");
                b.AddText(x + 4, y - 14, 8, "F2", Truncate(headers[c], colWidths[c], 8), gray: 1f);
                x += colWidths[c];
            }
            y -= headerH;

            // ── Data rows (alternating light blue) ─────────────────────
            for (int r = 0; r < dataRows.Count; r++)
            {
                x = MarginL;
                bool even = r % 2 == 0;
                for (int c = 0; c < cols; c++)
                {
                    if (even)
                    {
                        b.AddRect(x, y - rowH, colWidths[c], rowH, fill: true, fillRgb: "0.92 0.96 1.0");
                    }
                    else
                    {
                        b.AddRect(x, y - rowH, colWidths[c], rowH, fill: false);
                    }
                    string cellText = c < dataRows[r].Length ? dataRows[r][c] : "";
                    b.AddText(x + 4, y - 13, 8, "F1", Truncate(cellText, colWidths[c], 8));
                    x += colWidths[c];
                }
                y -= rowH;
            }
            return y;
        }

        /// <summary>Draws the confidential footer at the bottom of the page.</summary>
        private static void DrawFooter(PdfBuilder b, float y)
        {
            float footerY = 40;
            b.AddLine(MarginL, footerY + 10, MarginL + ContentW, footerY + 10, 0.3f);
            b.AddText(MarginL, footerY, 7, "F1", Confidential, gray: 0.55f);
        }

        // ════════════════════════════════════════════════════════════════
        //  UTILITY METHODS
        // ════════════════════════════════════════════════════════════════

        private static float[] EvenColumnWidths(int count)
        {
            float w = ContentW / count;
            return Enumerable.Repeat(w, count).ToArray();
        }

        private static string Truncate(string text, float colWidth, float fontSize)
        {
            // Rough character limit: ~0.5 * fontSize per char
            int maxChars = Math.Max(3, (int)(colWidth / (fontSize * 0.48)));
            return text.Length <= maxChars ? text : text[..(maxChars - 2)] + "..";
        }

        private static string Fmt(double? value) => value?.ToString("0.##", CultureInfo.InvariantCulture) ?? "-";
        private static string Fmt(int? value) => value?.ToString() ?? "-";

        private static string BuildInstruction(PrescriptionItemResponseDto item)
        {
            var parts = new List<string>();
            if (!string.IsNullOrWhiteSpace(item.DoseTime)) parts.Add(item.DoseTime);
            if (!string.IsNullOrWhiteSpace(item.MealTiming)) parts.Add(item.MealTiming);
            if (!string.IsNullOrWhiteSpace(item.Route)) parts.Add(item.Route);
            if (!string.IsNullOrWhiteSpace(item.Instruction)) parts.Add(item.Instruction);
            if (item.IsAsNeeded) parts.Add("PRN");
            return parts.Count > 0 ? string.Join(", ", parts) : "-";
        }

        private static IEnumerable<string> WrapLines(string text, int width)
        {
            foreach (var sourceLine in text.Replace("\r", string.Empty).Split('\n'))
            {
                var line = sourceLine.Trim();
                if (string.IsNullOrEmpty(line)) { yield return ""; continue; }
                while (line.Length > width)
                {
                    yield return line[..width];
                    line = line[width..].TrimStart();
                }
                yield return line;
            }
        }

        private static string StripHtml(string html)
        {
            var builder = new StringBuilder();
            var insideTag = false;
            foreach (var c in html)
            {
                if (c == '<') { insideTag = true; builder.Append(' '); continue; }
                if (c == '>') { insideTag = false; continue; }
                if (!insideTag) builder.Append(c);
            }
            return System.Net.WebUtility.HtmlDecode(builder.ToString());
        }

        // ════════════════════════════════════════════════════════════════
        //  RAW PDF BUILDER (tables, lines, rectangles, multi-font)
        // ════════════════════════════════════════════════════════════════

        /// <summary>
        /// Lightweight raw-PDF writer that supports:
        ///   - Two fonts: F1 (Helvetica), F2 (Helvetica-Bold)
        ///   - Text with gray color control
        ///   - Lines with variable width
        ///   - Rectangles (stroke only or filled)
        ///   - Multiple pages
        /// </summary>
        private class PdfBuilder
        {
            private readonly List<StringBuilder> _pages = new();
            private StringBuilder _current;

            public PdfBuilder()
            {
                _current = new StringBuilder();
                _pages.Add(_current);
            }

            public void AddPage()
            {
                _current = new StringBuilder();
                _pages.Add(_current);
            }

            public void AddText(float x, float y, float size, string font, string text, float gray = 0f)
            {
                _current.Append($"{F(gray)} g BT /{font} {F(size)} Tf {F(x)} {F(y)} Td ({Esc(text)}) Tj ET ");
            }

            public void AddLine(float x1, float y1, float x2, float y2, float width = 1f)
            {
                _current.Append($"0 G {F(width)} w {F(x1)} {F(y1)} m {F(x2)} {F(y2)} l S ");
            }

            /// <summary>Draws a rectangle. Optionally fills with a gray value or an RGB string.</summary>
            public void AddRect(float x, float y, float w, float h, bool fill = false, float fillGray = 0.9f, string? fillRgb = null, float strokeGray = 0.75f)
            {
                if (fill)
                {
                    if (fillRgb != null)
                        _current.Append($"{fillRgb} rg {F(x)} {F(y)} {F(w)} {F(h)} re f ");
                    else
                        _current.Append($"{F(fillGray)} g {F(x)} {F(y)} {F(w)} {F(h)} re f ");
                }
                // Always stroke border (gray)
                _current.Append($"{F(strokeGray)} G 0.5 w {F(x)} {F(y)} {F(w)} {F(h)} re S ");
            }

            public byte[] Build()
            {
                // Font objects: Helvetica (F1) and Helvetica-Bold (F2)
                // Objects: 1=Catalog, 2=Pages, 3..N=Page, N+1=Font1, N+2=Font2, then streams

                int pageCount = _pages.Count;
                var fontObj1Idx = 3 + pageCount;  // F1 = Helvetica
                var fontObj2Idx = fontObj1Idx + 1; // F2 = Helvetica-Bold

                // Build stream objects for each page
                var streamBytes = _pages.Select(p => Encoding.ASCII.GetBytes(p.ToString())).ToList();

                // Object numbering: 1=Catalog, 2=Pages, 3..(2+pageCount)=Pages, fontObj1Idx, fontObj2Idx, then streams
                // Total objects = 2 + pageCount + 2 (fonts) + pageCount (streams)
                var objects = new List<string>();

                // 1 – Catalog
                objects.Add("<< /Type /Catalog /Pages 2 0 R >>");

                // 2 – Pages
                var kids = string.Join(" ", Enumerable.Range(3, pageCount).Select(i => $"{i} 0 R"));
                objects.Add($"<< /Type /Pages /Kids [{kids}] /Count {pageCount} >>");

                // 3..2+pageCount – Page objects
                int streamStartIdx = fontObj2Idx + 1;
                for (int i = 0; i < pageCount; i++)
                {
                    int streamObjIdx = streamStartIdx + i;
                    objects.Add($"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {F(PageW)} {F(PageH)}] " +
                        $"/Resources << /Font << /F1 {fontObj1Idx} 0 R /F2 {fontObj2Idx} 0 R >> >> " +
                        $"/Contents {streamObjIdx} 0 R >>");
                }

                // Font objects
                objects.Add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
                objects.Add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");

                // Stream objects for each page
                for (int i = 0; i < pageCount; i++)
                {
                    var sBytes = streamBytes[i];
                    objects.Add($"<< /Length {sBytes.Length} >>\nstream\n{_pages[i]}\nendstream");
                }

                // Assemble PDF
                var output = new StringBuilder("%PDF-1.4\n");
                var offsets = new List<int>();
                for (int i = 0; i < objects.Count; i++)
                {
                    offsets.Add(Encoding.ASCII.GetByteCount(output.ToString()));
                    output.Append(i + 1).Append(" 0 obj\n").Append(objects[i]).Append("\nendobj\n");
                }

                var xrefOffset = Encoding.ASCII.GetByteCount(output.ToString());
                output.Append("xref\n0 ").Append(objects.Count + 1).Append('\n');
                output.Append("0000000000 65535 f \n");
                foreach (var offset in offsets)
                {
                    output.Append(offset.ToString("D10")).Append(" 00000 n \n");
                }
                output.Append("trailer << /Size ").Append(objects.Count + 1).Append(" /Root 1 0 R >>\n");
                output.Append("startxref\n").Append(xrefOffset).Append("\n%%EOF");
                return Encoding.ASCII.GetBytes(output.ToString());
            }

            private static string F(float v) => v.ToString("0.##", CultureInfo.InvariantCulture);
            private static string Esc(string t) => t.Replace("\\", "\\\\").Replace("(", "\\(").Replace(")", "\\)");
        }
    }
}

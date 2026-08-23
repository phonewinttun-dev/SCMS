using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Xunit;
using SCMS.Database.Models;
using SCMS.Domain.Common;
using SCMS.Domain.Features.Dashboards;
using SCMS.Domain.Features.Mcp;
using SCMS.Domain.Features.Mcp.Models;
using SCMS.Domain.Tests.TestSupport;

namespace SCMS.Domain.Tests.Mcp
{
    /// <summary>
    /// Date parsing is the highest-risk part of the MCP surface: the assistant feeds it free text
    /// and the result decides which appointments get cancelled or moved. These exercise it through
    /// the real tool path, asserting on the appointment that actually gets touched.
    /// </summary>
    public class McpDateParsingTests : IDisposable
    {
        private readonly TestDatabase _db;
        private readonly McpService _service;

        public McpDateParsingTests()
        {
            _db = new TestDatabase();
            _service = new McpService(_db.Context, new DashboardService(_db.Context));
        }

        public void Dispose() => _db.Dispose();

        private async Task<TblAppointment> SeedAppointmentAsync(DateTime whenUtc, string code)
        {
            var user = new TblUser
            {
                Name = "Parse User",
                MobileNo = "09970000000",
                Email = $"parse-{code}@scms.demo",
                PasswordHash = "hash",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                DeleteFlag = false
            };
            _db.Context.TblUsers.Add(user);
            await _db.Context.SaveChangesAsync();

            var patient = new TblPatient
            {
                UserId = user.UserId,
                Name = "Parse Target",
                MobileNo = "09970000000",
                DateOfBirth = new DateOnly(1985, 1, 1),
                Gender = "female",
                Address = "{}",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                DeleteFlag = false
            };
            _db.Context.TblPatients.Add(patient);
            await _db.Context.SaveChangesAsync();

            var appointment = new TblAppointment
            {
                AppointmentCode = code,
                PatientId = patient.PatientId,
                Datetime = whenUtc,
                Status = "pending",
                Notes = "Consultation",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _db.Context.TblAppointments.Add(appointment);
            await _db.Context.SaveChangesAsync();
            return appointment;
        }

        private Task<Shared.Result<McpToolCallResponse>> CancelRangeAsync(string start, string end) =>
            _service.CallToolAsync(new McpToolCallRequest
            {
                Name = "cancel_appointments_in_range",
                Arguments = new Dictionary<string, object>
                {
                    { "startTime", start },
                    { "endTime", end }
                }
            });

        [Fact]
        public async Task BareTime_IsInterpretedAsClinicLocalNotUtc()
        {
            // 10:30 must mean half past ten at the clinic. Interpreted as UTC it would land
            // at 17:00 clinic time and miss this appointment entirely.
            var clinicTen30 = ClinicClock.ToUtc(ClinicClock.Today.AddHours(10).AddMinutes(30));
            var appointment = await SeedAppointmentAsync(clinicTen30, "APT-PARSE-LOCAL");

            var result = await CancelRangeAsync("10:00", "11:00");

            Assert.True(result.IsSuccess);
            Assert.False(result.Data!.IsError);
            Assert.Equal("cancelled", _db.Context.TblAppointments.Find(appointment.Id)!.Status);
        }

        [Fact]
        public async Task RelativeTomorrow_ResolvesToTheNextClinicDay()
        {
            var tomorrowNine = ClinicClock.ToUtc(ClinicClock.Today.AddDays(1).AddHours(9));
            var appointment = await SeedAppointmentAsync(tomorrowNine, "APT-PARSE-TOMORROW");

            var result = await CancelRangeAsync("tomorrow at 08:00", "tomorrow at 10:00");

            Assert.False(result.Data!.IsError);
            Assert.Equal("cancelled", _db.Context.TblAppointments.Find(appointment.Id)!.Status);
        }

        [Fact]
        public async Task RelativeToday_DoesNotMatchTomorrowsAppointments()
        {
            var tomorrowNine = ClinicClock.ToUtc(ClinicClock.Today.AddDays(1).AddHours(9));
            var appointment = await SeedAppointmentAsync(tomorrowNine, "APT-PARSE-NOTTODAY");

            var result = await CancelRangeAsync("today at 08:00", "today at 10:00");

            Assert.Contains("No active appointments", result.Data!.Content[0].Text);
            Assert.Equal("pending", _db.Context.TblAppointments.Find(appointment.Id)!.Status);
        }

        [Theory]
        [InlineData("24/06/2026 09:00", "24/06/2026 11:00")]   // canonical dd/MM/yyyy
        [InlineData("24-06-2026 09:00", "24-06-2026 11:00")]   // legacy dash form
        [InlineData("2026-06-24 09:00", "2026-06-24 11:00")]   // ISO form the model may emit
        public async Task FullDateFormats_AllResolveToTheSameInstant(string start, string end)
        {
            var target = ClinicClock.ToUtc(new DateTime(2026, 6, 24, 10, 0, 0));
            var appointment = await SeedAppointmentAsync(target, "APT-PARSE-" + start.GetHashCode());

            var result = await CancelRangeAsync(start, end);

            Assert.False(result.Data!.IsError);
            Assert.Equal("cancelled", _db.Context.TblAppointments.Find(appointment.Id)!.Status);
        }

        [Fact]
        public async Task DayOfMonthIsNeverReadAsAMonth()
        {
            // 06/07 is 6 July, not 7 June. Getting this backwards silently cancels the wrong day.
            var sixthOfJuly = ClinicClock.ToUtc(new DateTime(2026, 7, 6, 10, 0, 0));
            var appointment = await SeedAppointmentAsync(sixthOfJuly, "APT-PARSE-DMY");

            var result = await CancelRangeAsync("06/07/2026 09:00", "06/07/2026 11:00");

            Assert.False(result.Data!.IsError);
            Assert.Equal("cancelled", _db.Context.TblAppointments.Find(appointment.Id)!.Status);
        }

        [Fact]
        public async Task TwelveHourTimes_AreUnderstood()
        {
            var twoPm = ClinicClock.ToUtc(ClinicClock.Today.AddHours(14));
            var appointment = await SeedAppointmentAsync(twoPm, "APT-PARSE-PM");

            var result = await CancelRangeAsync("1:30 PM", "2:30 PM");

            Assert.False(result.Data!.IsError);
            Assert.Equal("cancelled", _db.Context.TblAppointments.Find(appointment.Id)!.Status);
        }

        [Fact]
        public async Task UnparseableInput_ReportsAnErrorInsteadOfGuessing()
        {
            var result = await CancelRangeAsync("sometime next week-ish", "later");

            Assert.True(result.Data!.IsError);
            Assert.Contains("Could not understand", result.Data.Content[0].Text);
        }

        [Fact]
        public async Task InvertedRange_IsRejected()
        {
            var result = await CancelRangeAsync("14:00", "10:00");

            Assert.True(result.Data!.IsError);
            Assert.Contains("earlier than", result.Data.Content[0].Text);
        }
    }
}

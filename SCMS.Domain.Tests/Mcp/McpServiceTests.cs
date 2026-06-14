using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Xunit;
using SCMS.Database.Models;
using SCMS.Domain.Features.Mcp;
using SCMS.Domain.Tests.TestSupport;
using SCMS.Domain.DTOs.Mcp;

namespace SCMS.Domain.Tests.Mcp
{
    public class McpServiceTests : IDisposable
    {
        private readonly TestDatabase _db;
        private readonly McpService _service;

        public McpServiceTests()
        {
            _db = new TestDatabase();
            _service = new McpService(_db.Context);
        }

        public void Dispose()
        {
            _db.Dispose();
        }

        private async Task<TblUser> CreateTestUserAsync(string email)
        {
            var user = new TblUser
            {
                Name = "Test User",
                MobileNo = "09979990000",
                Email = email,
                PasswordHash = "hash",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                DeleteFlag = false
            };
            _db.Context.TblUsers.Add(user);
            await _db.Context.SaveChangesAsync();
            return user;
        }

        [Fact]
        public void GetAvailableTools_ReturnsFullToolsList()
        {
            // Act
            var tools = _service.GetAvailableTools();

            // Assert
            Assert.NotNull(tools);
            Assert.NotEmpty(tools);
            Assert.Contains(tools, t => t.Name == "get_today_appointments");
            Assert.Contains(tools, t => t.Name == "get_waiting_queue");
            Assert.Contains(tools, t => t.Name == "get_patient_profile");
            Assert.Contains(tools, t => t.Name == "create_follow_up_reminder");
        }

        [Fact]
        public async Task CallToolAsync_WithInvalidTool_ReturnsFailure()
        {
            // Arrange
            var request = new McpToolCallRequest { Name = "invalid_tool_name" };

            // Act
            var result = await _service.CallToolAsync(request);

            // Assert
            Assert.True(result.IsFailure);
            Assert.Null(result.Data);
        }

        [Fact]
        public async Task CallToolAsync_GetTodayAppointments_RunsSuccessfully()
        {
            // Arrange
            var user = await CreateTestUserAsync("john@scms.demo");
            
            var patient = new TblPatient
            {
                UserId = user.UserId,
                Name = "John Doe",
                MobileNo = "09979991111",
                DateOfBirth = new DateOnly(1985, 5, 20),
                Gender = "male",
                ActualAddress = "{}",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                DeleteFlag = false
            };
            _db.Context.TblPatients.Add(patient);
            await _db.Context.SaveChangesAsync();

            var appointment = new TblAppointment
            {
                AppointmentCode = "APT-001-TEST",
                PatientId = patient.PatientId,
                Datetime = DateTime.UtcNow.Date.AddHours(10), // today
                Status = "pending",
                Notes = "Consultation",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _db.Context.TblAppointments.Add(appointment);
            await _db.Context.SaveChangesAsync();

            var request = new McpToolCallRequest { Name = "get_today_appointments" };

            // Act
            var result = await _service.CallToolAsync(request);

            // Assert
            Assert.True(result.IsSuccess);
            Assert.NotNull(result.Data);
            Assert.Single(result.Data.Content);
            Assert.Contains("APT-001-TEST", result.Data.Content[0].Text);
            Assert.Contains("John Doe", result.Data.Content[0].Text);
        }

        [Fact]
        public async Task CallToolAsync_CreateFollowUpReminder_SavesToDatabase()
        {
            // Arrange
            var user = await CreateTestUserAsync("jane@scms.demo");

            var patient = new TblPatient
            {
                UserId = user.UserId,
                Name = "Jane Doe",
                MobileNo = "09979992222",
                DateOfBirth = new DateOnly(1990, 8, 15),
                Gender = "female",
                ActualAddress = "{}",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                DeleteFlag = false
            };
            _db.Context.TblPatients.Add(patient);
            await _db.Context.SaveChangesAsync();

            var request = new McpToolCallRequest
            {
                Name = "create_follow_up_reminder",
                Arguments = new Dictionary<string, object>
                {
                    { "patientId", patient.PatientId },
                    { "dueInDays", 7 },
                    { "recommendation", "Review blood test results." }
                }
            };

            // Act
            var result = await _service.CallToolAsync(request);

            // Assert
            Assert.True(result.IsSuccess);
            Assert.NotNull(result.Data);
            Assert.Contains("Review blood test results.", result.Data.Content[0].Text);

            var followUp = _db.Context.TblFollowUps.FirstOrDefault(f => f.PatientId == patient.PatientId);
            Assert.NotNull(followUp);
            Assert.Equal("Review blood test results.", followUp.Recommendation);
            Assert.Equal("pending", followUp.Status);
            Assert.True(followUp.DueAt > DateTime.UtcNow);
        }

        [Fact]
        public async Task CallToolAsync_UpdateAppointmentStatus_UpdatesSuccessfully()
        {
            // Arrange
            var user = await CreateTestUserAsync("alice@scms.demo");
            var patient = new TblPatient
            {
                UserId = user.UserId,
                Name = "Alice Smith",
                MobileNo = "09979993333",
                DateOfBirth = new DateOnly(1995, 10, 5),
                Gender = "female",
                ActualAddress = "{}",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                DeleteFlag = false
            };
            _db.Context.TblPatients.Add(patient);
            await _db.Context.SaveChangesAsync();

            var appointment = new TblAppointment
            {
                AppointmentCode = "APT-002-TEST",
                PatientId = patient.PatientId,
                Datetime = DateTime.UtcNow.Date.AddHours(12),
                Status = "pending",
                Notes = "Routine check",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _db.Context.TblAppointments.Add(appointment);
            await _db.Context.SaveChangesAsync();

            var request = new McpToolCallRequest
            {
                Name = "update_appointment_status",
                Arguments = new Dictionary<string, object>
                {
                    { "appointmentId", appointment.Id },
                    { "status", "confirmed" },
                    { "notes", "Confirmed by doctor." }
                }
            };

            // Act
            var result = await _service.CallToolAsync(request);

            // Assert
            Assert.True(result.IsSuccess);
            Assert.NotNull(result.Data);
            Assert.Contains("confirmed", result.Data.Content[0].Text);

            var updatedAppt = _db.Context.TblAppointments.Find(appointment.Id);
            Assert.NotNull(updatedAppt);
            Assert.Equal("confirmed", updatedAppt.Status);
            Assert.Equal("Confirmed by doctor.", updatedAppt.Notes);
        }

        [Fact]
        public async Task CallToolAsync_CancelAppointmentsInRange_CancelsSuccessfully()
        {
            // Arrange
            var user = await CreateTestUserAsync("bob@scms.demo");
            var patient = new TblPatient
            {
                UserId = user.UserId,
                Name = "Bob Smith",
                MobileNo = "09979994444",
                DateOfBirth = new DateOnly(1980, 1, 1),
                Gender = "male",
                ActualAddress = "{}",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                DeleteFlag = false
            };
            _db.Context.TblPatients.Add(patient);
            await _db.Context.SaveChangesAsync();

            var apptDate = DateTime.UtcNow.Date;
            var appointment1 = new TblAppointment
            {
                AppointmentCode = "APT-003-TEST",
                PatientId = patient.PatientId,
                Datetime = apptDate.AddHours(10), // 10:00 AM
                Status = "pending",
                Notes = "Routine check 1",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            var appointment2 = new TblAppointment
            {
                AppointmentCode = "APT-004-TEST",
                PatientId = patient.PatientId,
                Datetime = apptDate.AddHours(11), // 11:00 AM
                Status = "pending",
                Notes = "Routine check 2",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _db.Context.TblAppointments.AddRange(appointment1, appointment2);
            await _db.Context.SaveChangesAsync();

            var request = new McpToolCallRequest
            {
                Name = "cancel_appointments_in_range",
                Arguments = new Dictionary<string, object>
                {
                    { "startTime", apptDate.AddHours(9).ToString("o") },
                    { "endTime", apptDate.AddHours(11).AddMinutes(30).ToString("o") },
                    { "reason", "Doctor emergency" }
                }
            };

            // Act
            var result = await _service.CallToolAsync(request);

            // Assert
            Assert.True(result.IsSuccess);
            Assert.NotNull(result.Data);
            Assert.Contains("cancelled", result.Data.Content[0].Text);

            var updated1 = _db.Context.TblAppointments.Find(appointment1.Id);
            var updated2 = _db.Context.TblAppointments.Find(appointment2.Id);

            Assert.NotNull(updated1);
            Assert.NotNull(updated2);
            Assert.Equal("cancelled", updated1.Status);
            Assert.Equal("cancelled", updated2.Status);
            Assert.Contains("Doctor emergency", updated1.Notes);
            Assert.Contains("Doctor emergency", updated2.Notes);
        }

        [Fact]
        public async Task CallToolAsync_RescheduleAppointmentsInRange_ReschedulesSuccessfully()
        {
            // Arrange
            var user = await CreateTestUserAsync("charlie@scms.demo");
            var patient = new TblPatient
            {
                UserId = user.UserId,
                Name = "Charlie Smith",
                MobileNo = "09979995555",
                DateOfBirth = new DateOnly(1975, 4, 12),
                Gender = "male",
                ActualAddress = "{}",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                DeleteFlag = false
            };
            _db.Context.TblPatients.Add(patient);
            await _db.Context.SaveChangesAsync();

            var apptDate = DateTime.UtcNow.Date;
            var appointment = new TblAppointment
            {
                AppointmentCode = "APT-005-TEST",
                PatientId = patient.PatientId,
                Datetime = apptDate.AddHours(10), // 10:00 AM
                Status = "pending",
                Notes = "Routine check",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _db.Context.TblAppointments.Add(appointment);
            await _db.Context.SaveChangesAsync();

            var request = new McpToolCallRequest
            {
                Name = "reschedule_appointments_in_range",
                Arguments = new Dictionary<string, object>
                {
                    { "sourceStartTime", apptDate.AddHours(9).ToString("o") },
                    { "sourceEndTime", apptDate.AddHours(11).ToString("o") },
                    { "targetStartTime", apptDate.AddHours(14).ToString("o") } // Shift to 2:00 PM
                }
            };

            // Act
            var result = await _service.CallToolAsync(request);

            // Assert
            Assert.True(result.IsSuccess);
            Assert.NotNull(result.Data);
            Assert.Contains("rescheduled", result.Data.Content[0].Text);

            var updated = _db.Context.TblAppointments.Find(appointment.Id);
            Assert.NotNull(updated);
            Assert.Equal(apptDate.AddHours(15), updated.Datetime);
        }

        [Fact]
        public async Task CallToolAsync_UpdateAppointmentStatusByPatientName_UpdatesSuccessfully()
        {
            // Arrange
            var user = await CreateTestUserAsync("diana@scms.demo");
            var patient = new TblPatient
            {
                UserId = user.UserId,
                Name = "Diana Prince",
                MobileNo = "09979996666",
                DateOfBirth = new DateOnly(1988, 3, 24),
                Gender = "female",
                ActualAddress = "{}",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                DeleteFlag = false
            };
            _db.Context.TblPatients.Add(patient);
            await _db.Context.SaveChangesAsync();

            var appointment = new TblAppointment
            {
                AppointmentCode = "APT-006-TEST",
                PatientId = patient.PatientId,
                Datetime = DateTime.UtcNow.Date.AddHours(9), // 9:00 AM today
                Status = "pending",
                Notes = "Initial consultation",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _db.Context.TblAppointments.Add(appointment);
            await _db.Context.SaveChangesAsync();

            var request = new McpToolCallRequest
            {
                Name = "update_appointment_status_by_patient_name",
                Arguments = new Dictionary<string, object>
                {
                    { "patientName", "Diana" },
                    { "status", "confirmed" },
                    { "notes", "Confirmed via AI by name lookup." }
                }
            };

            // Act
            var result = await _service.CallToolAsync(request);

            // Assert
            Assert.True(result.IsSuccess);
            Assert.NotNull(result.Data);
            Assert.Contains("Successfully updated appointment status", result.Data.Content[0].Text);

            var updatedAppt = _db.Context.TblAppointments.Find(appointment.Id);
            Assert.NotNull(updatedAppt);
            Assert.Equal("confirmed", updatedAppt.Status);
            Assert.Equal("Confirmed via AI by name lookup.", updatedAppt.Notes);
        }

        [Fact]
        public async Task CallToolAsync_RescheduleTodayAppointments_ReschedulesSuccessfully()
        {
            // Arrange
            var user = await CreateTestUserAsync("elena@scms.demo");
            var patient = new TblPatient
            {
                UserId = user.UserId,
                Name = "Elena Gilbert",
                MobileNo = "09979997777",
                DateOfBirth = new DateOnly(1992, 6, 22),
                Gender = "female",
                ActualAddress = "{}",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                DeleteFlag = false
            };
            _db.Context.TblPatients.Add(patient);
            await _db.Context.SaveChangesAsync();

            var todayDate = DateTime.UtcNow.Date;
            var appointment = new TblAppointment
            {
                AppointmentCode = "APT-007-TEST",
                PatientId = patient.PatientId,
                Datetime = todayDate.AddHours(8), // 8:00 AM today
                Status = "pending",
                Notes = "Routine follow up",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _db.Context.TblAppointments.Add(appointment);
            await _db.Context.SaveChangesAsync();

            var request = new McpToolCallRequest
            {
                Name = "reschedule_today_appointments",
                Arguments = new Dictionary<string, object>
                {
                    { "targetStartTime", todayDate.AddHours(9).AddMinutes(30).ToString("o") } // 9:30 AM today
                }
            };

            // Act
            var result = await _service.CallToolAsync(request);

            // Assert
            Assert.True(result.IsSuccess);
            Assert.NotNull(result.Data);
            Assert.Contains("Successfully rescheduled", result.Data.Content[0].Text);

            var updatedAppt = _db.Context.TblAppointments.Find(appointment.Id);
            Assert.NotNull(updatedAppt);
            Assert.Equal(todayDate.AddHours(9).AddMinutes(30), updatedAppt.Datetime);
        }

        [Fact]
        public async Task CallToolAsync_RescheduleTodayAppointments_DoesNotStackRescheduleNotes()
        {
            // Arrange
            var user = await CreateTestUserAsync("stefan@scms.demo");
            var patient = new TblPatient
            {
                UserId = user.UserId,
                Name = "Stefan Salvatore",
                MobileNo = "09979998888",
                DateOfBirth = new DateOnly(1990, 11, 1),
                Gender = "male",
                ActualAddress = "{}",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                DeleteFlag = false
            };
            _db.Context.TblPatients.Add(patient);
            await _db.Context.SaveChangesAsync();

            var todayDate = DateTime.UtcNow.Date;
            var appointment = new TblAppointment
            {
                AppointmentCode = "APT-008-TEST",
                PatientId = patient.PatientId,
                Datetime = todayDate.AddHours(8), // 8:00 AM today
                Status = "pending",
                Notes = "Routine check | Rescheduled from 07:30 AM",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _db.Context.TblAppointments.Add(appointment);
            await _db.Context.SaveChangesAsync();

            var request = new McpToolCallRequest
            {
                Name = "reschedule_today_appointments",
                Arguments = new Dictionary<string, object>
                {
                    { "targetStartTime", todayDate.AddHours(9).ToString("o") } // 9:00 AM today
                }
            };

            // Act
            var result = await _service.CallToolAsync(request);

            // Assert
            Assert.True(result.IsSuccess);
            Assert.NotNull(result.Data);

            var updatedAppt = _db.Context.TblAppointments.Find(appointment.Id);
            Assert.NotNull(updatedAppt);
            Assert.Equal("Routine check | Rescheduled from 08:00 AM", updatedAppt.Notes);
        }

        [Fact]
        public async Task CallToolAsync_RescheduleTodayAppointments_WithTimeOnlyAndRelative_ReschedulesSuccessfully()
        {
            // Arrange
            var user = await CreateTestUserAsync("klaus@scms.demo");
            var patient = new TblPatient
            {
                UserId = user.UserId,
                Name = "Klaus Mikaelson",
                MobileNo = "09979999999",
                DateOfBirth = new DateOnly(1970, 1, 1),
                Gender = "male",
                ActualAddress = "{}",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                DeleteFlag = false
            };
            _db.Context.TblPatients.Add(patient);
            await _db.Context.SaveChangesAsync();

            var todayDate = DateTime.UtcNow.Date;
            var appointment = new TblAppointment
            {
                AppointmentCode = "APT-009-TEST",
                PatientId = patient.PatientId,
                Datetime = todayDate.AddHours(8), // 8:00 AM today
                Status = "pending",
                Notes = "Routine follow up",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _db.Context.TblAppointments.Add(appointment);
            await _db.Context.SaveChangesAsync();

            // 1. Test with relative "today at 09:30"
            var requestToday = new McpToolCallRequest
            {
                Name = "reschedule_today_appointments",
                Arguments = new Dictionary<string, object>
                {
                    { "targetStartTime", "today at 09:30 AM" }
                }
            };
            var resultToday = await _service.CallToolAsync(requestToday);
            Assert.True(resultToday.IsSuccess);

            var updatedAppt = _db.Context.TblAppointments.Find(appointment.Id);
            Assert.NotNull(updatedAppt);
            Assert.Equal(todayDate.AddHours(9).AddMinutes(30), updatedAppt.Datetime);

            // 2. Test with simple time-only "10:30"
            var requestTimeOnly = new McpToolCallRequest
            {
                Name = "reschedule_today_appointments",
                Arguments = new Dictionary<string, object>
                {
                    { "targetStartTime", "10:30" }
                }
            };
            var resultTimeOnly = await _service.CallToolAsync(requestTimeOnly);
            Assert.True(resultTimeOnly.IsSuccess);

            updatedAppt = _db.Context.TblAppointments.Find(appointment.Id);
            Assert.NotNull(updatedAppt);
            Assert.Equal(todayDate.AddHours(10).AddMinutes(30), updatedAppt.Datetime);
        }

        [Fact]
        public async Task CallToolAsync_CancelAppointmentsInRange_WithRelativeTime_CancelsSuccessfully()
        {
            // Arrange
            var user = await CreateTestUserAsync("elijah@scms.demo");
            var patient = new TblPatient
            {
                UserId = user.UserId,
                Name = "Elijah Mikaelson",
                MobileNo = "09979998889",
                DateOfBirth = new DateOnly(1972, 2, 2),
                Gender = "male",
                ActualAddress = "{}",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                DeleteFlag = false
            };
            _db.Context.TblPatients.Add(patient);
            await _db.Context.SaveChangesAsync();

            var todayDate = DateTime.UtcNow.Date;
            var appointment = new TblAppointment
            {
                AppointmentCode = "APT-010-TEST",
                PatientId = patient.PatientId,
                Datetime = todayDate.AddHours(14), // 2:00 PM today
                Status = "pending",
                Notes = "Routine check",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _db.Context.TblAppointments.Add(appointment);
            await _db.Context.SaveChangesAsync();

            // Cancel with relative range "today at 13:00" to "today at 15:00"
            var request = new McpToolCallRequest
            {
                Name = "cancel_appointments_in_range",
                Arguments = new Dictionary<string, object>
                {
                    { "startTime", "today at 01:00 PM" },
                    { "endTime", "today at 03:00 PM" },
                    { "reason", "Klaus did it" }
                }
            };

            // Act
            var result = await _service.CallToolAsync(request);

            // Assert
            Assert.True(result.IsSuccess);
            var updated = _db.Context.TblAppointments.Find(appointment.Id);
            Assert.NotNull(updated);
            Assert.Equal("cancelled", updated.Status);
            Assert.Contains("Klaus did it", updated.Notes);
        }

        [Fact]
        public async Task CallToolAsync_GetPatientKypBrief_ReturnsComprehensiveBriefSuccessfully()
        {
            // Arrange
            var user = await CreateTestUserAsync("damon@scms.demo");
            
            var addressMeta = new McpServiceTestsAddressMeta
            {
                ActualAddress = "123 Mystic Falls",
                Allergies = "Penicillin",
                ChronicConditions = "Asthma",
                PastSurgeries = "None",
                FamilyHistory = "None",
                VaccinationHistory = "Flu vaccine 2025"
            };
            var serializedActualAddress = System.Text.Json.JsonSerializer.Serialize(addressMeta);

            var patient = new TblPatient
            {
                UserId = user.UserId,
                Name = "Damon Salvatore",
                MobileNo = "09979998811",
                DateOfBirth = new DateOnly(1994, 6, 18),
                Gender = "male",
                ActualAddress = "",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                DeleteFlag = false
            };
            _db.Context.TblPatients.Add(patient);
            await _db.Context.SaveChangesAsync();

            var appointment = new TblAppointment
            {
                AppointmentCode = "APT-011-TEST",
                PatientId = patient.PatientId,
                Datetime = DateTime.UtcNow.Date.AddHours(11),
                Status = "cancelled",
                Notes = "No show",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _db.Context.TblAppointments.Add(appointment);
            await _db.Context.SaveChangesAsync();

            var payment = new TblPayment
            {
                AppointmentId = appointment.Id,
                Amount = 5000,
                Tax = 500,
                Charges = 0,
                PaymentMethod = "kbzpay",
                PaymentStatus = "pending",
                UpdatedAt = DateTime.UtcNow
            };
            _db.Context.TblPayments.Add(payment);
            await _db.Context.SaveChangesAsync();

            var request = new McpToolCallRequest
            {
                Name = "get_patient_kyp_brief",
                Arguments = new Dictionary<string, object>
                {
                    { "patientName", "Damon" }
                }
            };

            // Act
            var result = await _service.CallToolAsync(request);

            // Assert
            Assert.True(result.IsSuccess);
            Assert.NotNull(result.Data);
            var text = result.Data.Content[0].Text;
            Assert.Contains("Damon Salvatore", text);
            Assert.Contains("Penicillin", text);
            Assert.Contains("Asthma", text);
            Assert.Contains("High", text); // Adherence profiling risk because 100% cancelled
            Assert.Contains("123 Mystic Falls", text);
        }

        private class McpServiceTestsAddressMeta
        {
            public string? ActualAddress { get; set; }
            public string? Allergies { get; set; }
            public string? ChronicConditions { get; set; }
            public string? PastSurgeries { get; set; }
            public string? FamilyHistory { get; set; }
            public string? VaccinationHistory { get; set; }
        }
    }
}

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
// using Microsoft.Data.Sqlite;
using SCMS.Database.Models;
using SCMS.Domain.DTOs.Appointments;
using SCMS.Shared;
using SCMS.Domain.Features.Notifications;

namespace SCMS.Domain.Features.Appointments
{
    public class AppointmentsService
    {
        private readonly AppDbContext _context;
        private readonly NotificationService? _notificationService;
        private static readonly HashSet<string> AllowedStatuses = new(StringComparer.OrdinalIgnoreCase)
        {
            "pending",
            "confirmed",
            "cancelled",
            "completed"
        };

        public AppointmentsService(AppDbContext context, NotificationService? notificationService = null)
        {
            _context = context;
            _notificationService = notificationService;
        }

        #region Create Appointment
        public async Task<Result<BookAppointmentResponse>> BookAppointmentAsync(BookAppointmentRequest request, int userId)
        {
            if (request.PatientId <= 0)
            {
                return Result<BookAppointmentResponse>.Failure("Patient id is required.");
            }
            //if (request.Datetime == default)
            //{
            //    return Result<BookAppointmentResponse>.Failure("Appointment date and time is required.");
            //}
            if (request.Datetime.Date < DateTime.UtcNow.Date)
            {
                return Result<BookAppointmentResponse>.Failure("Appointment date must be today or in the future.");
            }

            // Verify patient exists and belongs to the user (or is accessible)
            var patient = await _context.TblPatients
                .FirstOrDefaultAsync(p => p.PatientId == request.PatientId && p.UserId == userId && p.DeleteFlag != true);

            if (patient == null)
            {
                return Result<BookAppointmentResponse>.Failure("Patient not found.");
            }

            // Generate a unique appointment code.
            // Format: APT-NNN-XXXX where NNN is the daily sequence and XXXX is a random hex suffix.
            // The suffix eliminates UNIQUE constraint collisions under concurrent requests while
            // keeping the code human-readable.
            TblAppointment? appointment = null;
            string appointmentCode = string.Empty;
            int maxRetries = 5;

            for (int retry = 0; retry < maxRetries; retry++)
            {
                var appointmentDate = request.Datetime.Date;
                var nextDay = appointmentDate.AddDays(1);

                var todayCodes = await _context.TblAppointments
                    .Where(a => a.Datetime >= appointmentDate && a.Datetime < nextDay)
                    .ToListAsync();

                var maxSeq = todayCodes
                    .Select(a => a.AppointmentCode)
                    .Where(c => c != null && c.StartsWith("APT-"))
                    .Select(c =>
                    {
                        var parts = c.Substring(4).Split('-');
                        return int.TryParse(parts[0], out var n) ? n : 0;
                    })
                    .DefaultIfEmpty(0)
                    .Max();

                // Append a short random hex suffix to make the code collision-resistant
                var randomSuffix = Convert.ToHexString(Guid.NewGuid().ToByteArray())[..4];
                appointmentCode = $"APT-{(maxSeq + 1):D3}-{randomSuffix}";

                // Auto-assign slot time: first starts at 08:00 AM, each subsequent is spaced by 15 mins
                var assignedTime = appointmentDate.AddHours(8).AddMinutes(todayCodes.Count * 15);

                appointment = new TblAppointment
                {
                    AppointmentCode = appointmentCode,
                    PatientId = request.PatientId,
                    Datetime = assignedTime,
                    Status = "pending",
                    Notes = request.Notes,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.TblAppointments.Add(appointment);

                try
                {
                    await _context.SaveChangesAsync();
                    break; // Success — exit retry loop
                }
                catch (DbUpdateException) // Postgres unique constraint check or generic fallback
                {
                    // UNIQUE constraint still failed (extremely rare with suffix, but handle anyway)
                    _context.Entry(appointment).State = Microsoft.EntityFrameworkCore.EntityState.Detached;
                    appointment = null;
                    appointmentCode = string.Empty;

                    if (retry == maxRetries - 1)
                    {
                        return Result<BookAppointmentResponse>.Failure("Unable to book appointment due to a conflict. Please try again.");
                    }
                    // Retry with a fresh code
                }
            }

            if (appointment == null)
            {
                return Result<BookAppointmentResponse>.Failure("Unable to book appointment. Please try again.");
            }

            // Calculate Token and Queue status
            var queueStatus = await GetQueueInfoAsync(appointment);

            // Add an in-app notification for the patient user
            if (_notificationService != null)
            {
                await _notificationService.CreateNotificationAsync(
                    patient.UserId,
                    "Appointment Booked",
                    $"Your appointment (Code: {appointmentCode}) has been booked for {appointment.Datetime:hh:mm tt} (expected consultation) and is pending approval. REQUIRED ARRIVAL: Please arrive at the clinic 30 minutes earlier at {appointment.Datetime.AddMinutes(-30):hh:mm tt} for check-in. You are {queueStatus.PatientsAhead + 1} in queue.",
                    $"/appointments/{appointment.Id}"
                );
            }
            else
            {
                _context.TblNotifications.Add(new TblNotification
                {
                    UserId = patient.UserId,
                    Title = "Appointment Booked",
                    Description = $"Your appointment (Code: {appointmentCode}) has been booked for {appointment.Datetime:hh:mm tt} (expected consultation) and is pending approval. REQUIRED ARRIVAL: Please arrive at the clinic 30 minutes earlier at {appointment.Datetime.AddMinutes(-30):hh:mm tt} for check-in. You are {queueStatus.PatientsAhead + 1} in queue.",
                    ActionRoute = $"/appointments/{appointment.Id}",
                    CreatedAt = DateTime.UtcNow,
                    DeleteFlag = false
                });
                await _context.SaveChangesAsync();
            }

            return Result<BookAppointmentResponse>.Success(new BookAppointmentResponse
            {
                AppointmentId = appointment.Id,
                AppointmentCode = appointment.AppointmentCode,
                TokenNumber = queueStatus.PatientTokenNumber,
                EstimatedWaitTimeMinutes = queueStatus.EstimatedWaitTimeMinutes,
                Status = appointment.Status
            }, "Appointment booked successfully.");
        }
        #endregion

        public async Task<Result<AppointmentDetailsResponse>> UpdateAppointmentStatusAsync(int id, UpdateAppointmentStatusRequest request)
        {
            var normalizedStatus = request.Status?.ToLower().Trim();
            if (string.IsNullOrWhiteSpace(normalizedStatus) || !AllowedStatuses.Contains(normalizedStatus))
            {
                return Result<AppointmentDetailsResponse>.Failure("Invalid appointment status. Allowed values are pending, confirmed, cancelled, completed.");
            }

            var appointment = await _context.TblAppointments
                .Include(a => a.Patient)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (appointment == null)
            {
                return Result<AppointmentDetailsResponse>.Failure("Appointment not found.");
            }

            var oldStatus = appointment.Status;
            appointment.Status = normalizedStatus;
            appointment.Notes = request.Notes ?? appointment.Notes;
            appointment.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Create notification if status changed
            if (oldStatus != appointment.Status)
            {
                if (_notificationService != null)
                {
                    await _notificationService.CreateNotificationAsync(
                        appointment.Patient.UserId,
                        $"Appointment {char.ToUpper(appointment.Status[0]) + appointment.Status.Substring(1)}",
                        $"Your appointment (Code: {appointment.AppointmentCode}) status has been updated to {appointment.Status}.",
                        $"/appointments/{appointment.Id}"
                    );
                }
                else
                {
                    _context.TblNotifications.Add(new TblNotification
                    {
                        UserId = appointment.Patient.UserId,
                        Title = $"Appointment {char.ToUpper(appointment.Status[0]) + appointment.Status.Substring(1)}",
                        Description = $"Your appointment (Code: {appointment.AppointmentCode}) status has been updated to {appointment.Status}.",
                        ActionRoute = $"/appointments/{appointment.Id}",
                        CreatedAt = DateTime.UtcNow,
                        DeleteFlag = false
                    });
                    await _context.SaveChangesAsync();
                }
            }

            return Result<AppointmentDetailsResponse>.Success(MapToDetailsResponse(appointment, await GetTokenNumberAsync(appointment)), "Appointment status updated.");
        }

        public async Task<Result<AppointmentDetailsResponse>> RescheduleAppointmentAsync(int id, RescheduleAppointmentRequest request)
        {
            if (request.NewDatetime == default)
            {
                return Result<AppointmentDetailsResponse>.Failure("New appointment date and time is required.");
            }
            if (request.NewDatetime <= DateTime.UtcNow)
            {
                return Result<AppointmentDetailsResponse>.Failure("New appointment date and time must be in the future.");
            }

            var appointment = await _context.TblAppointments
                .Include(a => a.Patient)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (appointment == null)
            {
                return Result<AppointmentDetailsResponse>.Failure("Appointment not found.");
            }

            appointment.Datetime = request.NewDatetime;
            appointment.Status = "pending"; // Rescheduling shifts it back to pending
            appointment.Notes = request.Notes ?? appointment.Notes;
            appointment.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Create notification
            if (_notificationService != null)
            {
                await _notificationService.CreateNotificationAsync(
                    appointment.Patient.UserId,
                    "Appointment Reschedule Requested",
                    $"Reschedule requested for appointment {appointment.AppointmentCode} to {request.NewDatetime:f}.",
                    $"/appointments/{appointment.Id}"
                );
            }
            else
            {
                _context.TblNotifications.Add(new TblNotification
                {
                    UserId = appointment.Patient.UserId,
                    Title = "Appointment Reschedule Requested",
                    Description = $"Reschedule requested for appointment {appointment.AppointmentCode} to {request.NewDatetime:f}.",
                    ActionRoute = $"/appointments/{appointment.Id}",
                    CreatedAt = DateTime.UtcNow,
                    DeleteFlag = false
                });
                await _context.SaveChangesAsync();
            }

            return Result<AppointmentDetailsResponse>.Success(MapToDetailsResponse(appointment, await GetTokenNumberAsync(appointment)), "Appointment rescheduled.");
        }

        public async Task<PagedResult<AppointmentDetailsResponse>> GetAppointmentsAsync(
            DateTime? startDate,
            DateTime? endDate,
            string? status,
            int? patientId,
            PaginationRequest paginationRequest,
            int? currentUserId = null,
            bool isStaff = true)
        {
            var query = _context.TblAppointments
                .Include(a => a.Patient)
                .AsQueryable();

            if (startDate.HasValue)
            {
                query = query.Where(a => a.Datetime >= startDate.Value);
            }
            if (endDate.HasValue)
            {
                query = query.Where(a => a.Datetime <= endDate.Value);
            }
            if (!string.IsNullOrEmpty(status))
            {
                var s = status.ToLower().Trim();
                if (!AllowedStatuses.Contains(s))
                {
                    return PagedResult<AppointmentDetailsResponse>.Failure("Invalid appointment status filter.");
                }
                query = query.Where(a => a.Status == s);
            }
            if (patientId.HasValue)
            {
                query = query.Where(a => a.PatientId == patientId.Value);
            }
            if (!isStaff && currentUserId.HasValue)
            {
                query = query.Where(a => a.Patient.UserId == currentUserId.Value);
            }

            var totalCount = await query.CountAsync();
            var appointments = await query
                .OrderBy(a => a.Datetime)
                .Skip((paginationRequest.PageNumber - 1) * paginationRequest.PageSize)
                .Take(paginationRequest.PageSize)
                .ToListAsync();

            var list = new List<AppointmentDetailsResponse>();
            foreach (var a in appointments)
            {
                var token = await GetTokenNumberAsync(a);
                list.Add(MapToDetailsResponse(a, token));
            }

            var pagination = new Pagination(paginationRequest.PageNumber, paginationRequest.PageSize, totalCount);
            return PagedResult<AppointmentDetailsResponse>.Success(list, pagination);
        }

        public async Task<Result<AppointmentQueueStatusResponse>> GetPatientQueueStatusAsync(int id)
        {
            var appointment = await _context.TblAppointments
                .FirstOrDefaultAsync(a => a.Id == id);

            if (appointment == null)
            {
                return Result<AppointmentQueueStatusResponse>.Failure("Appointment not found.");
            }

            var queueInfo = await GetQueueInfoAsync(appointment);
            return Result<AppointmentQueueStatusResponse>.Success(queueInfo, "Queue status fetched.");
        }

        public async Task<Result<AppointmentDetailsResponse>> CallNextPatientAsync()
        {
            // Call next confirmed patient for today
            var today = DateTime.UtcNow.Date;
            var tomorrow = today.AddDays(1);
            var nextAppointment = await _context.TblAppointments
                .Include(a => a.Patient)
                .Where(a => a.Datetime >= today && a.Datetime < tomorrow && a.Status == "confirmed")
                .OrderBy(a => a.Id)
                .FirstOrDefaultAsync();

            if (nextAppointment == null)
            {
                // Try to see if there is any pending one we can auto-call
                nextAppointment = await _context.TblAppointments
                    .Include(a => a.Patient)
                    .Where(a => a.Datetime >= today && a.Datetime < tomorrow && a.Status == "pending")
                    .OrderBy(a => a.Id)
                    .FirstOrDefaultAsync();

                if (nextAppointment == null)
                {
                    return Result<AppointmentDetailsResponse>.Failure("No more patients in queue for today.");
                }
            }

            // Mark previous active/confirmed appointments as Completed (or let doctor do it, but here we can set it to confirmed/in-progress)
            // For now, let's update this patient to 'confirmed' (or 'completed' if we want to call the next)
            // But to trigger "Call Next", let's mark any current 'confirmed' that was ahead of this as 'completed'
            var aheadAppointments = await _context.TblAppointments
                .Where(a => a.Datetime >= today && a.Datetime < tomorrow && a.Id < nextAppointment.Id && a.Status == "confirmed")
                .ToListAsync();

            foreach (var aa in aheadAppointments)
            {
                aa.Status = "completed";
                aa.UpdatedAt = DateTime.UtcNow;
            }

            // Make sure the next appointment status is 'confirmed' so it shows as active in consultation
            nextAppointment.Status = "confirmed";
            nextAppointment.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Create notification for the called patient
            if (_notificationService != null)
            {
                await _notificationService.CreateNotificationAsync(
                    nextAppointment.Patient.UserId,
                    "It's Your Turn!",
                    $"Doctor is ready to see you! Please proceed to the consultation room. (Token #{await GetTokenNumberAsync(nextAppointment)})",
                    $"/appointments/{nextAppointment.Id}"
                );
            }
            else
            {
                _context.TblNotifications.Add(new TblNotification
                {
                    UserId = nextAppointment.Patient.UserId,
                    Title = "It's Your Turn!",
                    Description = $"Doctor is ready to see you! Please proceed to the consultation room. (Token #{await GetTokenNumberAsync(nextAppointment)})",
                    ActionRoute = $"/appointments/{nextAppointment.Id}",
                    CreatedAt = DateTime.UtcNow,
                    DeleteFlag = false
                });
                await _context.SaveChangesAsync();
            }

            // Trigger 30-minutes pre-call notification for the patient scheduled 2 slots ahead (30 mins later)
            var pendingQueue = await _context.TblAppointments
                .Include(a => a.Patient)
                .Where(a => a.Datetime >= today && a.Datetime < tomorrow && a.Status == "pending" && a.Id > nextAppointment.Id)
                .OrderBy(a => a.Id)
                .Take(2)
                .ToListAsync();

            if (pendingQueue.Count > 0)
            {
                var preCallPatientAppt = pendingQueue.Count >= 2 ? pendingQueue[1] : pendingQueue[0];
                if (_notificationService != null)
                {
                    await _notificationService.CreateNotificationAsync(
                        preCallPatientAppt.Patient.UserId,
                        "Appointment Coming Up",
                        $"Your appointment (Token #{await GetTokenNumberAsync(preCallPatientAppt)}) is estimated to start in {(pendingQueue.Count >= 2 ? "30" : "15")} minutes. Please proceed to the clinic immediately.",
                        $"/appointments/{preCallPatientAppt.Id}"
                    );
                }
                else
                {
                    _context.TblNotifications.Add(new TblNotification
                    {
                        UserId = preCallPatientAppt.Patient.UserId,
                        Title = "Appointment Coming Up",
                        Description = $"Your appointment (Token #{await GetTokenNumberAsync(preCallPatientAppt)}) is estimated to start in {(pendingQueue.Count >= 2 ? "30" : "15")} minutes. Please proceed to the clinic immediately.",
                        ActionRoute = $"/appointments/{preCallPatientAppt.Id}",
                        CreatedAt = DateTime.UtcNow,
                        DeleteFlag = false
                    });
                    await _context.SaveChangesAsync();
                }
            }

            var token = await GetTokenNumberAsync(nextAppointment);
            return Result<AppointmentDetailsResponse>.Success(MapToDetailsResponse(nextAppointment, token), "Next patient called. Audio chime triggered.");
        }

        // Helper calculations
        private async Task<int> GetTokenNumberAsync(TblAppointment appointment)
        {
            var today = appointment.Datetime.Date;
            var tomorrow = today.AddDays(1);
            var list = await _context.TblAppointments
                .Where(a => a.Datetime >= today && a.Datetime < tomorrow && a.Status != "cancelled")
                .OrderBy(a => a.Id)
                .Select(a => a.Id)
                .ToListAsync();

            return list.IndexOf(appointment.Id) + 1;
        }

        private async Task<AppointmentQueueStatusResponse> GetQueueInfoAsync(TblAppointment appointment)
        {
            var today = appointment.Datetime.Date;
            var tomorrow = today.AddDays(1);
            var todayAppointments = await _context.TblAppointments
                .Where(a => a.Datetime >= today && a.Datetime < tomorrow && a.Status != "cancelled")
                .OrderBy(a => a.Id)
                .ToListAsync();

            var token = todayAppointments.FindIndex(a => a.Id == appointment.Id) + 1;

            // Find current active token
            // Active token is the first 'confirmed' appointment today.
            // If none, it's the last 'completed' appointment today.
            // If none, it's 0.
            int activeToken = 0;
            var activeAppt = todayAppointments.FirstOrDefault(a => a.Status == "confirmed");
            if (activeAppt != null)
            {
                activeToken = todayAppointments.FindIndex(a => a.Id == activeAppt.Id) + 1;
            }
            else
            {
                var lastCompleted = todayAppointments.LastOrDefault(a => a.Status == "completed");
                if (lastCompleted != null)
                {
                    activeToken = todayAppointments.FindIndex(a => a.Id == lastCompleted.Id) + 1;
                }
            }

            // Patients ahead: count of pending or confirmed before this one
            var ahead = todayAppointments
                .Where(a => a.Id < appointment.Id && (a.Status == "confirmed" || a.Status == "pending"))
                .Count();

            var completedCount = todayAppointments.Count(a => a.Status == "completed");
            var totalCount = todayAppointments.Count;
            double progress = totalCount > 0 ? (double)completedCount / totalCount * 100.0 : 0.0;

            string doctorStatus = "Available";
            if (activeAppt != null)
            {
                doctorStatus = "In Consultation";
            }
            else if (todayAppointments.Any(a => a.Status == "pending"))
            {
                doctorStatus = "Available";
            }

            var isYourTurn = appointment.Status == "confirmed" && activeAppt?.Id == appointment.Id;

            var requiredArrival = appointment.Datetime.AddMinutes(-30);
            string message = ahead == 0
                ? (isYourTurn ? "It is your turn!" : "You are next in queue. Please make sure you are in the waiting area.")
                : $"You are number {ahead + 1} in queue. REQUIRED ARRIVAL: Please arrive at the clinic by {requiredArrival:hh:mm tt} (30 mins before scheduled time).";

            return new AppointmentQueueStatusResponse
            {
                PatientTokenNumber = token,
                CurrentActiveTokenNumber = activeToken,
                PatientsAhead = ahead,
                QueueMessage = message,
                EstimatedWaitTimeMinutes = ahead * 10, // 10 minutes per patient ahead (User requested)
                DoctorStatus = doctorStatus,
                ProgressBarPercentage = Math.Round(progress, 2),
                IsYourTurn = isYourTurn
            };
        }

        private AppointmentDetailsResponse MapToDetailsResponse(TblAppointment a, int token)
        {
            return new AppointmentDetailsResponse
            {
                Id = a.Id,
                AppointmentCode = a.AppointmentCode,
                PatientId = a.PatientId,
                PatientName = a.Patient?.Name ?? "Unknown",
                Datetime = a.Datetime,
                Status = a.Status,
                Notes = a.Notes,
                TokenNumber = token,
                ClinicDoctorName = "Clinic Doctor",
                CreatedAt = a.CreatedAt ?? DateTime.UtcNow
            };
        }
    }
}

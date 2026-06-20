using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SCMS.Database.Models;
using SCMS.Domain.DTOs.Payments;
using SCMS.Shared;
using SCMS.Domain.DTOs.Notifications;
using SCMS.Domain.Features.Notifications;

namespace SCMS.Domain.Features.Payments
{
    public class PaymentService
    {
        private readonly AppDbContext _context;
        private readonly NotificationService? _notificationService;
        private static readonly HashSet<string> AllowedPaymentStatuses = new(StringComparer.OrdinalIgnoreCase)
        {
            "pending",
            "paid",
            "partial",
            "failed",
            "refunded"
        };

        public PaymentService(AppDbContext context, NotificationService? notificationService = null)
        {
            _context = context;
            _notificationService = notificationService;
        }

        public async Task<Result<PaymentDetailsResponse>> ProcessGatewayCallbackAsync(ProcessPaymentCallbackRequest request)
        {
            if (request.AppointmentId <= 0)
            {
                return Result<PaymentDetailsResponse>.Failure("Appointment id is required.");
            }
            if (request.Amount <= 0)
            {
                return Result<PaymentDetailsResponse>.Failure("Payment amount must be greater than zero.");
            }
            if (string.IsNullOrWhiteSpace(request.PaymentMethod))
            {
                return Result<PaymentDetailsResponse>.Failure("Payment method is required.");
            }

            var appointment = await _context.TblAppointments
                .Include(a => a.Patient)
                .FirstOrDefaultAsync(a => a.Id == request.AppointmentId);

            if (appointment == null)
            {
                return Result<PaymentDetailsResponse>.Failure("Appointment not found.");
            }

            // Find existing payment or create one
            var payment = await _context.TblPayments
                .FirstOrDefaultAsync(p => p.AppointmentId == request.AppointmentId);

            if (payment == null)
            {
                payment = new TblPayment
                {
                    AppointmentId = request.AppointmentId,
                    Amount = request.Amount,
                    Tax = request.Amount * 0.05m, // 5% tax
                    Charges = 0,
                    PaymentMethod = request.PaymentMethod.ToLower().Trim(),
                    PaymentStatus = "pending",
                    UpdatedAt = DateTime.UtcNow
                };
                _context.TblPayments.Add(payment);
            }
            else if (payment.PaymentStatus == "paid")
            {
                return Result<PaymentDetailsResponse>.Success(MapToResponse(payment, appointment), "Payment already paid. Callback ignored.");
            }
            else
            {
                payment.Amount = request.Amount;
                payment.Tax = request.Amount * 0.05m;
                payment.PaymentMethod = request.PaymentMethod.ToLower().Trim();
                payment.UpdatedAt = DateTime.UtcNow;
            }

            if (request.IsSuccess)
            {
                payment.PaymentStatus = "paid";
                payment.PaidAt = DateTime.UtcNow;
                payment.UpdatedAt = DateTime.UtcNow;

                // Gateway Payments: Automatically mark invoice as Paid and update appointment status upon receiving successful API callback (Story 7)
                appointment.Status = "confirmed";
                appointment.UpdatedAt = DateTime.UtcNow;

                // Send notification
                if (_notificationService != null)
                {
                    await _notificationService.CreateNotificationAsync(new CreateNotificationRequest
                    {
                        UserId = appointment.Patient.UserId,
                        Title = "Payment Successful",
                        Description = $"Gateway payment of {payment.Amount:N2} received. Your appointment (Code: {appointment.AppointmentCode}) is now Confirmed.",
                        ActionRoute = $"/appointments/{appointment.Id}"
                    });
                }
                else
                {
                    var notification = new TblNotification
                    {
                        UserId = appointment.Patient.UserId,
                        Title = "Payment Successful",
                        Description = $"Gateway payment of {payment.Amount:N2} received. Your appointment (Code: {appointment.AppointmentCode}) is now Confirmed.",
                        ActionRoute = $"/appointments/{appointment.Id}",
                        CreatedAt = DateTime.UtcNow,
                        DeleteFlag = false
                    };
                    _context.TblNotifications.Add(notification);
                }
            }
            else
            {
                payment.PaymentStatus = "failed";
                payment.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            return Result<PaymentDetailsResponse>.Success(MapToResponse(payment, appointment), "Gateway callback processed successfully.");
        }

        public async Task<Result<PaymentDetailsResponse>> SubmitManualPaymentProofAsync(
            ManualPaymentProofRequest request,
            int? currentUserId = null,
            bool isStaff = true)
        {
            if (request.AppointmentId <= 0)
            {
                return Result<PaymentDetailsResponse>.Failure("Appointment id is required.");
            }
            if (request.Amount <= 0)
            {
                return Result<PaymentDetailsResponse>.Failure("Payment amount must be greater than zero.");
            }
            if (string.IsNullOrWhiteSpace(request.PaymentMethod))
            {
                return Result<PaymentDetailsResponse>.Failure("Payment method is required.");
            }
            if (string.IsNullOrWhiteSpace(request.ScreenshotUrl))
            {
                return Result<PaymentDetailsResponse>.Failure("Payment proof screenshot is required.");
            }

            var appointment = await _context.TblAppointments
                .Include(a => a.Patient)
                .FirstOrDefaultAsync(a => a.Id == request.AppointmentId);

            if (appointment == null)
            {
                return Result<PaymentDetailsResponse>.Failure("Appointment not found.");
            }
            if (!CanAccessAppointment(appointment, currentUserId, isStaff))
            {
                return Result<PaymentDetailsResponse>.Failure("Appointment not found.");
            }

            var payment = await _context.TblPayments
                .FirstOrDefaultAsync(p => p.AppointmentId == request.AppointmentId);

            if (payment == null)
            {
                payment = new TblPayment
                {
                    AppointmentId = request.AppointmentId,
                    Amount = request.Amount,
                    Tax = request.Amount * 0.05m,
                    Charges = 0,
                    PaymentMethod = request.PaymentMethod.ToLower().Trim(),
                    PaymentStatus = "pending", // Pending manual approval
                    PaymentScreenshot = request.ScreenshotUrl,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.TblPayments.Add(payment);
            }
            else if (payment.PaymentStatus == "paid")
            {
                return Result<PaymentDetailsResponse>.Failure("Payment is already paid.");
            }
            else
            {
                payment.Amount = request.Amount;
                payment.Tax = request.Amount * 0.05m;
                payment.PaymentMethod = request.PaymentMethod.ToLower().Trim();
                payment.PaymentScreenshot = request.ScreenshotUrl;
                payment.PaymentStatus = "pending"; // Reset to pending approval
                payment.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            // Send notification to patient
            if (_notificationService != null)
            {
                await _notificationService.CreateNotificationAsync(new CreateNotificationRequest
                {
                    UserId = appointment.Patient.UserId,
                    Title = "Payment Proof Uploaded",
                    Description = $"Your manual transfer proof (Amount: {request.Amount:N2}) is uploaded. It will be verified by clinic staff shortly.",
                    ActionRoute = $"/appointments/{appointment.Id}"
                });
            }
            else
            {
                var notification = new TblNotification
                {
                    UserId = appointment.Patient.UserId,
                    Title = "Payment Proof Uploaded",
                    Description = $"Your manual transfer proof (Amount: {request.Amount:N2}) is uploaded. It will be verified by clinic staff shortly.",
                    ActionRoute = $"/appointments/{appointment.Id}",
                    CreatedAt = DateTime.UtcNow,
                    DeleteFlag = false
                };
                _context.TblNotifications.Add(notification);
                await _context.SaveChangesAsync();
            }

            return Result<PaymentDetailsResponse>.Success(MapToResponse(payment, appointment), "Manual payment proof submitted. Awaiting verification.");
        }

        public async Task<Result<PaymentDetailsResponse>> ApprovePaymentAsync(int paymentId)
        {
            var payment = await _context.TblPayments
                .Include(p => p.Appointment)
                    .ThenInclude(a => a.Patient)
                .FirstOrDefaultAsync(p => p.Id == paymentId);

            if (payment == null)
            {
                return Result<PaymentDetailsResponse>.Failure("Payment not found.");
            }
            if (payment.PaymentStatus == "paid")
            {
                return Result<PaymentDetailsResponse>.Success(MapToResponse(payment, payment.Appointment), "Payment is already paid.");
            }

            payment.PaymentStatus = "paid";
            payment.PaidAt = DateTime.UtcNow;
            payment.UpdatedAt = DateTime.UtcNow;

            payment.Appointment.Status = "confirmed";
            payment.Appointment.UpdatedAt = DateTime.UtcNow;

            // Notify patient
            if (_notificationService != null)
            {
                await _notificationService.CreateNotificationAsync(new CreateNotificationRequest
                {
                    UserId = payment.Appointment.Patient.UserId,
                    Title = "Payment Verified",
                    Description = $"Your manual payment proof of {payment.Amount:N2} has been verified and approved. Your appointment (Code: {payment.Appointment.AppointmentCode}) is now Confirmed.",
                    ActionRoute = $"/appointments/{payment.Appointment.Id}"
                });
            }
            else
            {
                var notification = new TblNotification
                {
                    UserId = payment.Appointment.Patient.UserId,
                    Title = "Payment Verified",
                    Description = $"Your manual payment proof of {payment.Amount:N2} has been verified and approved. Your appointment (Code: {payment.Appointment.AppointmentCode}) is now Confirmed.",
                    ActionRoute = $"/appointments/{payment.Appointment.Id}",
                    CreatedAt = DateTime.UtcNow,
                    DeleteFlag = false
                };
                _context.TblNotifications.Add(notification);
                await _context.SaveChangesAsync();
            }

            return Result<PaymentDetailsResponse>.Success(MapToResponse(payment, payment.Appointment), "Payment verified and appointment confirmed.");
        }

        public async Task<PagedResult<PaymentDetailsResponse>> GetPaymentsAsync(string? status, PaginationRequest paginationRequest, string? dateFilter = null, string? searchQuery = null)
        {
            var query = _context.TblPayments
                .Include(p => p.Appointment)
                    .ThenInclude(a => a.Patient)
                .AsQueryable();

            if (!string.IsNullOrEmpty(status))
            {
                var s = status.ToLower().Trim();
                if (!AllowedPaymentStatuses.Contains(s))
                {
                    return PagedResult<PaymentDetailsResponse>.Failure("Invalid payment status filter.");
                }
                query = query.Where(p => p.PaymentStatus == s);
            }

            if (!string.IsNullOrWhiteSpace(dateFilter))
            {
                if (DateTime.TryParse(dateFilter, out var parsedDate))
                {
                    var dateStart = parsedDate.Date;
                    var dateEnd = dateStart.AddDays(1);
                    query = query.Where(p => (p.PaidAt ?? p.UpdatedAt) >= dateStart && (p.PaidAt ?? p.UpdatedAt) < dateEnd);
                }
            }

            if (!string.IsNullOrWhiteSpace(searchQuery))
            {
                var cleanSearch = searchQuery.Trim().ToLower();
                query = query.Where(p => 
                    (p.Appointment.AppointmentCode != null && p.Appointment.AppointmentCode.ToLower().Contains(cleanSearch)) || 
                    (p.Appointment.Patient.Name != null && p.Appointment.Patient.Name.ToLower().Contains(cleanSearch))
                );
            }

            var totalCount = await query.CountAsync();
            var payments = await query
                .OrderByDescending(p => p.UpdatedAt)
                .Skip((paginationRequest.PageNumber - 1) * paginationRequest.PageSize)
                .Take(paginationRequest.PageSize)
                .ToListAsync();

            var list = payments.Select(p => MapToResponse(p, p.Appointment)).ToList();
            var pagination = new Pagination(paginationRequest.PageNumber, paginationRequest.PageSize, totalCount);

            return PagedResult<PaymentDetailsResponse>.Success(list, pagination);
        }

        public async Task<Result<PaymentDetailsResponse>> GetPaymentByIdAsync(
            int id,
            int? currentUserId = null,
            bool isStaff = true)
        {
            var payment = await _context.TblPayments
                .Include(p => p.Appointment)
                    .ThenInclude(a => a.Patient)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (payment == null)
            {
                return Result<PaymentDetailsResponse>.Failure("Payment not found.");
            }
            if (!CanAccessAppointment(payment.Appointment, currentUserId, isStaff))
            {
                return Result<PaymentDetailsResponse>.Failure("Payment not found.");
            }

            return Result<PaymentDetailsResponse>.Success(MapToResponse(payment, payment.Appointment));
        }

        private static bool CanAccessAppointment(TblAppointment? appointment, int? currentUserId, bool isStaff)
        {
            if (isStaff)
            {
                return true;
            }

            return currentUserId.HasValue
                && appointment?.Patient != null
                && appointment.Patient.UserId == currentUserId.Value;
        }

        private PaymentDetailsResponse MapToResponse(TblPayment p, TblAppointment a)
        {
            return new PaymentDetailsResponse
            {
                Id = p.Id,
                AppointmentId = p.AppointmentId,
                AppointmentCode = a?.AppointmentCode ?? "Unknown",
                PatientName = a?.Patient?.Name ?? "Unknown",
                Amount = p.Amount,
                Tax = p.Tax,
                Charges = p.Charges,
                PaymentMethod = p.PaymentMethod,
                PaymentStatus = p.PaymentStatus,
                PaymentScreenshot = p.PaymentScreenshot,
                PaidAt = p.PaidAt
            };
        }
    }
}

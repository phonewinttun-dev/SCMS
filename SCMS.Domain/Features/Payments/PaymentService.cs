using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using SCMS.Database.Models;
using SCMS.Domain.Features.Notifications;
using SCMS.Domain.Features.Payments.Models;
using SCMS.Domain.Features.Photo;
using SCMS.Shared;

namespace SCMS.Domain.Features.Payments
{
    public class PaymentService : IPaymentService
    {
        private readonly AppDbContext _context;
        private readonly INotificationService? _notificationService;
        private readonly IPhotoService? _photoService;
        private static readonly HashSet<string> AllowedPaymentStatuses = new(StringComparer.OrdinalIgnoreCase)
        {
            "pending",
            "paid",
            "partial",
            "failed",
            "refunded"
        };

        public PaymentService(AppDbContext context, INotificationService? notificationService = null, IPhotoService? photoService = null)
        {
            _context = context;
            _notificationService = notificationService;
            _photoService = photoService;
        }

        public async Task<Result<ProcessPaymentCallbackResponse>> ProcessGatewayCallbackAsync(ProcessPaymentCallbackRequest request)
        {
            if (request.AppointmentId <= 0)
            {
                return Result<ProcessPaymentCallbackResponse>.Failure("Appointment id is required.");
            }
            if (request.Amount <= 0)
            {
                return Result<ProcessPaymentCallbackResponse>.Failure("Payment amount must be greater than zero.");
            }
            if (string.IsNullOrWhiteSpace(request.PaymentMethod))
            {
                return Result<ProcessPaymentCallbackResponse>.Failure("Payment method is required.");
            }

            var appointment = await _context.TblAppointments
                .Include(a => a.Patient)
                .FirstOrDefaultAsync(a => a.Id == request.AppointmentId);

            if (appointment == null)
            {
                return Result<ProcessPaymentCallbackResponse>.Failure("Appointment not found.");
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
                return Result<ProcessPaymentCallbackResponse>.Success(MapToProcessPaymentCallbackResponse(payment, appointment), "Payment already paid. Callback ignored.");
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
                    await _notificationService.CreateNotificationAsync(
                        appointment.Patient.UserId,
                        "Payment Approved & Appointment Confirmed",
                        $"Payment of {payment.Amount:N0} MMK received. Your appointment (Visit {appointment.AppointmentCode}) is now Confirmed.",
                        $"/user/appointments");
                }
                else
                {
                    var notification = new TblNotification
                    {
                        UserId = appointment.Patient.UserId,
                        Title = "Payment Approved & Appointment Confirmed",
                        Description = $"Payment of {payment.Amount:N0} MMK received. Your appointment (Visit {appointment.AppointmentCode}) is now Confirmed.",
                        ActionRoute = $"/user/appointments",
                        CreatedAt = DateTime.UtcNow,
                        DeleteFlag = false
                    };
                    _context.TblNotifications.Add(notification);
                    await _context.SaveChangesAsync();
                }
            }
            else
            {
                payment.PaymentStatus = "failed";
                payment.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            return Result<ProcessPaymentCallbackResponse>.Success(MapToProcessPaymentCallbackResponse(payment, appointment), "Gateway callback processed successfully.");
        }

        public async Task<Result<ManualPaymentProofResponse>> SubmitManualPaymentProofAsync(ManualPaymentProofRequest request, IFormFile? screenshotFile = null)
        {
            if (request.AppointmentId <= 0)
            {
                return Result<ManualPaymentProofResponse>.Failure("Appointment id is required.");
            }
            if (request.Amount <= 0)
            {
                return Result<ManualPaymentProofResponse>.Failure("Payment amount must be greater than zero.");
            }
            if (string.IsNullOrWhiteSpace(request.PaymentMethod))
            {
                return Result<ManualPaymentProofResponse>.Failure("Payment method is required.");
            }
            if (string.IsNullOrWhiteSpace(request.TransactionLast6) || request.TransactionLast6.Trim().Length != 6 || !request.TransactionLast6.Trim().All(char.IsDigit))
            {
                return Result<ManualPaymentProofResponse>.Failure("Transaction ID must be exactly the last 6 digits of the payment receipt.");
            }

            string? screenshotUrl = null;
            if (screenshotFile != null && screenshotFile.Length > 0)
            {
                if (_photoService == null)
                {
                    return Result<ManualPaymentProofResponse>.Failure("Photo service is not configured.");
                }

                var uploadResult = await _photoService.UploadPhotoAsync(screenshotFile, "scms/payments");
                if (!uploadResult.IsSuccess || uploadResult.Data == null)
                {
                    return Result<ManualPaymentProofResponse>.Failure(uploadResult.Message ?? "Failed to upload payment proof screenshot.");
                }

                screenshotUrl = uploadResult.Data.Url;
            }
            else if (!string.IsNullOrWhiteSpace(request.ScreenshotUrl))
            {
                screenshotUrl = request.ScreenshotUrl.Trim();
            }

            if (string.IsNullOrWhiteSpace(screenshotUrl))
            {
                return Result<ManualPaymentProofResponse>.Failure("Payment proof screenshot is required.");
            }

            var appointment = await _context.TblAppointments
                .Include(a => a.Patient)
                .FirstOrDefaultAsync(a => a.Id == request.AppointmentId);

            if (appointment == null)
            {
                return Result<ManualPaymentProofResponse>.Failure("Appointment not found.");
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
                    PaymentScreenshot = screenshotUrl,
                    TransactionRef = request.TransactionLast6.Trim(),
                    UpdatedAt = DateTime.UtcNow
                };
                _context.TblPayments.Add(payment);
            }
            else if (payment.PaymentStatus == "paid")
            {
                return Result<ManualPaymentProofResponse>.Failure("Payment is already paid.");
            }
            else
            {
                payment.Amount = request.Amount;
                payment.Tax = request.Amount * 0.05m;
                payment.PaymentMethod = request.PaymentMethod.ToLower().Trim();
                payment.PaymentScreenshot = screenshotUrl;
                payment.TransactionRef = request.TransactionLast6.Trim();
                payment.PaymentStatus = "pending"; // Reset to pending approval
                payment.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            // Send notification to patient
            if (_notificationService != null)
            {
                await _notificationService.CreateNotificationAsync(
                    appointment.Patient.UserId,
                    "Payment Proof Submitted",
                    $"Transfer proof of {request.Amount:N0} MMK (Txn: {request.TransactionLast6.Trim()}) for Visit {appointment.AppointmentCode} has been submitted for clinic verification.",
                    $"/user/billing");
            }
            else
            {
                var notification = new TblNotification
                {
                    UserId = appointment.Patient.UserId,
                    Title = "Payment Proof Submitted",
                    Description = $"Transfer proof of {request.Amount:N0} MMK (Txn: {request.TransactionLast6.Trim()}) for Visit {appointment.AppointmentCode} has been submitted for clinic verification.",
                    ActionRoute = $"/user/billing",
                    CreatedAt = DateTime.UtcNow,
                    DeleteFlag = false
                };
                _context.TblNotifications.Add(notification);
                await _context.SaveChangesAsync();
            }

            return Result<ManualPaymentProofResponse>.Success(MapToManualPaymentProofResponse(payment, appointment), "Manual payment proof submitted. Awaiting verification.");
        }

        public async Task<Result<ApprovePaymentResponse>> ApprovePaymentAsync(int paymentId)
        {
            var payment = await _context.TblPayments
                .Include(p => p.Appointment)
                    .ThenInclude(a => a.Patient)
                .FirstOrDefaultAsync(p => p.Id == paymentId);

            if (payment == null)
            {
                return Result<ApprovePaymentResponse>.Failure("Payment not found.");
            }
            if (payment.PaymentStatus == "paid")
            {
                return Result<ApprovePaymentResponse>.Success(MapToApprovePaymentResponse(payment, payment.Appointment), "Payment is already paid.");
            }

            payment.PaymentStatus = "paid";
            payment.PaidAt = DateTime.UtcNow;
            payment.UpdatedAt = DateTime.UtcNow;

            payment.Appointment.Status = "confirmed";
            payment.Appointment.UpdatedAt = DateTime.UtcNow;

            // Notify patient
            if (_notificationService != null)
            {
                await _notificationService.CreateNotificationAsync(
                    payment.Appointment.Patient.UserId,
                    "Payment Approved & Appointment Confirmed",
                    $"Your payment of {payment.Amount:N0} MMK has been approved. Your appointment (Visit {payment.Appointment.AppointmentCode}) is now Confirmed.",
                    $"/user/appointments");
            }
            else
            {
                var notification = new TblNotification
                {
                    UserId = payment.Appointment.Patient.UserId,
                    Title = "Payment Approved & Appointment Confirmed",
                    Description = $"Your payment of {payment.Amount:N0} MMK has been approved. Your appointment (Visit {payment.Appointment.AppointmentCode}) is now Confirmed.",
                    ActionRoute = $"/user/appointments",
                    CreatedAt = DateTime.UtcNow,
                    DeleteFlag = false
                };
                _context.TblNotifications.Add(notification);
                await _context.SaveChangesAsync();
            }

            return Result<ApprovePaymentResponse>.Success(MapToApprovePaymentResponse(payment, payment.Appointment), "Payment verified and appointment confirmed.");
        }

        public async Task<PagedResult<GetPaymentsResponse>> GetPaymentsAsync(GetPaymentsRequest request)
        {
            request ??= new GetPaymentsRequest();
            if (request.PageNumber <= 0) request.PageNumber = 1;
            if (request.PageSize <= 0) request.PageSize = 10;

            var query = _context.TblPayments
                .AsNoTracking()
                .Include(p => p.Appointment)
                    .ThenInclude(a => a.Patient)
                .AsQueryable();

            if (!string.IsNullOrEmpty(request.Status))
            {
                var s = request.Status.ToLower().Trim();
                if (!AllowedPaymentStatuses.Contains(s))
                {
                    return PagedResult<GetPaymentsResponse>.Failure("Invalid payment status filter.");
                }
                query = query.Where(p => p.PaymentStatus == s);
            }

            if (!string.IsNullOrWhiteSpace(request.DateFilter))
            {
                if (DateTime.TryParse(request.DateFilter, out var parsedDate))
                {
                    var dateStart = parsedDate.Date;
                    var dateEnd = dateStart.AddDays(1);
                    query = query.Where(p => (p.PaidAt ?? p.UpdatedAt) >= dateStart && (p.PaidAt ?? p.UpdatedAt) < dateEnd);
                }
            }

            var totalCount = await query.CountAsync();
            var payments = await query
                .OrderBy(p => p.Id)
                .Skip((request.PageNumber - 1) * request.PageSize)
                .Take(request.PageSize)
                .ToListAsync();

            var list = payments.Select(p => MapToGetPaymentsResponse(p, p.Appointment)).ToList();
            var pagination = new Pagination(request.PageNumber, request.PageSize, totalCount);

            return PagedResult<GetPaymentsResponse>.Success(list, pagination);
        }

        public async Task<PagedResult<SearchPaymentsResponse>> SearchPaymentsAsync(SearchPaymentsRequest request)
        {
            request ??= new SearchPaymentsRequest();
            if (request.PageNumber <= 0) request.PageNumber = 1;
            if (request.PageSize <= 0) request.PageSize = 10;

            var query = _context.TblPayments
                .AsNoTracking()
                .Include(p => p.Appointment)
                    .ThenInclude(a => a.Patient)
                .AsQueryable();

            if (!string.IsNullOrEmpty(request.Status))
            {
                var s = request.Status.ToLower().Trim();
                if (!AllowedPaymentStatuses.Contains(s))
                {
                    return PagedResult<SearchPaymentsResponse>.Failure("Invalid payment status filter.");
                }
                query = query.Where(p => p.PaymentStatus == s);
            }

            if (!string.IsNullOrWhiteSpace(request.DateFilter))
            {
                if (DateTime.TryParse(request.DateFilter, out var parsedDate))
                {
                    var dateStart = parsedDate.Date;
                    var dateEnd = dateStart.AddDays(1);
                    query = query.Where(p => (p.PaidAt ?? p.UpdatedAt) >= dateStart && (p.PaidAt ?? p.UpdatedAt) < dateEnd);
                }
            }

            if (!string.IsNullOrWhiteSpace(request.Query))
            {
                var cleanSearch = request.Query.Trim().ToLower();
                query = query.Where(p => 
                    (p.Appointment.AppointmentCode != null && p.Appointment.AppointmentCode.ToLower().Contains(cleanSearch)) || 
                    (p.Appointment.Patient.Name != null && p.Appointment.Patient.Name.ToLower().Contains(cleanSearch))
                );
            }

            var totalCount = await query.CountAsync();
            var payments = await query
                .OrderBy(p => p.Id)
                .Skip((request.PageNumber - 1) * request.PageSize)
                .Take(request.PageSize)
                .ToListAsync();

            var list = payments.Select(p => MapToSearchPaymentsResponse(p, p.Appointment)).ToList();
            var pagination = new Pagination(request.PageNumber, request.PageSize, totalCount);

            return PagedResult<SearchPaymentsResponse>.Success(list, pagination);
        }

        public async Task<Result<GetPaymentByIdResponse>> GetPaymentByIdAsync(int id)
        {
            var payment = await _context.TblPayments
                .Include(p => p.Appointment)
                    .ThenInclude(a => a.Patient)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (payment == null)
            {
                return Result<GetPaymentByIdResponse>.Failure("Payment not found.");
            }

            return Result<GetPaymentByIdResponse>.Success(MapToGetPaymentByIdResponse(payment, payment.Appointment));
        }

        private static GetPaymentsResponse MapToGetPaymentsResponse(TblPayment p, TblAppointment a)
        {
            return new GetPaymentsResponse
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
                TransactionRef = p.TransactionRef,
                PaidAt = p.PaidAt
            };
        }

        private static SearchPaymentsResponse MapToSearchPaymentsResponse(TblPayment p, TblAppointment a)
        {
            return new SearchPaymentsResponse
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
                TransactionRef = p.TransactionRef,
                PaidAt = p.PaidAt
            };
        }

        private static GetPaymentByIdResponse MapToGetPaymentByIdResponse(TblPayment p, TblAppointment a)
        {
            return new GetPaymentByIdResponse
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
                TransactionRef = p.TransactionRef,
                PaidAt = p.PaidAt
            };
        }

        private static ProcessPaymentCallbackResponse MapToProcessPaymentCallbackResponse(TblPayment p, TblAppointment a)
        {
            return new ProcessPaymentCallbackResponse
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
                TransactionRef = p.TransactionRef,
                PaidAt = p.PaidAt
            };
        }

        private static ManualPaymentProofResponse MapToManualPaymentProofResponse(TblPayment p, TblAppointment a)
        {
            return new ManualPaymentProofResponse
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
                TransactionRef = p.TransactionRef,
                PaidAt = p.PaidAt
            };
        }

        private static ApprovePaymentResponse MapToApprovePaymentResponse(TblPayment p, TblAppointment a)
        {
            return new ApprovePaymentResponse
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
                TransactionRef = p.TransactionRef,
                PaidAt = p.PaidAt
            };
        }
    }
}

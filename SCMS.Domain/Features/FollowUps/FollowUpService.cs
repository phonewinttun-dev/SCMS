using Microsoft.EntityFrameworkCore;
using SCMS.Database.Models;
using SCMS.Shared;
using SCMS.Domain.DTOs.FollowUps;
using SCMS.Domain.Features.Notifications;

namespace SCMS.Domain.Features.FollowUps
{
    public class FollowUpService
    {
        private readonly AppDbContext _context;
        private readonly NotificationService? _notificationService;

        public FollowUpService(AppDbContext context, NotificationService? notificationService = null)
        {
            _context = context;
            _notificationService = notificationService;
        }

        public async Task<PagedResult<FollowUpResponse>> GetFollowUpsAsync(int? patientId, int currentUserId, bool isStaff, PaginationRequest paginationRequest)
        {
            var query = _context.TblFollowUps
                .Include(f => f.Patient)
                .Where(f => f.DeleteFlag != true);

            if (patientId.HasValue)
            {
                query = query.Where(f => f.PatientId == patientId.Value);
            }

            if (!isStaff)
            {
                query = query.Where(f => f.Patient.UserId == currentUserId);
            }

            var totalCount = await query.CountAsync();
            var list = await query
                .OrderBy(f => f.Status)
                .ThenBy(f => f.DueAt)
                .Skip((paginationRequest.PageNumber - 1) * paginationRequest.PageSize)
                .Take(paginationRequest.PageSize)
                .Select(f => MapToResponse(f))
                .ToListAsync();

            return PagedResult<FollowUpResponse>.Success(list, new Pagination(paginationRequest.PageNumber, paginationRequest.PageSize, totalCount));
        }

        public async Task<Result<FollowUpResponse>> CreateFollowUpAsync(FollowUpRequest request)
        {
            if (request.PatientId <= 0)
            {
                return Result<FollowUpResponse>.Failure("Patient id is required.");
            }
            if (request.DueAt == default)
            {
                return Result<FollowUpResponse>.Failure("Follow-up due date is required.");
            }

            var patient = await _context.TblPatients.FirstOrDefaultAsync(p => p.PatientId == request.PatientId && p.DeleteFlag != true);
            if (patient == null)
            {
                return Result<FollowUpResponse>.Failure("Patient not found.");
            }

            var followUp = new TblFollowUp
            {
                PatientId = request.PatientId,
                AppointmentId = request.AppointmentId,
                PrescriptionId = request.PrescriptionId,
                DueAt = request.DueAt,
                Recommendation = request.Recommendation?.Trim(),
                Status = "pending",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                DeleteFlag = false
            };

            _context.TblFollowUps.Add(followUp);
            if (_notificationService != null)
            {
                await _notificationService.CreateNotificationAsync(
                    patient.UserId,
                    "Follow-up Scheduled",
                    $"{patient.Name} has a follow-up due on {request.DueAt:yyyy-MM-dd HH:mm}.",
                    $"/follow-ups?patientId={patient.PatientId}");
            }
            else
            {
                _context.TblNotifications.Add(new TblNotification
                {
                    UserId = patient.UserId,
                    Title = "Follow-up Scheduled",
                    Description = $"{patient.Name} has a follow-up due on {request.DueAt:yyyy-MM-dd HH:mm}.",
                    ActionRoute = $"/follow-ups?patientId={patient.PatientId}",
                    CreatedAt = DateTime.UtcNow,
                    DeleteFlag = false
                });
            }

            await _context.SaveChangesAsync();
            followUp.Patient = patient;

            return Result<FollowUpResponse>.Success(MapToResponse(followUp), "Follow-up scheduled.");
        }

        public async Task<Result<FollowUpResponse>> CompleteFollowUpAsync(int id)
        {
            var followUp = await _context.TblFollowUps
                .Include(f => f.Patient)
                .FirstOrDefaultAsync(f => f.Id == id && f.DeleteFlag != true);

            if (followUp == null)
            {
                return Result<FollowUpResponse>.Failure("Follow-up not found.");
            }

            followUp.Status = "completed";
            followUp.CompletedAt = DateTime.UtcNow;
            followUp.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Result<FollowUpResponse>.Success(MapToResponse(followUp), "Follow-up completed.");
        }

        private static FollowUpResponse MapToResponse(TblFollowUp followUp)
            => new()
            {
                Id = followUp.Id,
                PatientId = followUp.PatientId,
                PatientName = followUp.Patient?.Name ?? "Unknown",
                AppointmentId = followUp.AppointmentId,
                PrescriptionId = followUp.PrescriptionId,
                DueAt = followUp.DueAt,
                Recommendation = followUp.Recommendation,
                Status = followUp.Status,
                CreatedAt = followUp.CreatedAt ?? DateTime.UtcNow,
                CompletedAt = followUp.CompletedAt
            };
    }
}

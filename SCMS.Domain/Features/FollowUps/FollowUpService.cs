using Microsoft.EntityFrameworkCore;
using SCMS.Database.Models;
using SCMS.Shared;
using SCMS.Domain.DTOs.Notifications;
using SCMS.Domain.DTOs.FollowUps;
using SCMS.Domain.Features.Notifications;

namespace SCMS.Domain.Features.FollowUps
{
    public class FollowUpService : IFollowUpService
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
            // Build the base query for follow-ups that are not deleted
            var query = _context.TblFollowUps
                .Include(f => f.Patient)
                .Where(f => f.DeleteFlag != true);

            // Filter by Patient ID if specified
            if (patientId.HasValue)
            {
                query = query.Where(f => f.PatientId == patientId.Value);
            }

            // Regular patients can only view their own follow-up schedules
            if (!isStaff)
            {
                query = query.Where(f => f.Patient.UserId == currentUserId);
            }

            // PERFORMANCE OPTIMIZATION:
            // CountAsync() followed by ToListAsync() results in two database queries.
            // CountAsync() can be slow on large tables because it scans the records.
            // Instead of counting the whole table, we fetch (PageSize + 1) records.
            // If we receive (PageSize + 1) records, we know there is at least one more page.
            var entities = await query
                .OrderBy(f => f.Status)
                .ThenBy(f => f.DueAt)
                .Skip((paginationRequest.PageNumber - 1) * paginationRequest.PageSize)
                .Take(paginationRequest.PageSize + 1)
                .ToListAsync();

            // Check if there is a next page based on whether we fetched the extra item
            bool hasNextPage = entities.Count > paginationRequest.PageSize;

            // If the extra item exists, remove it from the list returned to the user
            if (hasNextPage)
            {
                entities.RemoveAt(entities.Count - 1);
            }

            // Map database entities directly to the DTO response format
            var list = entities.Select(f => new FollowUpResponse
            {
                Id = f.Id,
                PatientId = f.PatientId,
                PatientName = f.Patient?.Name ?? "Unknown",
                AppointmentId = f.AppointmentId,
                PrescriptionId = f.PrescriptionId,
                DueAt = f.DueAt,
                Recommendation = f.Recommendation ?? "",
                Status = f.Status,
                CreatedAt = f.CreatedAt ?? DateTime.UtcNow,
                CompletedAt = f.CompletedAt
            }).ToList();

            // Calculate estimated total count:
            // - If there is a next page, the total count is at least (offset + page size + 1)
            // - If there is no next page, the total count is exactly (offset + items fetched)
            int totalCount = (paginationRequest.PageNumber - 1) * paginationRequest.PageSize + list.Count + (hasNextPage ? 1 : 0);

            var pagination = new Pagination(paginationRequest.PageNumber, paginationRequest.PageSize, totalCount);
            return PagedResult<FollowUpResponse>.Success(list, pagination);
        }

        public async Task<Result<FollowUpResponse>> CreateFollowUpAsync(FollowUpRequest request)
        {
            // Basic validation
            if (request.PatientId <= 0)
            {
                return Result<FollowUpResponse>.Failure("Patient id is required.");
            }
            if (request.DueAt == default)
            {
                return Result<FollowUpResponse>.Failure("Follow-up due date is required.");
            }

            // Verify that the target patient exists
            var patient = await _context.TblPatients.FirstOrDefaultAsync(p => p.PatientId == request.PatientId && p.DeleteFlag != true);
            if (patient == null)
            {
                return Result<FollowUpResponse>.Failure("Patient not found.");
            }

            // Initialize the follow-up record
            var followUp = new TblFollowUp
            {
                PatientId = request.PatientId,
                AppointmentId = request.AppointmentId,
                PrescriptionId = request.PrescriptionId,
                DueAt = request.DueAt,
                Recommendation = request.Recommendation?.Trim() ?? "",
                Status = "pending",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                DeleteFlag = false
            };

            // Start an explicit database transaction
            await using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Add the follow-up to the context
                _context.TblFollowUps.Add(followUp);

                // Create the notification associated with this follow-up
                if (_notificationService != null)
                {
                    await _notificationService.CreateNotificationAsync(new CreateNotificationRequest
                    {
                        UserId = patient.UserId,
                        Title = "Follow-up Scheduled",
                        Description = $"{patient.Name} has a follow-up due on {request.DueAt:dd-MM-yyyy HH:mm}.",
                        ActionRoute = $"/follow-ups?patientId={patient.PatientId}"
                    });
                }
                else
                {
                    _context.TblNotifications.Add(new TblNotification
                    {
                        UserId = patient.UserId,
                        Title = "Follow-up Scheduled",
                        Description = $"{patient.Name} has a follow-up due on {request.DueAt:dd-MM-yyyy HH:mm}.",
                        ActionRoute = $"/follow-ups?patientId={patient.PatientId}",
                        CreatedAt = DateTime.UtcNow,
                        DeleteFlag = false
                    });
                }

                // Save all pending changes to the database
                await _context.SaveChangesAsync();

                // Commit the transaction to save changes permanently
                await transaction.CommitAsync();

                // Assign the patient entity relation back for response mapping
                followUp.Patient = patient;

                var response = new FollowUpResponse
                {
                    Id = followUp.Id,
                    PatientId = followUp.PatientId,
                    PatientName = followUp.Patient?.Name ?? "Unknown",
                    AppointmentId = followUp.AppointmentId,
                    PrescriptionId = followUp.PrescriptionId,
                    DueAt = followUp.DueAt,
                    Recommendation = followUp.Recommendation ?? "",
                    Status = followUp.Status,
                    CreatedAt = followUp.CreatedAt ?? DateTime.UtcNow,
                    CompletedAt = followUp.CompletedAt
                };

                return Result<FollowUpResponse>.Success(response, "Follow-up scheduled.");
            }
            catch (Exception ex)
            {
                // Rollback changes if an error occurs to maintain data integrity
                await transaction.RollbackAsync();
                return Result<FollowUpResponse>.Failure($"Failed to schedule follow-up: {ex.Message}");
            }
        }

        public async Task<Result<FollowUpResponse>> CompleteFollowUpAsync(int id)
        {
            // Fetch the follow-up record including patient details
            var followUp = await _context.TblFollowUps
                .Include(f => f.Patient)
                .FirstOrDefaultAsync(f => f.Id == id && f.DeleteFlag != true);

            if (followUp == null)
            {
                return Result<FollowUpResponse>.Failure("Follow-up not found.");
            }

            // Update status and timestamp details
            followUp.Status = "completed";
            followUp.CompletedAt = DateTime.UtcNow;
            followUp.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var response = new FollowUpResponse
            {
                Id = followUp.Id,
                PatientId = followUp.PatientId,
                PatientName = followUp.Patient?.Name ?? "Unknown",
                AppointmentId = followUp.AppointmentId,
                PrescriptionId = followUp.PrescriptionId,
                DueAt = followUp.DueAt,
                Recommendation = followUp.Recommendation ?? "",
                Status = followUp.Status,
                CreatedAt = followUp.CreatedAt ?? DateTime.UtcNow,
                CompletedAt = followUp.CompletedAt
            };

            return Result<FollowUpResponse>.Success(response, "Follow-up completed.");
        }
    }
}

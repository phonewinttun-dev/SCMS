using SCMS.Domain.DTOs.FollowUps;
using SCMS.Shared;

namespace SCMS.Domain.Features.FollowUps
{
    public interface IFollowUpService
    {
        Task<PagedResult<FollowUpResponse>> GetFollowUpsAsync(int? patientId, int currentUserId, bool isStaff, PaginationRequest paginationRequest);
        Task<Result<FollowUpResponse>> CreateFollowUpAsync(FollowUpRequest request);
        Task<Result<FollowUpResponse>> CompleteFollowUpAsync(int id);
    }
}

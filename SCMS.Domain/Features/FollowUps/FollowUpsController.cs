using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SCMS.Domain.Security;
using SCMS.Shared;
using SCMS.Domain.DTOs.FollowUps;

namespace SCMS.Domain.Features.FollowUps
{
    [ApiController]
    [Authorize]
    [Route("api/[controller]")]
    public class FollowUpsController : ControllerBase
    {
        private readonly FollowUpService _followUpService;

        public FollowUpsController(FollowUpService followUpService)
        {
            _followUpService = followUpService;
        }

        [HttpGet]
        public async Task<IActionResult> GetFollowUp([FromQuery] int? patientId, [FromQuery] PaginationRequest paginationRequest)
        {
            var userId = User.GetUserId();
            if (!userId.HasValue) return Unauthorized(Result.Failure("User id claim is missing."));

            paginationRequest ??= new PaginationRequest();
            var result = await _followUpService.GetFollowUpsAsync(patientId, userId.Value, User.IsStaff(), paginationRequest);
            return result.IsSuccess ? Ok(result) : BadRequest(result);
        }

        [HttpPost]
        [Authorize(Roles = "owner,admin,doctor")]
        public async Task<IActionResult> CreateFollowUp([FromBody] FollowUpRequest request)
        {
            var result = await _followUpService.CreateFollowUpAsync(request);
            return result.IsSuccess ? Ok(result) : BadRequest(result);
        }

        [HttpPost("{id}/complete")]
        [Authorize(Roles = "owner,admin,doctor")]

        public async Task<IActionResult> CompleteFollowUp(int id)
        {
            var result = await _followUpService.CompleteFollowUpAsync(id);
            return result.IsSuccess ? Ok(result) : BadRequest(result);
        }
    }
}

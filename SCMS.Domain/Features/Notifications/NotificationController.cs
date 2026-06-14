using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SCMS.Domain.DTOs.Notifications;
using SCMS.Domain.Security;
using SCMS.Shared;

namespace SCMS.Domain.Features.Notifications
{
    [ApiController]
    [Authorize]
    [Route("api/[controller]")]
    public class NotificationController : ControllerBase
    {
        private readonly INotificationService _notificationService;

        public NotificationController(INotificationService notificationService)
        {
            _notificationService = notificationService;
        }

        [HttpGet]
        public async Task<IActionResult> GetNotifications([FromQuery] PaginationRequest paginationRequest, [FromQuery] bool includeAll = false)
        {
            if (paginationRequest.PageNumber <= 0) paginationRequest.PageNumber = 1;
            if (paginationRequest.PageSize <= 0) paginationRequest.PageSize = 10;

            var currentUserId = User.GetUserId();
            if (!includeAll && !currentUserId.HasValue)
            {
                return Unauthorized(Result.Failure("User id is required."));
            }

            int? userId = includeAll && User.IsStaff() ? null : currentUserId;

            var result = await _notificationService.GetNotificationsAsync(userId, paginationRequest);
            if (result.IsFailure)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }

        [HttpPost("{id}/read")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            var userId = User.GetUserId();
            if (!userId.HasValue)
            {
                return Unauthorized(Result.Failure("User id is required."));
            }

            var result = await _notificationService.MarkAsReadAsync(id, userId.Value);
            if (result.IsFailure)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }

        [HttpPost]
        [Authorize(Roles = "owner,admin,doctor")]
        public async Task<IActionResult> CreateNotification([FromBody] CreateNotificationRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(Result.Failure("Invalid request data."));
            }

            var result = await _notificationService.CreateNotificationAsync(request);
            if (result.IsFailure)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }
    }
}

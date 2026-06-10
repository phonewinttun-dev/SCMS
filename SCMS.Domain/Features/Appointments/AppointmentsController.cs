using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SCMS.Domain.Security;
using SCMS.Domain.DTOs.Appointments;
using SCMS.Shared;

namespace SCMS.Domain.Features.Appointments
{
    [ApiController]
    [Authorize]
    [Route("api/[controller]")]
    public class AppointmentsController : ControllerBase
    {
        private readonly AppointmentsService _appointmentsService;

        public AppointmentsController(AppointmentsService appointmentsService)
        {
            _appointmentsService = appointmentsService;
        }

        [HttpPost]
        public async Task<IActionResult> BookAppointment([FromBody] BookAppointmentRequest request)
        {
            var userId = User.GetUserId();
            if (!userId.HasValue)
            {
                return Unauthorized(Result.Failure("User id is required."));
            }

            var result = await _appointmentsService.BookAppointmentAsync(request, userId.Value);
            if (result.IsFailure)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }

        [HttpGet]
        public async Task<IActionResult> GetAppointments(
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate,
            [FromQuery] string? status,
            [FromQuery] int? patientId,
            [FromQuery] PaginationRequest paginationRequest)
        {
            // Bind fallback defaults if request properties are empty
            paginationRequest ??= new PaginationRequest();
            if (paginationRequest.PageNumber <= 0) paginationRequest.PageNumber = 1;
            if (paginationRequest.PageSize <= 0) paginationRequest.PageSize = 10;

            var userId = User.GetUserId();
            if (!userId.HasValue)
            {
                return Unauthorized(Result.Failure("User id is required."));
            }

            var result = await _appointmentsService.GetAppointmentsAsync(startDate, endDate, status, patientId, paginationRequest, userId.Value, User.IsStaff());
            if (result.IsFailure)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }

        [HttpPatch("{id}/status")]
        [Authorize(Roles = "owner,admin,doctor")]
        public async Task<IActionResult> UpdateAppointmentStatus(int id, [FromBody] UpdateAppointmentStatusRequest request)
        {
            var result = await _appointmentsService.UpdateAppointmentStatusAsync(id, request);
            if (result.IsFailure)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }

        [HttpPost("{id}/reschedule")]
        [Authorize(Roles = "owner,admin,doctor")]
        public async Task<IActionResult> RescheduleAppointment(int id, [FromBody] RescheduleAppointmentRequest request)
        {
            var result = await _appointmentsService.RescheduleAppointmentAsync(id, request);
            if (result.IsFailure)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }

        [HttpGet("{id}/queue-status")]
        public async Task<IActionResult> GetPatientQueueStatus(int id)
        {
            var result = await _appointmentsService.GetPatientQueueStatusAsync(id);
            if (result.IsFailure)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }

        [HttpPost("call-next")]
        [Authorize(Roles = "owner,admin,doctor")]
        public async Task<IActionResult> CallNextPatient()
        {
            var result = await _appointmentsService.CallNextPatientAsync();
            if (result.IsFailure)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }
    }
}

using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SCMS.Domain.Features.Documents;
using SCMS.Domain.DTOs.Prescriptions;
using SCMS.Domain.Security;
using SCMS.Shared;

namespace SCMS.Domain.Features.Prescriptions
{
    [ApiController]
    [Authorize]
    [Route("api/[controller]")]
    public class PrescriptionsController : ControllerBase
    {
        private readonly PrescriptionService _prescriptionService;
        private readonly PdfDocumentService _pdfDocumentService;

        public PrescriptionsController(PrescriptionService prescriptionService, PdfDocumentService pdfDocumentService)
        {
            _prescriptionService = prescriptionService;
            _pdfDocumentService = pdfDocumentService;
        }

        [HttpPost]
        [Authorize(Roles = "owner,admin,doctor")]
        public async Task<IActionResult> CreatePrescription([FromBody] CreatePrescriptionRequest request)
        {
            var result = await _prescriptionService.CreatePrescriptionAsync(request);
            if (result.IsFailure)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }

        [HttpGet("prescriptions/{id}")]
        public async Task<IActionResult> GetPrescriptionDetails(int id)
        {
            var userId = User.GetUserId();
            if (!userId.HasValue)
            {
                return Unauthorized(Result.Failure("User id is required."));
            }

            var result = await _prescriptionService.GetPrescriptionDetailsAsync(id, userId.Value, User.IsStaff());
            if (result.IsFailure)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }

        [HttpGet]
        public async Task<IActionResult> GetPrescriptions([FromQuery] int? patientId, [FromQuery] PaginationRequest paginationRequest)
        {
            paginationRequest ??= new PaginationRequest();
            if (paginationRequest.PageNumber <= 0) paginationRequest.PageNumber = 1;
            if (paginationRequest.PageSize <= 0) paginationRequest.PageSize = 10;

            var userId = User.GetUserId();
            if (!userId.HasValue)
            {
                return Unauthorized(Result.Failure("User id is required."));
            }

            var result = await _prescriptionService.GetPrescriptionsAsync(patientId, paginationRequest, userId.Value, User.IsStaff());
            if (result.IsFailure)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }

        [HttpPost("templates")]
        [Authorize(Roles = "owner,admin,doctor")]
        public async Task<IActionResult> SaveTemplate([FromBody] SaveTemplateRequest request)
        {
            var result = await _prescriptionService.SaveTemplateAsync(request);
            if (result.IsFailure)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }

        [HttpGet("templates")]
        [Authorize(Roles = "owner,admin,doctor")]
        public async Task<IActionResult> GetTemplates([FromQuery] int? diseaseId, [FromQuery] PaginationRequest paginationRequest)
        {
            paginationRequest ??= new PaginationRequest();
            if (paginationRequest.PageNumber <= 0) paginationRequest.PageNumber = 1;
            if (paginationRequest.PageSize <= 0) paginationRequest.PageSize = 10;

            var result = await _prescriptionService.GetTemplatesAsync(diseaseId, paginationRequest);
            if (result.IsFailure)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }

        [HttpDelete("templates/{id}")]
        [Authorize(Roles = "owner,admin,doctor")]
        public async Task<IActionResult> DeleteTemplate(int id)
        {
            var result = await _prescriptionService.DeleteTemplateAsync(id);
            if (result.IsFailure)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }

        [HttpGet("{id}/pdf")]
        public async Task<IActionResult> GetPrescriptionPdf(int id)
        {
            var userId = User.GetUserId();
            if (!userId.HasValue)
            {
                return Unauthorized(Result.Failure("User id is required."));
            }

            var result = await _prescriptionService.GetPrescriptionDetailsAsync(id, userId.Value, User.IsStaff());
            if (result.IsFailure || result.Data == null)
            {
                return BadRequest(result);
            }

            var bytes = _pdfDocumentService.CreatePrescriptionPdf(result.Data);
            return File(bytes, "application/pdf", $"prescription-{id}.pdf");
        }
    }
}

using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SCMS.Domain.Features.Documents;

using SCMS.Domain.Security;
using SCMS.Domain.DTOs.Patients;
using SCMS.Shared;

namespace SCMS.Domain.Features.Patients
{
    [ApiController]
    [Authorize]
    [Route("api/[controller]")]
    public class PatientsController : ControllerBase
    {
        private readonly PatientService _patientService;
        private readonly PdfDocumentService _pdfDocumentService;

        public PatientsController(PatientService patientService, PdfDocumentService pdfDocumentService)
        {
            _patientService = patientService;
            _pdfDocumentService = pdfDocumentService;
        }

        [HttpPost]
        public async Task<IActionResult> AddPatientProfile([FromBody] PatientProfileRequest request)
        {
            var userId = User.GetUserId();
            if (!userId.HasValue)
            {
                return Unauthorized(Result.Failure("User id is required."));
            }

            var result = await _patientService.AddPatientProfileAsync(request, userId.Value);
            if (result.IsFailure)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }

        [HttpGet]
        public async Task<IActionResult> GetPatientProfiles([FromQuery] PaginationRequest paginationRequest, [FromQuery] string? query = null)
        {
            paginationRequest ??= new PaginationRequest();
            if (paginationRequest.PageNumber <= 0) paginationRequest.PageNumber = 1;
            if (paginationRequest.PageSize <= 0) paginationRequest.PageSize = 10;

            var userId = User.GetUserId();
            if (!userId.HasValue)
            {
                return Unauthorized(Result.Failure("User id is required."));
            }

            var result = await _patientService.GetPatientProfilesAsync(userId.Value, paginationRequest, User.IsStaff(), query);
            if (result.IsFailure)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }

        [HttpGet("patients/{id}")]
        public async Task<IActionResult> GetPatientProfileById(int id)
        {
            var userId = User.GetUserId();
            if (!userId.HasValue)
            {
                return Unauthorized(Result.Failure("User id is required."));
            }

            var result = await _patientService.GetPatientProfileByIdAsync(id, userId.Value);
            if (result.IsFailure)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }

        [HttpGet("{id}/history")]
        public async Task<IActionResult> GetPatientHistory(int id)
        {
            var userId = User.GetUserId();
            if (!userId.HasValue)
            {
                return Unauthorized(Result.Failure("User id is required."));
            }

            var result = await _patientService.GetPatientHistoryAsync(id, userId.Value);
            if (result.IsFailure)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }

        [HttpGet("{id}/summary")]
        public async Task<IActionResult> GetMedicalSummary(int id)
        {
            var userId = User.GetUserId();
            if (!userId.HasValue)
            {
                return Unauthorized(Result.Failure("User id is required."));
            }

            var result = await _patientService.GetMedicalSummaryAsync(id, userId.Value);
            if (result.IsFailure)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }

        [HttpGet("{id}/summary/html")]
        public async Task<IActionResult> GetMedicalSummaryHtml(int id)
        {
            var userId = User.GetUserId();
            if (!userId.HasValue)
            {
                return Unauthorized(Result.Failure("User id is required."));
            }

            var html = await _patientService.GenerateMedicalSummaryHtmlAsync(id, userId.Value);
            return Content(html, "text/html");
        }

        [HttpGet("{id}/summary/pdf")]
        public async Task<IActionResult> GetMedicalSummaryPdf(int id)
        {
            var userId = User.GetUserId();
            if (!userId.HasValue)
            {
                return Unauthorized(Result.Failure("User id is required."));
            }

            var result = await _patientService.GetMedicalSummaryAsync(id, userId.Value);
            if (result.IsFailure || result.Data == null)
            {
                return BadRequest(result);
            }
            var bytes = _pdfDocumentService.CreateMedicalSummaryPdf(result.Data);
            return File(bytes, "application/pdf", $"medical-summary-{id}.pdf");
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletePatientProfile(int id)
        {
            var userId = User.GetUserId();
            if (!userId.HasValue)
            {
                return Unauthorized(Result.Failure("User id is required."));
            }

            var result = await _patientService.DeletePatientProfileAsync(id, userId.Value);
            if (result.IsFailure)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }


    }
}

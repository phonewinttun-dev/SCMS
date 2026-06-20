using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SCMS.Domain.Features.Documents;

using SCMS.Domain.Security;
using SCMS.Domain.DTOs;
using SCMS.Shared;

namespace SCMS.Domain.Features.Patients
{
    [ApiController]
    [Authorize]
    [Route("api/Patients")]
    public class PatientController : ControllerBase
    {
        private readonly IPatientService _patientService;
        private readonly PdfDocumentService _pdfDocumentService;

        public PatientController(IPatientService patientService, PdfDocumentService pdfDocumentService)
        {
            _patientService = patientService;
            _pdfDocumentService = pdfDocumentService;
        }

        [HttpPost]
        public async Task<IActionResult> AddPatientProfile([FromBody] PatientProfileRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(Result.Failure("Invalid request data"));
            }
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
        public async Task<IActionResult> GetPatientProfiles([FromQuery] PatientProfilesRequest request)
        {

            request ??= new PatientProfilesRequest();
            if (!ModelState.IsValid)
            {
                return BadRequest(Result.Failure("Invalid request data"));
            }
            if (request.PageNumber <= 0) request.PageNumber = 1;
            if (request.PageSize <= 0) request.PageSize = 10;

            var userId = User.GetUserId();
            if (!userId.HasValue)
            {
                return Unauthorized(Result.Failure("User id is required."));
            }

            var result = await _patientService.GetPatientProfilesAsync(userId.Value, request, User.IsStaff(), request.Search);
            if (result.IsFailure)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }

        [HttpGet("patients/{id}")]
        public async Task<IActionResult> GetPatientProfileById(int id)
        {
            if (!ModelState.IsValid || id <= 0) {
                return BadRequest(Result.Failure("Invalid request data"));
            }
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
            if (!ModelState.IsValid || id <= 0)
            {
                return BadRequest(Result.Failure("Invalid request data"));
            }
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
            if (!ModelState.IsValid || id <= 0)
            {
                return BadRequest(Result.Failure("Invalid request data"));
            }
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
            if (!ModelState.IsValid || id <= 0)
            {
                return BadRequest(Result.Failure("Invalid request data"));
            }
      
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
            if (!ModelState.IsValid || id <= 0)
            {
                return BadRequest(Result.Failure("Invalid request data"));
            }
         
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
            if (!ModelState.IsValid || id <= 0)
            {
                return BadRequest(Result.Failure("Invalid request data"));
            }
       
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

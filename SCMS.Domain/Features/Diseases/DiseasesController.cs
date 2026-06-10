using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SCMS.Shared;
using SCMS.Domain.DTOs.Diseases;

namespace SCMS.Domain.Features.Diseases
{
    [ApiController]
    [Authorize]
    [Route("api/[controller]")]
    public class DiseasesController : ControllerBase
    {
        private readonly DiseaseService _diseaseService;

        public DiseasesController(DiseaseService diseaseService)
        {
            _diseaseService = diseaseService;
        }

        [HttpGet]
        public async Task<IActionResult> GetDiseases([FromQuery] string? query, [FromQuery] PaginationRequest paginationRequest)
        {
            paginationRequest ??= new PaginationRequest();
            if (paginationRequest.PageNumber <= 0) paginationRequest.PageNumber = 1;
            if (paginationRequest.PageSize <= 0) paginationRequest.PageSize = 10;

            var result = await _diseaseService.GetDiseasesAsync(query, paginationRequest);
            return result.IsSuccess ? Ok(result) : BadRequest(result);
        }

        [HttpPost]
        public async Task<IActionResult> CreateDisease([FromBody] CreateDiseaseRequest request)
        {
            var result = await _diseaseService.CreateDiseaseAsync(request);
            return result.IsSuccess ? Ok(result) : BadRequest(result);
        }

        [HttpPut]
        public async Task<IActionResult> UpdateDisease([FromBody] UpdateDiseaseRequest request)
        {
            var result = await _diseaseService.UpdateDiseaseAsync(request);
            return result.IsSuccess ? Ok(result) : BadRequest(result);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeactivateDisease(int id)
        {
            var result = await _diseaseService.DeactivateDiseaseAsync(id);
            return result.IsSuccess ? Ok(result) : BadRequest(result);
        }
    }
}

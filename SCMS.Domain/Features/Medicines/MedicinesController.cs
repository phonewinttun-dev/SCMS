using System.Threading.Tasks;
using System.Collections.Generic;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using SCMS.Shared;
using SCMS.Domain.DTOs.Medicines;

namespace SCMS.Domain.Features.Medicines
{
    [ApiController]
    [Authorize(Roles = "owner,admin,doctor")]
    [Route("api/[controller]")]
    public class MedicinesController : ControllerBase
    {
        private readonly MedicineService _medicineService;

        public MedicinesController(MedicineService medicineService)
        {
            _medicineService = medicineService;
        }

        [HttpGet]
        public async Task<IActionResult> SearchMedicines([FromQuery] string? query, [FromQuery] PaginationRequest paginationRequest)
        {
            //paginationRequest ??= new PaginationRequest();
            if (paginationRequest.PageNumber <= 0) paginationRequest.PageNumber = 1;
            if (paginationRequest.PageSize <= 0) paginationRequest.PageSize = 10;

            var result = await _medicineService.SearchMedicinesAsync(query, paginationRequest);
            if (result.IsFailure)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }

        [HttpPost("quarantine-expired")]
        [Authorize(Roles = "owner,admin,doctor")]
        public async Task<IActionResult> QuarantineExpiredBatches()
        {
            var result = await _medicineService.QuarantineExpiredBatchesAsync();
            if (result.IsFailure)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }

        [HttpGet("alerts")]
        public async Task<IActionResult> GetInventoryAlerts([FromQuery] PaginationRequest paginationRequest)
        {
            paginationRequest ??= new PaginationRequest();
            if (paginationRequest.PageNumber <= 0) paginationRequest.PageNumber = 1;
            if (paginationRequest.PageSize <= 0) paginationRequest.PageSize = 10;

            var result = await _medicineService.GetInventoryAlertsAsync(paginationRequest);
            if (result.IsFailure)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }

        // ────────────────────────────────────────────────────────────────
        // Medicine Batch CRUD endpoints
        // ────────────────────────────────────────────────────────────────

        [HttpGet("batches")]
        public async Task<IActionResult> GetBatches(
            [FromQuery] string? query,
            [FromQuery] string? status,
            [FromQuery] int? medicineId,
            [FromQuery] string? sortBy,
            [FromQuery] bool sortDescending = false,
            [FromQuery] PaginationRequest? paginationRequest = null)
        {
            paginationRequest ??= new PaginationRequest();
            if (paginationRequest.PageNumber <= 0) paginationRequest.PageNumber = 1;
            if (paginationRequest.PageSize <= 0) paginationRequest.PageSize = 10;

            var result = await _medicineService.GetBatchesAsync(query, status, medicineId, sortBy, sortDescending, paginationRequest);
            if (result.IsFailure)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }

        [HttpGet("batches/{id}")]
        public async Task<IActionResult> GetBatch(int id)
        {
            var result = await _medicineService.GetBatchByIdAsync(id);
            if (result.IsFailure)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }

        [HttpPost("batches")]
        [Authorize(Roles = "owner,admin,doctor")]
        public async Task<IActionResult> CreateBatch([FromBody] CreateBatchRequest request)
        {
            var result = await _medicineService.CreateBatchAsync(request);
            if (result.IsFailure)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }

        [HttpPut("batches/{id}")]
        [Authorize(Roles = "owner,admin,doctor")]
        public async Task<IActionResult> UpdateBatch(int id, [FromBody] UpdateBatchRequest request)
        {
            var result = await _medicineService.UpdateBatchAsync(id, request);
            if (result.IsFailure)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }

        [HttpDelete("batches/{id}")]
        [Authorize(Roles = "owner,admin,doctor")]
        public async Task<IActionResult> DeleteBatch(int id, [FromQuery] bool force = false)
        {
            var result = await _medicineService.DeleteBatchAsync(id, force);
            if (result.IsFailure)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }

        [HttpGet("categories")]
        public async Task<IActionResult> GetCategories()
        {
            var result = await _medicineService.GetCategoriesAsync();
            if (result.IsFailure)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }

        [HttpPost]
        [Authorize(Roles = "owner,admin,doctor")]
        public async Task<IActionResult> CreateMedicine([FromForm] CreateMedicineRequest request, IFormFile? image)
        {
            var result = await _medicineService.CreateMedicineAsync(request, image);
            if (result.IsFailure)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "owner,admin,doctor")]
        public async Task<IActionResult> UpdateMedicine(int id, [FromForm] UpdateMedicineRequest request, IFormFile? image)
        {
            var result = await _medicineService.UpdateMedicineAsync(id, request, image);
            if (result.IsFailure)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "owner,admin,doctor")]
        public async Task<IActionResult> DeleteMedicine(int id)
        {
            var result = await _medicineService.DeleteMedicineAsync(id);
            if (result.IsFailure)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }
    }
}


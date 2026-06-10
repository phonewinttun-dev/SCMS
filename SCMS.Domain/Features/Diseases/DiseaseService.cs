using Microsoft.EntityFrameworkCore;
using SCMS.Database.Models;
using SCMS.Shared;
using SCMS.Domain.DTOs.Diseases;

namespace SCMS.Domain.Features.Diseases
{
    public class DiseaseService
    {
        private readonly AppDbContext _context;

        public DiseaseService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<PagedResult<DiseaseResponse>> GetDiseasesAsync(string? query, PaginationRequest paginationRequest)
        {
            var diseasesQuery = _context.TblDiseases.Where(d => d.DeleteFlag != true);
            if (!string.IsNullOrWhiteSpace(query))
            {
                var q = query.Trim().ToLowerInvariant();
                diseasesQuery = diseasesQuery.Where(d => d.Name.ToLower().Contains(q)
                    || (d.Description != null && d.Description.ToLower().Contains(q)));
            }

            var totalCount = await diseasesQuery.CountAsync();
            var list = await diseasesQuery
                .OrderBy(d => d.Name)
                .Skip((paginationRequest.PageNumber - 1) * paginationRequest.PageSize)
                .Take(paginationRequest.PageSize)
                .Select(d => new DiseaseResponse
                {
                    Id = d.Id,
                    Name = d.Name,
                    Description = d.Description
                })
                .ToListAsync();

            return PagedResult<DiseaseResponse>.Success(list, new Pagination(paginationRequest.PageNumber, paginationRequest.PageSize, totalCount));
        }

        public async Task<Result<DiseaseResponse>> CreateDiseaseAsync(CreateDiseaseRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return Result<DiseaseResponse>.Failure("Disease name is required.");
            }

            // Check if disease with same name already exists (case-insensitive)
            var diseaseExists = await _context.TblDiseases
                .AnyAsync(d => d.Name.ToLower() == request.Name.Trim().ToLower() && d.DeleteFlag != true);
            if (diseaseExists)
            {
                return Result<DiseaseResponse>.Failure("A disease with this name already exists.");
            }

            var disease = new TblDisease
            {
                Name = request.Name.Trim(),
                Description = request.Description?.Trim(),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                DeleteFlag = false
            };

            _context.TblDiseases.Add(disease);
            await _context.SaveChangesAsync();

            return Result<DiseaseResponse>.Success(new DiseaseResponse
            {
                Id = disease.Id,
                Name = disease.Name,
                Description = disease.Description
            }, "Disease created successfully.");
        }

        public async Task<Result<DiseaseResponse>> UpdateDiseaseAsync(UpdateDiseaseRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return Result<DiseaseResponse>.Failure("Disease name is required.");
            }

            var disease = await _context.TblDiseases
                .FirstOrDefaultAsync(d => d.Id == request.Id && d.DeleteFlag != true);
            if (disease == null)
            {
                return Result<DiseaseResponse>.Failure("Disease not found.");
            }

            // Check if another disease with same name already exists (case-insensitive)
            var duplicateExists = await _context.TblDiseases
                .AnyAsync(d => d.Id != request.Id && d.Name.ToLower() == request.Name.Trim().ToLower() && d.DeleteFlag != true);
            if (duplicateExists)
            {
                return Result<DiseaseResponse>.Failure("Another disease with this name already exists.");
            }

            disease.Name = request.Name.Trim();
            disease.Description = request.Description?.Trim();
            disease.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Result<DiseaseResponse>.Success(new DiseaseResponse
            {
                Id = disease.Id,
                Name = disease.Name,
                Description = disease.Description
            }, "Disease updated successfully.");
        }

        public async Task<Result<bool>> DeactivateDiseaseAsync(int id)
        {
            var disease = await _context.TblDiseases
                .FirstOrDefaultAsync(d => d.Id == id && d.DeleteFlag != true);
            if (disease == null)
            {
                return Result<bool>.Failure("Disease not found.");
            }

            // Check if disease is referenced in any active prescriptions
            var isReferenced = await _context.TblPrescriptions
                .AnyAsync(p => p.DiseaseId == id && p.DeleteFlag != true);
            if (isReferenced)
            {
                return Result<bool>.Failure("Cannot deactivate disease as it is referenced in active prescriptions.");
            }

            disease.DeleteFlag = true;
            disease.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Result<bool>.Success(true, "Disease deactivated successfully.");
        }
    }
}

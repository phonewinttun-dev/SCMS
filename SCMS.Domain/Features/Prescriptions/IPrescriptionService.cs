using System.Collections.Generic;
using System.Threading.Tasks;
using SCMS.Domain.DTOs.Prescriptions;
using SCMS.Shared;

namespace SCMS.Domain.Features.Prescriptions
{
    public interface IPrescriptionService
    {
        Task<Result<PrescriptionResponse>> CreatePrescriptionAsync(CreatePrescriptionRequest request);
        Task<Result<PrescriptionResponse>> GetPrescriptionDetailsAsync(int id, int? currentUserId = null, bool isStaff = true);
        Task<PagedResult<PrescriptionResponse>> GetPrescriptionsAsync(int? patientId, PaginationRequest paginationRequest, int? currentUserId = null, bool isStaff = true);
        Task<Result<PrescriptionTemplateResponse>> SaveTemplateAsync(SaveTemplateRequest request);
        Task<Result<bool>> DeleteTemplateAsync(int id);
        Task<PagedResult<PrescriptionTemplateResponse>> GetTemplatesAsync(int? diseaseId, PaginationRequest paginationRequest);
        Task<Result<List<PrescriptionResponse>>> GetAllPrescriptionsForPatientAsync(int patientId);
    }
}

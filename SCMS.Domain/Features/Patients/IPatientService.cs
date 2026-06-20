using System.Threading.Tasks;
using SCMS.Shared;
using SCMS.Domain.DTOs;

namespace SCMS.Domain.Features.Patients
{
    public interface IPatientService
    {
        Task<Result<PatientProfileResponse>> AddPatientProfileAsync(PatientProfileRequest request, int userId, bool isStaff = false);
        Task<PagedResult<PatientProfileResponse>> GetPatientProfilesAsync(int userId, PaginationRequest paginationRequest, bool isStaff = false, string? search = null);
        Task<Result> DeletePatientProfileAsync(int id, int userId);
        Task<Result<PatientProfileResponse>> GetPatientProfileByIdAsync(int id, int userId);
        Task<Result<PatientHistoryResponse>> GetPatientHistoryAsync(int patientId, int userId);
        Task<Result<MedicalSummaryResponse>> GetMedicalSummaryAsync(int patientId, int userId);
        Task<string> GenerateMedicalSummaryHtmlAsync(int patientId, int userId);
    }
}

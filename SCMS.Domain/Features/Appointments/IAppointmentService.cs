using System;
using System.Threading.Tasks;
using SCMS.Domain.DTOs.Appointments;
using SCMS.Shared;

namespace SCMS.Domain.Features.Appointments
{
    public interface IAppointmentService
    {
        Task<Result<BookAppointmentResponse>> BookAppointmentAsync(BookAppointmentRequest request, int userId);
        Task<Result<AppointmentDetailsResponse>> UpdateAppointmentStatusAsync(int id, UpdateAppointmentStatusRequest request);
        Task<Result<AppointmentDetailsResponse>> RescheduleAppointmentAsync(int id, RescheduleAppointmentRequest request);
        Task<PagedResult<AppointmentDetailsResponse>> GetAppointmentsAsync(
            AppointmentDetailsRequest request,
            PaginationRequest paginationRequest,
            int? currentUserId = null,
            bool isStaff = true);
        Task<Result<AppointmentQueueStatusResponse>> GetPatientQueueStatusAsync(int id);
        Task<Result<List<AppointmentDetailsResponse>>> GetAllAppointmentsForPatientAsync(int patientId);
        //Task<Result<AppointmentDetailsResponse>> CallNextPatientAsync();
    }
}

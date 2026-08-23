using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using SCMS.Shared;
using SCMS.Domain.Features.Payments.Models;

namespace SCMS.Domain.Features.Payments
{
    public interface IPaymentService
    {
        Task<Result<ProcessPaymentCallbackResponse>> ProcessGatewayCallbackAsync(ProcessPaymentCallbackRequest request);
        Task<Result<ManualPaymentProofResponse>> SubmitManualPaymentProofAsync(ManualPaymentProofRequest request, IFormFile? screenshotFile = null);
        Task<Result<ApprovePaymentResponse>> ApprovePaymentAsync(int paymentId);
        Task<PagedResult<GetPaymentsResponse>> GetPaymentsAsync(GetPaymentsRequest request);
        Task<PagedResult<SearchPaymentsResponse>> SearchPaymentsAsync(SearchPaymentsRequest request);
        Task<Result<GetPaymentByIdResponse>> GetPaymentByIdAsync(int id);
    }
}

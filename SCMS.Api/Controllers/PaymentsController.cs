using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using SCMS.Domain.Features.Documents;
using SCMS.Domain.Features.Payments;
using SCMS.Domain.Features.Payments.Models;
using SCMS.Domain.Security;
using SCMS.Shared;

namespace SCMS.Api.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/[controller]")]
    [Produces("application/json")]
    public class PaymentsController : ControllerBase
    {
        private readonly IPaymentService _paymentService;
        private readonly IPdfDocumentService _pdfDocumentService;

        public PaymentsController(IPaymentService paymentService, IPdfDocumentService pdfDocumentService)
        {
            _paymentService = paymentService;
            _pdfDocumentService = pdfDocumentService;
        }

        /// <summary>Process automated payment gateway callback / webhook.</summary>
        [HttpPost("gateway-callback")]
        [HasPermission("Payments.Update")]
        [ProducesResponseType(typeof(Result<ProcessPaymentCallbackResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(Result), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> ProcessGatewayCallback([FromBody] ProcessPaymentCallbackRequest request)
        {
            var result = await _paymentService.ProcessGatewayCallbackAsync(request);
            return result.IsFailure ? BadRequest(result) : Ok(result);
        }

        /// <summary>Submit screenshot proof and last 6 digits of transaction ID for manual bank transfer or mobile wallet payment.</summary>
        [HttpPost("manual-proof")]
        [Consumes("multipart/form-data")]
        [HasPermission("Payments.Create")]
        [ProducesResponseType(typeof(Result<ManualPaymentProofResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(Result), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> SubmitManualPaymentProof([FromForm] ManualPaymentProofRequest request, IFormFile? screenshot)
        {
            var result = await _paymentService.SubmitManualPaymentProofAsync(request, screenshot);
            return result.IsFailure ? BadRequest(result) : Ok(result);
        }

        /// <summary>Get payment transaction details by ID.</summary>
        [HttpGet("{id:int}")]
        [HasPermission("Payments.View")]
        [ProducesResponseType(typeof(Result<GetPaymentByIdResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(Result), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> GetPaymentById(int id)
        {
            var result = await _paymentService.GetPaymentByIdAsync(id);
            return result.IsFailure ? BadRequest(result) : Ok(result);
        }

        /// <summary>Approve pending payment transaction.</summary>
        [HttpPost("{id:int}/approve")]
        [HasPermission("Payments.Update")]
        [ProducesResponseType(typeof(Result<ApprovePaymentResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(Result), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> ApprovePayment(int id)
        {
            var result = await _paymentService.ApprovePaymentAsync(id);
            return result.IsFailure ? BadRequest(result) : Ok(result);
        }

        /// <summary>Query billing and payment transactions with status, date, and pagination.</summary>
        [HttpGet]
        [HasPermission("Payments.View")]
        [ProducesResponseType(typeof(PagedResult<GetPaymentsResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(Result), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> GetPayments([FromQuery] GetPaymentsRequest request)
        {
            request ??= new GetPaymentsRequest();
            if (request.PageNumber <= 0) request.PageNumber = 1;
            if (request.PageSize <= 0) request.PageSize = 10;

            var result = await _paymentService.GetPaymentsAsync(request);
            return result.IsFailure ? BadRequest(result) : Ok(result);
        }

        /// <summary>Search billing and payment transactions with keyword query, status, date, and pagination.</summary>
        [HttpGet("search")]
        [HasPermission("Payments.View")]
        [ProducesResponseType(typeof(PagedResult<SearchPaymentsResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(Result), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> SearchPayments([FromQuery] SearchPaymentsRequest request)
        {
            request ??= new SearchPaymentsRequest();
            if (request.PageNumber <= 0) request.PageNumber = 1;
            if (request.PageSize <= 0) request.PageSize = 10;

            var result = await _paymentService.SearchPaymentsAsync(request);
            return result.IsFailure ? BadRequest(result) : Ok(result);
        }

        /// <summary>Generate and download printable PDF invoice.</summary>
        [HttpGet("{id:int}/invoice/pdf")]
        [HasPermission("Payments.ExportPdf")]
        [Produces("application/pdf")]
        public async Task<IActionResult> GetInvoicePdf(int id)
        {
            var result = await _paymentService.GetPaymentByIdAsync(id);
            if (result.IsFailure || result.Data == null)
            {
                return BadRequest(result);
            }

            var legacyDetails = new PaymentDetailsResponse
            {
                Id = result.Data.Id,
                AppointmentId = result.Data.AppointmentId,
                AppointmentCode = result.Data.AppointmentCode,
                PatientName = result.Data.PatientName,
                Amount = result.Data.Amount,
                Tax = result.Data.Tax,
                Charges = result.Data.Charges,
                PaymentMethod = result.Data.PaymentMethod,
                PaymentStatus = result.Data.PaymentStatus,
                PaymentScreenshot = result.Data.PaymentScreenshot,
                TransactionRef = result.Data.TransactionRef,
                PaidAt = result.Data.PaidAt
            };

            var bytes = _pdfDocumentService.CreateInvoicePdf(legacyDetails);
            return File(bytes, "application/pdf", $"invoice-{id}.pdf");
        }
    }
}

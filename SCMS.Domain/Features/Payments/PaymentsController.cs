using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SCMS.Domain.Features.Documents;
using SCMS.Domain.DTOs.Payments;
using SCMS.Domain.Security;
using SCMS.Shared;

namespace SCMS.Domain.Features.Payments
{
    [ApiController]
    [Authorize]
    [Route("api/[controller]")]
    public class PaymentsController : ControllerBase
    {
        private readonly PaymentService _paymentService;
        private readonly PdfDocumentService _pdfDocumentService;

        public PaymentsController(PaymentService paymentService, PdfDocumentService pdfDocumentService)
        {
            _paymentService = paymentService;
            _pdfDocumentService = pdfDocumentService;
        }

        [HttpPost("gateway-callback")]
        [Authorize(Roles = "owner,admin,doctor")]
        public async Task<IActionResult> ProcessGatewayCallback([FromBody] ProcessPaymentCallbackRequest request)
        {
            var result = await _paymentService.ProcessGatewayCallbackAsync(request);
            if (result.IsFailure)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }

        [HttpPost("manual-proof")]
        public async Task<IActionResult> SubmitManualPaymentProof([FromBody] ManualPaymentProofRequest request)
        {
            var userId = User.GetUserId();
            if (!userId.HasValue)
            {
                return Unauthorized(Result.Failure("User id is required."));
            }

            var result = await _paymentService.SubmitManualPaymentProofAsync(request, userId.Value, User.IsStaff());
            if (result.IsFailure)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }

        [HttpPost("{id}/approve")]
        [Authorize(Roles = "owner,admin,doctor")]
        public async Task<IActionResult> ApprovePayment(int id)
        {
            var result = await _paymentService.ApprovePaymentAsync(id);
            if (result.IsFailure)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }

        [HttpGet]
        [Authorize(Roles = "owner,admin,doctor")]
        public async Task<IActionResult> GetPayments(
            [FromQuery] string? status, 
            [FromQuery] PaginationRequest paginationRequest,
            [FromQuery] string? dateFilter = null,
            [FromQuery] string? query = null)
        {
            paginationRequest ??= new PaginationRequest();
            if (paginationRequest.PageNumber <= 0) paginationRequest.PageNumber = 1;
            if (paginationRequest.PageSize <= 0) paginationRequest.PageSize = 10;

            var result = await _paymentService.GetPaymentsAsync(status, paginationRequest, dateFilter, query);
            if (result.IsFailure)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }

        [HttpGet("{id}/invoice/pdf")]
        public async Task<IActionResult> GetInvoicePdf(int id)
        {
            var userId = User.GetUserId();
            if (!userId.HasValue)
            {
                return Unauthorized(Result.Failure("User id is required."));
            }

            var result = await _paymentService.GetPaymentByIdAsync(id, userId.Value, User.IsStaff());
            if (result.IsFailure || result.Data == null)
            {
                return BadRequest(result);
            }

            var bytes = _pdfDocumentService.CreateInvoicePdf(result.Data);
            return File(bytes, "application/pdf", $"invoice-{id}.pdf");
        }
    }
}

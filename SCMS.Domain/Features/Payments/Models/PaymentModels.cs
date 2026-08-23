using System;
using System.ComponentModel.DataAnnotations;
using SCMS.Shared;

namespace SCMS.Domain.Features.Payments.Models
{
    /// <summary>Request parameters for listing payments with pagination, status and date filtering.</summary>
    public class GetPaymentsRequest : PaginationRequest
    {
        public string? Status { get; set; }
        public string? DateFilter { get; set; }
    }

    /// <summary>Response item for listing payments.</summary>
    public sealed record GetPaymentsResponse
    {
        public int Id { get; init; }
        public int AppointmentId { get; init; }
        public string AppointmentCode { get; init; } = null!;
        public string PatientName { get; init; } = null!;
        public decimal Amount { get; init; }
        public decimal Tax { get; init; }
        public decimal Charges { get; init; }
        public string PaymentMethod { get; init; } = null!;
        public string PaymentStatus { get; init; } = null!;
        public string? PaymentScreenshot { get; init; }
        public string? TransactionRef { get; init; }
        public DateTime? PaidAt { get; init; }
    }

    /// <summary>Request parameters for searching payments by keyword with pagination.</summary>
    public class SearchPaymentsRequest : PaginationRequest
    {
        [Required(ErrorMessage = "Search query is required.")]
        public string Query { get; set; } = string.Empty;
        public string? Status { get; set; }
        public string? DateFilter { get; set; }
    }

    /// <summary>Response item for payment search results.</summary>
    public sealed record SearchPaymentsResponse
    {
        public int Id { get; init; }
        public int AppointmentId { get; init; }
        public string AppointmentCode { get; init; } = null!;
        public string PatientName { get; init; } = null!;
        public decimal Amount { get; init; }
        public decimal Tax { get; init; }
        public decimal Charges { get; init; }
        public string PaymentMethod { get; init; } = null!;
        public string PaymentStatus { get; init; } = null!;
        public string? PaymentScreenshot { get; init; }
        public string? TransactionRef { get; init; }
        public DateTime? PaidAt { get; init; }
    }

    /// <summary>Response item for payment by ID query.</summary>
    public sealed record GetPaymentByIdResponse
    {
        public int Id { get; init; }
        public int AppointmentId { get; init; }
        public string AppointmentCode { get; init; } = null!;
        public string PatientName { get; init; } = null!;
        public decimal Amount { get; init; }
        public decimal Tax { get; init; }
        public decimal Charges { get; init; }
        public string PaymentMethod { get; init; } = null!;
        public string PaymentStatus { get; init; } = null!;
        public string? PaymentScreenshot { get; init; }
        public string? TransactionRef { get; init; }
        public DateTime? PaidAt { get; init; }
    }

    /// <summary>Payload for processing payment gateway webhook callback.</summary>
    public sealed record ProcessPaymentCallbackRequest
    {
        [Required]
        public required int AppointmentId { get; init; }

        [Required]
        public required string PaymentMethod { get; init; } // card / kbzpay / wavepay

        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Payment amount must be greater than zero.")]
        public required decimal Amount { get; init; }

        public string? GatewayTransactionId { get; init; }
        public bool IsSuccess { get; init; }
    }

    /// <summary>Response returned upon processing a gateway callback.</summary>
    public sealed record ProcessPaymentCallbackResponse
    {
        public int Id { get; init; }
        public int AppointmentId { get; init; }
        public string AppointmentCode { get; init; } = null!;
        public string PatientName { get; init; } = null!;
        public decimal Amount { get; init; }
        public decimal Tax { get; init; }
        public decimal Charges { get; init; }
        public string PaymentMethod { get; init; } = null!;
        public string PaymentStatus { get; init; } = null!;
        public string? PaymentScreenshot { get; init; }
        public string? TransactionRef { get; init; }
        public DateTime? PaidAt { get; init; }
    }

    /// <summary>Payload for submitting manual payment proof screenshot and transaction number.</summary>
    public class ManualPaymentProofRequest
    {
        [Required]
        public int AppointmentId { get; set; }

        [Required]
        public string PaymentMethod { get; set; } = null!; // kbzpay / wavepay / cbpay / ayapay

        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Payment amount must be greater than zero.")]
        public decimal Amount { get; set; }

        [Required(ErrorMessage = "Transaction ID last 6 digits are required.")]
        [RegularExpression(@"^\d{6}$", ErrorMessage = "Transaction ID must be exactly the last 6 digits of the payment receipt.")]
        public string TransactionLast6 { get; set; } = null!;

        public string? ScreenshotUrl { get; set; }
    }

    /// <summary>Response returned upon submitting manual payment proof.</summary>
    public sealed record ManualPaymentProofResponse
    {
        public int Id { get; init; }
        public int AppointmentId { get; init; }
        public string AppointmentCode { get; init; } = null!;
        public string PatientName { get; init; } = null!;
        public decimal Amount { get; init; }
        public decimal Tax { get; init; }
        public decimal Charges { get; init; }
        public string PaymentMethod { get; init; } = null!;
        public string PaymentStatus { get; init; } = null!;
        public string? PaymentScreenshot { get; init; }
        public string? TransactionRef { get; init; }
        public DateTime? PaidAt { get; init; }
    }

    /// <summary>Response returned upon approving a payment.</summary>
    public sealed record ApprovePaymentResponse
    {
        public int Id { get; init; }
        public int AppointmentId { get; init; }
        public string AppointmentCode { get; init; } = null!;
        public string PatientName { get; init; } = null!;
        public decimal Amount { get; init; }
        public decimal Tax { get; init; }
        public decimal Charges { get; init; }
        public string PaymentMethod { get; init; } = null!;
        public string PaymentStatus { get; init; } = null!;
        public string? PaymentScreenshot { get; init; }
        public string? TransactionRef { get; init; }
        public DateTime? PaidAt { get; init; }
    }

    // Backward-compatibility record
    public sealed record PaymentDetailsResponse
    {
        public int Id { get; init; }
        public int AppointmentId { get; init; }
        public string AppointmentCode { get; init; } = null!;
        public string PatientName { get; init; } = null!;
        public decimal Amount { get; init; }
        public decimal Tax { get; init; }
        public decimal Charges { get; init; }
        public string PaymentMethod { get; init; } = null!;
        public string PaymentStatus { get; init; } = null!;
        public string? PaymentScreenshot { get; init; }
        public string? TransactionRef { get; init; }
        public DateTime? PaidAt { get; init; }
    }
}

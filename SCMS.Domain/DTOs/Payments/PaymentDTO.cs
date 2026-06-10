using System;

namespace SCMS.Domain.DTOs.Payments
{
    public class ManualPaymentProofRequest
        {
            public int AppointmentId { get; set; }
            public string PaymentMethod { get; set; } = null!; // kbzpay / wavepay
            public decimal Amount { get; set; }
            public string ScreenshotUrl { get; set; } = null!;
        }

    public class PaymentDetailsResponse
        {
            public int Id { get; set; }
            public int AppointmentId { get; set; }
            public string AppointmentCode { get; set; } = null!;
            public string PatientName { get; set; } = null!;
            public decimal Amount { get; set; }
            public decimal Tax { get; set; }
            public decimal Charges { get; set; }
            public string PaymentMethod { get; set; } = null!;
            public string PaymentStatus { get; set; } = null!;
            public string? PaymentScreenshot { get; set; }
            public DateTime? PaidAt { get; set; }
        }

    public class ProcessPaymentCallbackRequest
        {
            public int AppointmentId { get; set; }
            public string PaymentMethod { get; set; } = null!; // card / kbzpay / wavepay
            public decimal Amount { get; set; }
            public string? GatewayTransactionId { get; set; }
            public bool IsSuccess { get; set; }
        }
}

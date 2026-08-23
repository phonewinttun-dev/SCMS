using System;
using System.Collections.Generic;

namespace SCMS.Database.Models;

public partial class TblPayment
{
    public int Id { get; set; }

    public int AppointmentId { get; set; }

    public int? PrescriptionId { get; set; }

    public decimal Amount { get; set; }

    public decimal Tax { get; set; }

    public decimal Charges { get; set; }

    /// <summary>
    /// cash / online
    /// </summary>
    public string PaymentMethod { get; set; } = null!;

    /// <summary>
    /// pending / paid / partial / failed / refunded
    /// </summary>
    public string PaymentStatus { get; set; } = null!;

    public string? PaymentScreenshot { get; set; }

    public string? TransactionRef { get; set; }

    public DateTime? PaidAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual TblAppointment Appointment { get; set; } = null!;

    public virtual TblPrescription? Prescription { get; set; }
}

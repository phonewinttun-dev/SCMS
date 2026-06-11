using System;

namespace SCMS.Domain.DTOs.Appointments
{
    public class AppointmentDetailsRequest
    {
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string? Status { get; set; }
        public int? PatientId { get; set; }
    }

    public class AppointmentDetailsResponse
        {
            public int Id { get; set; }
            public string AppointmentCode { get; set; } = null!;
            public int PatientId { get; set; }
            public string PatientName { get; set; } = null!;
            public DateTime Datetime { get; set; }
            public string Status { get; set; } = null!;
            public string? Notes { get; set; }
            public int TokenNumber { get; set; }
            public string ClinicDoctorName { get; set; } = "Clinic Doctor";
            public DateTime CreatedAt { get; set; }
        }

    public class AppointmentQueueStatusResponse
        {
            public int PatientTokenNumber { get; set; }
            public int CurrentActiveTokenNumber { get; set; }
            public int PatientsAhead { get; set; }
            public string QueueMessage { get; set; } = null!;
            public int EstimatedWaitTimeMinutes { get; set; }
            public string DoctorStatus { get; set; } = null!; // In Consultation / Available / Out of Office
            public double ProgressBarPercentage { get; set; }
            public bool IsYourTurn { get; set; }
        }

    public class BookAppointmentRequest
        {
            public int PatientId { get; set; }
            public DateTime Datetime { get; set; }
            public string? Notes { get; set; }
        }

    public class BookAppointmentResponse
        {
            public int AppointmentId { get; set; }
            public string AppointmentCode { get; set; } = null!;
            public int TokenNumber { get; set; }
            public int EstimatedWaitTimeMinutes { get; set; }
            public string Status { get; set; } = null!;
        }

    public class RescheduleAppointmentRequest
        {
            public DateTime NewDatetime { get; set; }
            public string? Notes { get; set; }
        }

    public class UpdateAppointmentStatusRequest
        {
            public string Status { get; set; } = null!; // pending / confirmed / cancelled / completed
            public string? Notes { get; set; }
        }
}

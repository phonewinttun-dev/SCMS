namespace SCMS.Domain.DTOs.FollowUps
{
    public class FollowUpRequest
        {
            public int PatientId { get; set; }
            public int? AppointmentId { get; set; }
            public int? PrescriptionId { get; set; }
            public DateTime DueAt { get; set; }
            public string Recommendation { get; set; } = null!;
        }

        public class FollowUpResponse
        {
            public int Id { get; set; }
            public int PatientId { get; set; }
            public string PatientName { get; set; } = null!;
            public int? AppointmentId { get; set; }
            public int? PrescriptionId { get; set; }
            public DateTime DueAt { get; set; }
            public string Recommendation { get; set; } = null!;
            public string Status { get; set; } = null!;
            public DateTime CreatedAt { get; set; }
            public DateTime? CompletedAt { get; set; }
        }
}

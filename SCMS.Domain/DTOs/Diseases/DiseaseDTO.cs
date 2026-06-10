namespace SCMS.Domain.DTOs.Diseases
{
    public class CreateDiseaseRequest
        {
            public string Name { get; set; } = null!;
            public string? Description { get; set; }
        }

    public class DiseaseResponse
        {
            public int Id { get; set; }
            public string Name { get; set; } = null!;
            public string? Description { get; set; }
        }

    public class UpdateDiseaseRequest
        {
            public int Id { get; set; }
            public string Name { get; set; } = null!;
            public string? Description { get; set; }
        }
}

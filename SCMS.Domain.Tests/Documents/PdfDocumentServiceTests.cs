using SCMS.Domain.Features.Documents;

using SCMS.Domain.DTOs.Payments;
using SCMS.Domain.DTOs.Prescriptions;

namespace SCMS.Domain.Tests.Documents;

public class PdfDocumentServiceTests
{
    [Fact]
    public void PdfMethods_ReturnNonEmptyPdfFiles()
    {
        var service = new PdfDocumentService();

        var summary = service.CreateMedicalSummaryPdf("Summary", "<h1>Patient Summary</h1><p>Stable.</p>");
        var prescription = service.CreatePrescriptionPdf(new PrescriptionResponse
        {
            Id = 12,
            AppointmentCode = "APT-12",
            PatientName = "Patient",
            Items =
            {
                new PrescriptionItemResponseDto
                {
                    MedicineName = "Paracetamol",
                    Dosage = "500mg",
                    Quantity = 6,
                    Days = 3,
                    Instruction = "After meal"
                }
            }
        });
        var invoice = service.CreateInvoicePdf(new PaymentDetailsResponse
        {
            Id = 7,
            AppointmentCode = "APT-7",
            PatientName = "Patient",
            Amount = 1000m,
            Tax = 50m,
            Charges = 0m,
            PaymentMethod = "manual",
            PaymentStatus = "paid"
        });
        AssertPdf(summary);
        AssertPdf(prescription);
        AssertPdf(invoice);
    }

    private static void AssertPdf(byte[] bytes)
    {
        Assert.True(bytes.Length > 100);
        Assert.Equal("%PDF", System.Text.Encoding.ASCII.GetString(bytes, 0, 4));
    }
}

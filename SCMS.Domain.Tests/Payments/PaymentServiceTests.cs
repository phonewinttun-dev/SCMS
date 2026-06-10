using Microsoft.EntityFrameworkCore;
using SCMS.Domain.Features.Payments;
using SCMS.Domain.DTOs.Payments;
using SCMS.Domain.Tests.TestSupport;
using SCMS.Shared;

namespace SCMS.Domain.Tests.Payments;

public class PaymentServiceTests
{
    [Fact]
    public async Task ProcessGatewayCallbackAsync_SuccessCreatesPaidPaymentAndConfirmsAppointment()
    {
        using var db = new TestDatabase();
        var user = TestData.AddUser(db);
        var patient = TestData.AddPatient(db, user);
        var appointment = TestData.AddAppointment(db, patient);
        var service = new PaymentService(db.Context);

        var result = await service.ProcessGatewayCallbackAsync(new ProcessPaymentCallbackRequest
        {
            AppointmentId = appointment.Id,
            PaymentMethod = "KBZPay",
            Amount = 20000m,
            IsSuccess = true,
            GatewayTransactionId = "GW-1"
        });

        Assert.True(result.IsSuccess);
        Assert.Equal("paid", result.Data!.PaymentStatus);
        Assert.Equal("confirmed", (await db.Context.TblAppointments.FindAsync(appointment.Id))!.Status);
        Assert.Equal("kbzpay", db.Context.TblPayments.Single().PaymentMethod);
        Assert.NotNull(db.Context.TblPayments.Single().PaidAt);
        Assert.Single(db.Context.TblNotifications);
    }

    [Fact]
    public async Task ProcessGatewayCallbackAsync_DoesNotDowngradeAlreadyPaidPayment()
    {
        using var db = new TestDatabase();
        var user = TestData.AddUser(db);
        var patient = TestData.AddPatient(db, user);
        var appointment = TestData.AddAppointment(db, patient, status: "confirmed");
        var payment = TestData.AddPayment(db, appointment, status: "paid", amount: 15000m, paidAt: DateTime.UtcNow);
        var service = new PaymentService(db.Context);

        var result = await service.ProcessGatewayCallbackAsync(new ProcessPaymentCallbackRequest
        {
            AppointmentId = appointment.Id,
            PaymentMethod = "card",
            Amount = 1m,
            IsSuccess = false
        });

        Assert.True(result.IsSuccess);
        var savedPayment = await db.Context.TblPayments.FindAsync(payment.Id);
        Assert.Equal("paid", savedPayment!.PaymentStatus);
        Assert.Equal(15000m, savedPayment.Amount);
    }

    [Fact]
    public async Task ManualProofAndApprovePaymentAsync_QueuesThenPaysAppointment()
    {
        using var db = new TestDatabase();
        var user = TestData.AddUser(db);
        var patient = TestData.AddPatient(db, user);
        var appointment = TestData.AddAppointment(db, patient);
        var service = new PaymentService(db.Context);

        var proofResult = await service.SubmitManualPaymentProofAsync(new ManualPaymentProofRequest
        {
            AppointmentId = appointment.Id,
            PaymentMethod = "wavepay",
            Amount = 12000m,
            ScreenshotUrl = "proof.png"
        });
        var paymentId = proofResult.Data!.Id;

        var approveResult = await service.ApprovePaymentAsync(paymentId);

        Assert.True(proofResult.IsSuccess);
        Assert.True(approveResult.IsSuccess);
        Assert.Equal("paid", approveResult.Data!.PaymentStatus);
        Assert.Equal("confirmed", (await db.Context.TblAppointments.FindAsync(appointment.Id))!.Status);
        Assert.Equal(2, db.Context.TblNotifications.Count());
    }

    [Fact]
    public async Task GetPaymentsAsync_RejectsInvalidStatusFilter()
    {
        using var db = new TestDatabase();
        var service = new PaymentService(db.Context);

        var result = await service.GetPaymentsAsync("complete", new PaginationRequest());

        Assert.True(result.IsFailure);
        Assert.Empty(result.Data);
    }
}

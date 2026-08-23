using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SCMS.Domain.Features.Payments;
using SCMS.Domain.Features.Payments.Models;
using SCMS.Domain.Tests.TestSupport;
using SCMS.Shared;
using Xunit;

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
            TransactionLast6 = "661073",
            ScreenshotUrl = "proof.png"
        });
        var paymentId = proofResult.Data!.Id;

        var approveResult = await service.ApprovePaymentAsync(paymentId);

        Assert.True(proofResult.IsSuccess);
        Assert.Equal("661073", proofResult.Data!.TransactionRef);
        Assert.True(approveResult.IsSuccess);
        Assert.Equal("paid", approveResult.Data!.PaymentStatus);
        Assert.Equal("confirmed", (await db.Context.TblAppointments.FindAsync(appointment.Id))!.Status);
        Assert.Equal(3, db.Context.TblNotifications.Count());
    }

    [Fact]
    public async Task SubmitManualPaymentProofAsync_SendsNotificationToAdminAndPatient()
    {
        using var db = new TestDatabase();
        var user = TestData.AddUser(db);
        var patient = TestData.AddPatient(db, user, name: "Ko Mg Mg");
        var appointment = TestData.AddAppointment(db, patient);
        var service = new PaymentService(db.Context);

        var result = await service.SubmitManualPaymentProofAsync(new ManualPaymentProofRequest
        {
            AppointmentId = appointment.Id,
            PaymentMethod = "kbzpay",
            Amount = 15000m,
            TransactionLast6 = "123456",
            ScreenshotUrl = "https://res.cloudinary.com/demo/image/upload/v1/proof.jpg"
        });

        Assert.True(result.IsSuccess);
        var notifications = await db.Context.TblNotifications.ToListAsync();
        Assert.Equal(2, notifications.Count);

        // 1. Patient Notification
        var patientNotif = notifications.Single(n => n.UserId == user.UserId);
        Assert.Equal("Payment Proof Submitted", patientNotif.Title);
        Assert.Equal("/user/billing", patientNotif.ActionRoute);

        // 2. Admin Broadcast Notification
        var adminNotif = notifications.Single(n => n.UserId == null);
        Assert.Equal("New Payment Proof Submitted", adminNotif.Title);
        Assert.Equal("/app/payments", adminNotif.ActionRoute);
        Assert.Contains("Ko Mg Mg", adminNotif.Description);
        Assert.Contains("15,000 MMK", adminNotif.Description);
        Assert.Contains("123456", adminNotif.Description);
    }

    [Theory]
    [InlineData("")]
    [InlineData("123")]
    [InlineData("12345")]
    [InlineData("1234567")]
    [InlineData("abcdef")]
    public async Task SubmitManualPaymentProofAsync_RejectsInvalidTransactionLast6(string invalidTxn)
    {
        using var db = new TestDatabase();
        var user = TestData.AddUser(db);
        var patient = TestData.AddPatient(db, user);
        var appointment = TestData.AddAppointment(db, patient);
        var service = new PaymentService(db.Context);

        var result = await service.SubmitManualPaymentProofAsync(new ManualPaymentProofRequest
        {
            AppointmentId = appointment.Id,
            PaymentMethod = "kbzpay",
            Amount = 7000m,
            TransactionLast6 = invalidTxn,
            ScreenshotUrl = "proof.png"
        });

        Assert.True(result.IsFailure);
        Assert.Contains("Transaction ID must be exactly the last 6 digits", result.Message);
    }

    [Fact]
    public async Task GetPaymentsAsync_RejectsInvalidStatusFilter()
    {
        using var db = new TestDatabase();
        var service = new PaymentService(db.Context);

        var result = await service.GetPaymentsAsync(new GetPaymentsRequest { Status = "complete" });

        Assert.True(result.IsFailure);
        Assert.Empty(result.Data);
    }

    [Fact]
    public async Task GetPaymentsAsync_ReturnsAscendingOrderedPayments()
    {
        using var db = new TestDatabase();
        var user = TestData.AddUser(db);
        var patient = TestData.AddPatient(db, user);
        var appt1 = TestData.AddAppointment(db, patient);
        var appt2 = TestData.AddAppointment(db, patient);
        var pay1 = TestData.AddPayment(db, appt1, amount: 10000m);
        var pay2 = TestData.AddPayment(db, appt2, amount: 20000m);
        var service = new PaymentService(db.Context);

        var result = await service.GetPaymentsAsync(new GetPaymentsRequest());

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Data.Count);
        Assert.True(result.Data[0].Id < result.Data[1].Id);
    }

    [Fact]
    public async Task SearchPaymentsAsync_FiltersByKeyword()
    {
        using var db = new TestDatabase();
        var user = TestData.AddUser(db);
        var patient1 = TestData.AddPatient(db, user, name: "Daw Mya");
        var patient2 = TestData.AddPatient(db, user, name: "U Ba");
        var appt1 = TestData.AddAppointment(db, patient1);
        var appt2 = TestData.AddAppointment(db, patient2);
        TestData.AddPayment(db, appt1, amount: 10000m);
        TestData.AddPayment(db, appt2, amount: 20000m);
        var service = new PaymentService(db.Context);

        var result = await service.SearchPaymentsAsync(new SearchPaymentsRequest { Query = "Daw Mya" });

        Assert.True(result.IsSuccess);
        var payment = Assert.Single(result.Data);
        Assert.Equal("Daw Mya", payment.PatientName);
    }
}

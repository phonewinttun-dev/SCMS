using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using SCMS.Database;
using SCMS.Database.Models;
using SCMS.Database.Seeding;
using Xunit;

namespace SCMS.Domain.Tests
{
    public class Seeding20260826Tests : IDisposable
    {
        private readonly SqliteConnection _connection;
        private readonly AppDbContext _context;

        public Seeding20260826Tests()
        {
            _connection = new SqliteConnection("Data Source=:memory:");
            _connection.Open();

            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseSqlite(_connection)
                .Options;

            _context = new AppDbContext(options);
            _context.Database.EnsureCreated();
        }

        public void Dispose()
        {
            _context.Dispose();
            _connection.Dispose();
        }

        [Fact]
        public async Task Seeding_ShouldPopulateAugust26DataCorrectly()
        {
            var config = new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Database:SeedDemoUsers"] = "true"
                })
                .Build();

            // Seed base data
            await DataSeeder.SeedAsync(_context, config, null);

            // 1. Check appointments on 2026-08-26
            var aug26Appts = await _context.TblAppointments
                .Where(a => a.Datetime.Year == 2026 && a.Datetime.Month == 8 && a.Datetime.Day == 26)
                .OrderBy(a => a.Datetime)
                .ToListAsync();

            Assert.Equal(10, aug26Appts.Count);
            Assert.Equal(6, aug26Appts.Count(a => a.Status == "completed"));
            Assert.Equal(2, aug26Appts.Count(a => a.Status == "confirmed"));
            Assert.Equal(1, aug26Appts.Count(a => a.Status == "pending"));
            Assert.Equal(1, aug26Appts.Count(a => a.Status == "cancelled"));

            var apptIds = aug26Appts.Select(a => a.Id).ToList();

            // 2. Check prescriptions on 2026-08-26
            var aug26Rx = await _context.TblPrescriptions
                .Include(p => p.TblPrescriptionItems)
                .ThenInclude(i => i.TblPrescriptionItemSchedules)
                .Where(p => apptIds.Contains(p.AppointmentId))
                .ToListAsync();

            Assert.Equal(6, aug26Rx.Count);
            Assert.All(aug26Rx, rx =>
            {
                Assert.NotNull(rx.WeightKg);
                Assert.NotNull(rx.BloodPressureSystolic);
                Assert.NotNull(rx.BloodPressureDiastolic);
                Assert.NotNull(rx.TemperatureC);
                Assert.NotNull(rx.PulseBpm);
                Assert.NotNull(rx.Spo2Percent);
                Assert.NotEmpty(rx.TblPrescriptionItems);
            });

            // 3. Check payments on 2026-08-26
            var aug26Payments = await _context.TblPayments
                .Where(p => apptIds.Contains(p.AppointmentId))
                .ToListAsync();

            Assert.Equal(9, aug26Payments.Count);
            var paidPayments = aug26Payments.Where(p => p.PaymentStatus == "paid").ToList();
            Assert.Equal(6, paidPayments.Count);
            Assert.Equal(225000m, paidPayments.Sum(p => p.Amount));

            var pendingPayments = aug26Payments.Where(p => p.PaymentStatus == "pending").ToList();
            Assert.Equal(3, pendingPayments.Count);
            Assert.Equal(85000m, pendingPayments.Sum(p => p.Amount));

            // Verify payment screenshots for electronic payments
            var electronicPayments = aug26Payments.Where(p => p.PaymentMethod != "cash").ToList();
            Assert.All(electronicPayments, ep =>
            {
                Assert.Equal("/demo-receipt.png", ep.PaymentScreenshot);
                Assert.Equal("01004252031742661073", ep.TransactionRef);
            });

            // 4. Check follow-ups
            var aug26FollowUps = await _context.TblFollowUps
                .Where(f => f.AppointmentId.HasValue && apptIds.Contains(f.AppointmentId.Value))
                .ToListAsync();

            Assert.Equal(4, aug26FollowUps.Count);
            Assert.All(aug26FollowUps, f => Assert.Equal("pending", f.Status));

            // 5. Check notifications
            var notifications = await _context.TblNotifications
                .Where(n => n.CreatedAt.HasValue && n.CreatedAt.Value.Year == 2026 && n.CreatedAt.Value.Month == 8 && n.CreatedAt.Value.Day == 26)
                .ToListAsync();

            Assert.NotEmpty(notifications);
            Assert.Contains(notifications, n => n.Title == "Queue Turn Ready");
            Assert.Contains(notifications, n => n.Title == "Payment Received");
        }
    }
}

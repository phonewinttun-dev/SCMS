using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using SCMS.Domain.Features.Auth;
using SCMS.Database.Models;
using SCMS.Domain.Features.Appointments;
using SCMS.Domain.Features.Dashboards;
using SCMS.Domain.Features.Diseases;
using SCMS.Domain.Features.Documents;
using SCMS.Domain.Features.FollowUps;

using SCMS.Domain.Features.Medicines;
using SCMS.Domain.Features.Notifications;
using SCMS.Domain.Features.Patients;
using SCMS.Domain.Features.Payments;
using SCMS.Domain.Features.Prescriptions;
using Microsoft.AspNetCore.Builder;
using CloudinaryDotNet;
using SCMS.Domain.Features.Photo;
using SCMS.Domain.Features.Mcp;

namespace SCMS.Domain
{
    public static class FeatureManager
    {
        public static void AddDomain(this WebApplicationBuilder builder)
        {
            var provider = builder.Configuration["Database:Provider"]?.Trim();
            if (string.IsNullOrWhiteSpace(provider))
            {
                provider = "Sqlite";
            }

            builder.Services.AddDbContext<AppDbContext>(options =>
            {
                if (provider.Equals("PostgreSql", StringComparison.OrdinalIgnoreCase)
                    || provider.Equals("Postgres", StringComparison.OrdinalIgnoreCase)
                    || provider.Equals("Npgsql", StringComparison.OrdinalIgnoreCase))
                {
                    var connectionString = builder.Configuration.GetConnectionString("PostgreSqlConnection");
                    options.UseNpgsql(connectionString);
                    return;
                }

                if (provider.Equals("Sqlite", StringComparison.OrdinalIgnoreCase)
                    || provider.Equals("SQLite", StringComparison.OrdinalIgnoreCase))
                {
                    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
                        ?? "Data Source=scms.local.db";
                    options.UseSqlite(connectionString);
                    return;
                }

                throw new InvalidOperationException($"Unsupported database provider '{provider}'. Use 'Sqlite' or 'PostgreSql'.");
            });

            // Cloudinary configuration
            var cloudName = new[] { "Cloudinary:CloudName", "CLOUDINARY_CLOUD_NAME", "cloud_name" }
                .Select(key => builder.Configuration[key])
                .FirstOrDefault(val => !string.IsNullOrWhiteSpace(val))?.Trim();

            var apiKey = new[] { "Cloudinary:ApiKey", "CLOUDINARY_API_KEY", "api_key" }
                .Select(key => builder.Configuration[key])
                .FirstOrDefault(val => !string.IsNullOrWhiteSpace(val))?.Trim();

            var apiSecret = new[] { "Cloudinary:ApiSecret", "CLOUDINARY_API_SECRET", "api_secret" }
                .Select(key => builder.Configuration[key])
                .FirstOrDefault(val => !string.IsNullOrWhiteSpace(val))?.Trim();

            if (!string.IsNullOrWhiteSpace(cloudName) && !string.IsNullOrWhiteSpace(apiKey) && !string.IsNullOrWhiteSpace(apiSecret))
            {
                var account = new Account(cloudName, apiKey, apiSecret);
                var cloudinary = new CloudinaryDotNet.Cloudinary(account);
                builder.Services.AddSingleton(cloudinary);
            }

            // register features
            builder.Services.AddScoped<ITokenService, TokenService>();
            builder.Services.AddScoped<IPasswordHashingService, PasswordHashingService>();
            builder.Services.AddScoped<IAppointmentService, AppointmentsService>();
            builder.Services.AddScoped<IAuthService, AuthService>();
            builder.Services.AddScoped<DashboardService>();
            builder.Services.AddScoped<IDiseaseService, DiseaseService>();
            builder.Services.AddScoped<IFollowUpService, FollowUpService>();
            builder.Services.AddScoped<MedicineService>();
            builder.Services.AddScoped<INotificationService, NotificationService>();
            builder.Services.AddScoped<IPatientService, PatientService>();
            builder.Services.AddScoped<PaymentService>();
            builder.Services.AddScoped<PdfDocumentService>();
            builder.Services.AddScoped<ReportService>();
            builder.Services.AddScoped<PrescriptionService>();
            builder.Services.AddScoped<IPrescriptionService>(sp => sp.GetRequiredService<PrescriptionService>());
            builder.Services.AddScoped<PhotoService>();
            builder.Services.AddScoped<IMcpService, McpService>();
            builder.Services.AddHostedService<InventoryMonitorService>();
        }
    }
}

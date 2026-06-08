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
using SCMS.Domain.Security;
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
            var connectionString = builder.Configuration.GetConnectionString("PostgreSqlConnection");
            builder.Services.AddDbContext<AppDbContext>(options => options.UseNpgsql(connectionString));

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
            builder.Services.AddSingleton<JwtTokenFactory>();
            builder.Services.AddSingleton<PasswordHashingService>();
            builder.Services.AddScoped<AppointmentsService>();
            builder.Services.AddScoped<AuthService>();
            builder.Services.AddScoped<DashboardService>();
            builder.Services.AddScoped<DiseaseService>();
            builder.Services.AddScoped<FollowUpService>();
            builder.Services.AddScoped<MedicineService>();
            builder.Services.AddScoped<NotificationService>();
            builder.Services.AddScoped<PatientService>();
            builder.Services.AddScoped<PaymentService>();
            builder.Services.AddScoped<PdfDocumentService>();
            builder.Services.AddScoped<ReportService>();
            builder.Services.AddScoped<PrescriptionService>();
            builder.Services.AddScoped<PhotoService>();
            builder.Services.AddScoped<McpService>();
            builder.Services.AddHostedService<InventoryMonitorService>();
        }

        //public static IMvcBuilder AddScmsFeatureControllers(this IServiceCollection services)
        //{

        //    return services
        //        .AddControllers()
        //        .AddApplicationPart(typeof(FeatureManager).Assembly);
        //}

        //public static IServiceCollection AddScmsFeatureServices(this IServiceCollection services, IConfiguration configuration)
        //{
        //    var connectionString = configuration.GetConnectionString("PostgreSqlConnection")
        //        ?? throw new InvalidOperationException("PostgreSqlConnection string is missing.");

        //    services.AddDbContext<AppDbContext>(options =>
        //        options.UseNpgsql(connectionString));
        //    services.AddSingleton<JwtTokenFactory>();
        //    services.AddSingleton<PasswordHashingService>();
        //    services.AddScoped<AppointmentsService>();
        //    services.AddScoped<AuthService>();
        //    services.AddScoped<DashboardService>();
        //    services.AddScoped<DiseaseService>();
        //    services.AddScoped<FollowUpService>();

        //    services.AddScoped<MedicineService>();
        //    services.AddScoped<NotificationService>();
        //    services.AddScoped<PatientService>();
        //    services.AddScoped<PaymentService>();
        //    services.AddScoped<PdfDocumentService>();
        //    services.AddScoped<ReportService>();
        //    services.AddScoped<PrescriptionService>();
        //    services.AddScoped<PhotoService>();
        //    services.AddScoped<McpService>();
        //    services.AddHostedService<InventoryMonitorService>();

        //     // Cloudinary configuration
        //    var cloudName = new[] { "Cloudinary:CloudName", "CLOUDINARY_CLOUD_NAME", "cloud_name" }
        //        .Select(key => configuration[key])
        //        .FirstOrDefault(val => !string.IsNullOrWhiteSpace(val))?.Trim();

        //    var apiKey = new[] { "Cloudinary:ApiKey", "CLOUDINARY_API_KEY", "api_key" }
        //        .Select(key => configuration[key])
        //        .FirstOrDefault(val => !string.IsNullOrWhiteSpace(val))?.Trim();

        //    var apiSecret = new[] { "Cloudinary:ApiSecret", "CLOUDINARY_API_SECRET", "api_secret" }
        //        .Select(key => configuration[key])
        //        .FirstOrDefault(val => !string.IsNullOrWhiteSpace(val))?.Trim();

        //    if (!string.IsNullOrWhiteSpace(cloudName) && !string.IsNullOrWhiteSpace(apiKey) && !string.IsNullOrWhiteSpace(apiSecret))
        //    {
        //        var account = new Account(cloudName, apiKey, apiSecret);
        //        var cloudinary = new CloudinaryDotNet.Cloudinary(account);
        //        services.AddSingleton(cloudinary);
        //    }
        //    return services;
        //}
    }
}

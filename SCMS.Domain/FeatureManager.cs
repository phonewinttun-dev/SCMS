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
using SCMS.Domain.Features.Roles;
using SCMS.Domain.Features.Users;

namespace SCMS.Domain
{
    public static class FeatureManager
    {
        public static IServiceCollection AddScmsFeatureServices(this IServiceCollection services, IConfiguration configuration)
        {

            services.AddMemoryCache();
            services.AddDbContext<AppDbContext>(options => ConfigureDatabaseProvider(options, configuration));
            services.AddSingleton<JwtTokenFactory>();
            services.AddSingleton<PasswordHashingService>();
            services.AddSingleton<Microsoft.AspNetCore.Authorization.IAuthorizationPolicyProvider, PermissionAuthorizationPolicyProvider>();
            services.AddScoped<Microsoft.AspNetCore.Authorization.IAuthorizationHandler, PermissionAuthorizationHandler>();
            services.AddScoped<IPermissionService, PermissionService>();
            services.AddScoped<IRoleService, RoleService>();
            services.AddScoped<IUserService, UserService>();
            services.AddScoped<IAppointmentsService, AppointmentsService>();
            services.AddScoped<IAuthService, AuthService>();
            services.AddScoped<IDashboardService, DashboardService>();
            services.AddScoped<IDiseaseService, DiseaseService>();
            services.AddScoped<IFollowUpService, FollowUpService>();
            services.AddScoped<IMedicineService, MedicineService>();
            services.AddScoped<INotificationService, NotificationService>();
            services.AddScoped<IPatientService, PatientService>();
            services.AddScoped<IPaymentService, PaymentService>();
            services.AddScoped<IPdfDocumentService, PdfDocumentService>();
            services.AddScoped<IReportService, ReportService>();
            services.AddScoped<IPrescriptionService, PrescriptionService>();
            services.AddScoped<IPhotoService, PhotoService>();
            services.AddScoped<IMcpService, McpService>();

            // Rotating pool of Gemini keys; singleton so cooldowns are shared across requests.
            services.AddSingleton<IGeminiApiKeyProvider, GeminiApiKeyProvider>();

            // The clinic's wall clock drives "today" and how bare times are interpreted.
            SCMS.Domain.Common.ClinicClock.Configure(configuration["Clinic:TimeZone"]);
            services.AddScoped<SCMS.Domain.Features.Dev.MassDatabaseSeeder>();
            services.AddHostedService<InventoryMonitorService>();

             // Cloudinary configuration
            var cloudName = new[] { "Cloudinary:CloudName", "CLOUDINARY_CLOUD_NAME", "cloud_name" }
                .Select(key => configuration[key])
                .FirstOrDefault(val => !string.IsNullOrWhiteSpace(val))?.Trim();

            var apiKey = new[] { "Cloudinary:ApiKey", "CLOUDINARY_API_KEY", "api_key" }
                .Select(key => configuration[key])
                .FirstOrDefault(val => !string.IsNullOrWhiteSpace(val))?.Trim();

            var apiSecret = new[] { "Cloudinary:ApiSecret", "CLOUDINARY_API_SECRET", "api_secret" }
                .Select(key => configuration[key])
                .FirstOrDefault(val => !string.IsNullOrWhiteSpace(val))?.Trim();

            if (!string.IsNullOrWhiteSpace(cloudName) && !string.IsNullOrWhiteSpace(apiKey) && !string.IsNullOrWhiteSpace(apiSecret))
            {
                var account = new Account(cloudName, apiKey, apiSecret);
                var cloudinary = new CloudinaryDotNet.Cloudinary(account);
                services.AddSingleton(cloudinary);
            }
            return services;
        }

        public static async Task EnsureScmsDatabaseCreatedAsync(this IServiceProvider services, IConfiguration configuration, ILogger logger)
        {
            if (IsSqliteProvider(configuration))
            {
                if (configuration.GetValue("Database:EnsureCreated", true) == false)
                {
                    return;
                }

                using var scope = services.CreateScope();
                var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                await context.Database.EnsureCreatedAsync();
                await EnsureSqliteSchemaCompatibilityAsync(context, logger);
                await SeedSqliteDemoUsersAsync(context, configuration);
                await EnsureSystemPermissionsSeededAsync(context, logger);
                await EnsureDefaultRolePermissionsAsync(context, logger);

                if (configuration.GetValue("Database:AutoSeedDemoData", false))
                {
                    var hasAppointments = await context.TblAppointments.AnyAsync();
                    if (!hasAppointments)
                    {
                        try
                        {
                            var seeder = scope.ServiceProvider.GetRequiredService<SCMS.Domain.Features.Dev.MassDatabaseSeeder>();
                            await seeder.Seed1YearDataAsync();
                            logger.LogInformation("Auto-seeded demo clinical data for SQLite on startup.");
                        }
                        catch (Exception ex)
                        {
                            logger.LogWarning(ex, "Failed to auto-seed demo clinical data on startup.");
                        }
                    }
                }

                logger.LogInformation("SQLite database initialization completed.");
                return;
            }

            if (IsPostgreSqlProvider(configuration))
            {
                if (configuration.GetValue("Database:EnsurePermissionsSeeded", true) == false)
                {
                    return;
                }

                try
                {
                    using var scope = services.CreateScope();
                    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                    if (await context.Database.CanConnectAsync())
                    {
                        await EnsureSystemPermissionsSeededAsync(context, logger);
                        await EnsureDefaultRolePermissionsAsync(context, logger);
                        logger.LogInformation("PostgreSQL system permissions synchronized.");
                    }
                }
                catch (Exception ex)
                {
                    logger.LogWarning(ex, "PostgreSQL permission sync skipped or encountered an issue during startup.");
                }
            }
        }

        private static readonly (string Menu, string Action)[] SystemPermissions = new[]
        {
            // Appointments
            ("Appointments", "View"),
            ("Appointments", "Create"),
            ("Appointments", "Update"),
            ("Appointments", "UpdateStatus"),
            ("Appointments", "Delete"),

            // Patients
            ("Patients", "View"),
            ("Patients", "Create"),
            ("Patients", "Update"),
            ("Patients", "Delete"),
            ("Patients", "ExportPdf"),

            // Prescriptions
            ("Prescriptions", "View"),
            ("Prescriptions", "Create"),
            ("Prescriptions", "Update"),
            ("Prescriptions", "Delete"),
            ("Prescriptions", "ExportPdf"),

            // Medicines
            ("Medicines", "View"),
            ("Medicines", "Create"),
            ("Medicines", "Update"),
            ("Medicines", "Delete"),
            ("Medicines", "AdjustStock"),

            // Payments
            ("Payments", "View"),
            ("Payments", "Create"),
            ("Payments", "Update"),
            ("Payments", "Delete"),
            ("Payments", "ExportPdf"),

            // FollowUps
            ("FollowUps", "View"),
            ("FollowUps", "Create"),
            ("FollowUps", "Update"),
            ("FollowUps", "Delete"),

            // Diseases
            ("Diseases", "View"),
            ("Diseases", "Create"),
            ("Diseases", "Update"),
            ("Diseases", "Delete"),

            // Notifications
            ("Notifications", "View"),
            ("Notifications", "Create"),
            ("Notifications", "Update"),
            ("Notifications", "Delete"),

            // Dashboards
            ("Dashboards", "View"),

            // Reports
            ("Reports", "View"),
            ("Reports", "ExportPdf"),

            // Roles
            ("Roles", "View"),
            ("Roles", "Create"),
            ("Roles", "Update"),
            ("Roles", "Delete"),

            // Permissions
            ("Permissions", "View"),

            // Users
            ("Users", "View"),
            ("Users", "Create"),
            ("Users", "Update"),
            ("Users", "Delete"),

            // Mcp
            ("Mcp", "Access")
        };

        private static async Task EnsureSystemPermissionsSeededAsync(AppDbContext context, ILogger logger)
        {
            var existing = await context.TblPermissions.ToListAsync();
            var existingKeys = new HashSet<string>(
                existing.Select(p => $"{p.Menu.ToLowerInvariant()}.{p.Action.ToLowerInvariant()}"));

            var added = false;
            foreach (var (menu, action) in SystemPermissions)
            {
                var key = $"{menu.ToLowerInvariant()}.{action.ToLowerInvariant()}";
                if (!existingKeys.Contains(key))
                {
                    context.TblPermissions.Add(new TblPermission
                    {
                        Menu = menu,
                        Action = action
                    });
                    added = true;
                }
            }

            if (added)
            {
                await context.SaveChangesAsync();
                logger.LogInformation("Seeded system permissions into tbl_permission.");
            }
        }

        private static async Task EnsureDefaultRolePermissionsAsync(AppDbContext context, ILogger logger)
        {
            var allPermissions = await context.TblPermissions.ToListAsync();
            var permMap = allPermissions.ToDictionary(
                p => $"{p.Menu.ToLowerInvariant()}.{p.Action.ToLowerInvariant()}",
                p => p.Id);

            // Default Doctor Permissions
            var doctorPermKeys = new[]
            {
                "appointments.view", "appointments.create", "appointments.update", "appointments.updatestatus", "appointments.delete",
                "patients.view", "patients.create", "patients.update", "patients.exportpdf",
                "prescriptions.view", "prescriptions.create", "prescriptions.update", "prescriptions.delete", "prescriptions.exportpdf",
                "medicines.view",
                "followups.view", "followups.create", "followups.update", "followups.delete",
                "diseases.view", "diseases.create", "diseases.update",
                "notifications.view", "notifications.create", "notifications.update",
                "dashboards.view",
                "reports.view", "reports.exportpdf",
                "mcp.access"
            };

            // Default User (Patient) Permissions
            var userPermKeys = new[]
            {
                "appointments.view", "appointments.create",
                "patients.view",
                "prescriptions.view",
                "payments.view", "payments.create",
                "notifications.view", "notifications.update",
                "dashboards.view"
            };

            await SeedRolePermissionsForRoleNameAsync(context, "doctor", doctorPermKeys, permMap);
            await SeedRolePermissionsForRoleNameAsync(context, "user", userPermKeys, permMap);
            await SeedRolePermissionsForRoleNameAsync(context, "owner", permMap.Keys.ToArray(), permMap);
            await SeedRolePermissionsForRoleNameAsync(context, "admin", permMap.Keys.ToArray(), permMap);
        }

        private static async Task SeedRolePermissionsForRoleNameAsync(
            AppDbContext context,
            string roleName,
            string[] permKeys,
            Dictionary<string, int> permMap)
        {
            var userRoles = await context.TblUserRoles
                .Where(r => r.Role.ToLower() == roleName.ToLower())
                .ToListAsync();

            if (userRoles.Count == 0) return;

            var userRoleIds = userRoles.Select(ur => ur.Id).ToList();
            var existingRolePerms = await context.TblRolePermissions
                .Where(rp => userRoleIds.Contains(rp.RoleId))
                .ToListAsync();

            var existingMap = new HashSet<string>(
                existingRolePerms.Select(rp => $"{rp.RoleId}_{rp.PermissionId}"));

            var added = false;
            foreach (var ur in userRoles)
            {
                foreach (var key in permKeys)
                {
                    if (permMap.TryGetValue(key.ToLowerInvariant(), out var permId))
                    {
                        var linkKey = $"{ur.Id}_{permId}";
                        if (!existingMap.Contains(linkKey))
                        {
                            context.TblRolePermissions.Add(new TblRolePermission
                            {
                                RoleId = ur.Id,
                                PermissionId = permId
                            });
                            existingMap.Add(linkKey);
                            added = true;
                        }
                    }
                }
            }

            if (added)
            {
                await context.SaveChangesAsync();
            }
        }

        private static async Task EnsureSqliteSchemaCompatibilityAsync(AppDbContext context, ILogger logger)
        {
            await EnsureSqliteColumnAsync(context, logger, "tbl_medicine", "image_url", "TEXT");
            await EnsureSqliteColumnAsync(context, logger, "tbl_medicine", "image_id", "TEXT");
            await EnsureSqliteColumnAsync(context, logger, "tbl_payment", "transaction_ref", "TEXT");
            await EnsureSqliteColumnAsync(context, logger, "tbl_payment", "payment_screenshot", "TEXT");
        }

        private static async Task EnsureSqliteColumnAsync(
            AppDbContext context,
            ILogger logger,
            string tableName,
            string columnName,
            string columnDefinition)
        {
            var connection = context.Database.GetDbConnection();
            var shouldClose = connection.State != System.Data.ConnectionState.Open;
            if (shouldClose)
            {
                await connection.OpenAsync();
            }

            try
            {
                await using var readCommand = connection.CreateCommand();
                readCommand.CommandText = $"PRAGMA table_info({tableName});";
                var exists = false;

                await using (var reader = await readCommand.ExecuteReaderAsync())
                {
                    while (await reader.ReadAsync())
                    {
                        if (string.Equals(reader.GetString(1), columnName, StringComparison.OrdinalIgnoreCase))
                        {
                            exists = true;
                            break;
                        }
                    }
                }

                if (exists)
                {
                    return;
                }

                await using var alterCommand = connection.CreateCommand();
                alterCommand.CommandText = $"ALTER TABLE {tableName} ADD COLUMN {columnName} {columnDefinition};";
                await alterCommand.ExecuteNonQueryAsync();
                logger.LogInformation("Added SQLite compatibility column {Table}.{Column}.", tableName, columnName);
            }
            finally
            {
                if (shouldClose)
                {
                    await connection.CloseAsync();
                }
            }
        }

        private static async Task SeedSqliteDemoUsersAsync(AppDbContext context, IConfiguration configuration)
        {
            if (configuration.GetValue("Database:SeedDemoUsers", true) == false)
            {
                return;
            }

            var now = DateTime.UtcNow;
            var admin = await EnsureDemoUserAsync(
                context,
                "SCMS Admin",
                "09979990001",
                "admin@scms.demo",
                "owner",
                now);

            var doctor = await EnsureDemoUserAsync(
                context,
                "Dr. Kyaw Zin",
                "09770000002",
                "doctor@scms.demo",
                "doctor",
                now);

            var patientUser = await EnsureDemoUserAsync(
                context,
                "SCMS Patient",
                "09979990003",
                "user@scms.demo",
                "user",
                now);

            await SeedPatientDemoFamilyAndAppointmentsAsync(context, patientUser, now);
        }

        private static async Task SeedPatientDemoFamilyAndAppointmentsAsync(AppDbContext context, TblUser patientUser, DateTime now)
        {
            // 1. Ensure family member profiles exist
            var p1 = await context.TblPatients.FirstOrDefaultAsync(p => p.UserId == patientUser.UserId && p.Name == "SCMS Patient");
            if (p1 == null)
            {
                p1 = new TblPatient
                {
                    UserId = patientUser.UserId,
                    Name = "SCMS Patient",
                    MobileNo = patientUser.MobileNo,
                    Email = patientUser.Email,
                    DateOfBirth = new DateOnly(1990, 5, 14),
                    Gender = "male",
                    BloodType = "O+",
                    Allergies = "Penicillin",
                    ChronicConditions = "Mild Asthma",
                    Address = """
                    {
                      "ActualAddress": "No. 45, Bogyoke Road, Bahan, Yangon",
                      "Allergies": "Penicillin",
                      "ChronicConditions": "Mild Asthma"
                    }
                    """,
                    CreatedAt = new DateTime(2026, 8, 1, 8, 0, 0, DateTimeKind.Utc),
                    UpdatedAt = now,
                    DeleteFlag = false
                };
                context.TblPatients.Add(p1);
            }

            var p2 = await context.TblPatients.FirstOrDefaultAsync(p => p.UserId == patientUser.UserId && p.Name == "Daw Khin Myo");
            if (p2 == null)
            {
                p2 = new TblPatient
                {
                    UserId = patientUser.UserId,
                    Name = "Daw Khin Myo",
                    MobileNo = "09979990012",
                    Email = "khinmyo@family.demo",
                    DateOfBirth = new DateOnly(1965, 8, 20),
                    Gender = "female",
                    BloodType = "B+",
                    Allergies = "Sulfa drugs",
                    ChronicConditions = "Hypertension",
                    Address = """
                    {
                      "ActualAddress": "No. 45, Bogyoke Road, Bahan, Yangon",
                      "Allergies": "Sulfa drugs",
                      "ChronicConditions": "Hypertension"
                    }
                    """,
                    CreatedAt = new DateTime(2026, 8, 1, 8, 30, 0, DateTimeKind.Utc),
                    UpdatedAt = now,
                    DeleteFlag = false
                };
                context.TblPatients.Add(p2);
            }

            var p3 = await context.TblPatients.FirstOrDefaultAsync(p => p.UserId == patientUser.UserId && p.Name == "Ma Hnin Thandar");
            if (p3 == null)
            {
                p3 = new TblPatient
                {
                    UserId = patientUser.UserId,
                    Name = "Ma Hnin Thandar",
                    MobileNo = "09979990013",
                    Email = "hninthandar@family.demo",
                    DateOfBirth = new DateOnly(1998, 11, 12),
                    Gender = "female",
                    BloodType = "A+",
                    Allergies = "None",
                    ChronicConditions = "None",
                    Address = """
                    {
                      "ActualAddress": "No. 45, Bogyoke Road, Bahan, Yangon",
                      "Allergies": "None",
                      "ChronicConditions": "None"
                    }
                    """,
                    CreatedAt = new DateTime(2026, 8, 1, 9, 0, 0, DateTimeKind.Utc),
                    UpdatedAt = now,
                    DeleteFlag = false
                };
                context.TblPatients.Add(p3);
            }

            var p4 = await context.TblPatients.FirstOrDefaultAsync(p => p.UserId == patientUser.UserId && p.Name == "U Kyaw Swar");
            if (p4 == null)
            {
                p4 = new TblPatient
                {
                    UserId = patientUser.UserId,
                    Name = "U Kyaw Swar",
                    MobileNo = "09979990014",
                    Email = "kyawswar@family.demo",
                    DateOfBirth = new DateOnly(1978, 4, 18),
                    Gender = "male",
                    BloodType = "O+",
                    Allergies = "Aspirin",
                    ChronicConditions = "Type 2 Diabetes",
                    Address = """
                    {
                      "ActualAddress": "No. 45, Bogyoke Road, Bahan, Yangon",
                      "Allergies": "Aspirin",
                      "ChronicConditions": "Type 2 Diabetes"
                    }
                    """,
                    CreatedAt = new DateTime(2026, 8, 1, 9, 30, 0, DateTimeKind.Utc),
                    UpdatedAt = now,
                    DeleteFlag = false
                };
                context.TblPatients.Add(p4);
            }

            var p5 = await context.TblPatients.FirstOrDefaultAsync(p => p.UserId == patientUser.UserId && p.Name == "Daw Aye Aye Thin");
            if (p5 == null)
            {
                p5 = new TblPatient
                {
                    UserId = patientUser.UserId,
                    Name = "Daw Aye Aye Thin",
                    MobileNo = "09979990015",
                    Email = "ayeayethin@family.demo",
                    DateOfBirth = new DateOnly(1974, 9, 25),
                    Gender = "female",
                    BloodType = "B+",
                    Allergies = "None",
                    ChronicConditions = "Hyperlipidemia",
                    Address = """
                    {
                      "ActualAddress": "No. 45, Bogyoke Road, Bahan, Yangon",
                      "Allergies": "None",
                      "ChronicConditions": "Hyperlipidemia"
                    }
                    """,
                    CreatedAt = new DateTime(2026, 8, 1, 10, 0, 0, DateTimeKind.Utc),
                    UpdatedAt = now,
                    DeleteFlag = false
                };
                context.TblPatients.Add(p5);
            }

            var p6 = await context.TblPatients.FirstOrDefaultAsync(p => p.UserId == patientUser.UserId && p.Name == "Mg Min Khant");
            if (p6 == null)
            {
                p6 = new TblPatient
                {
                    UserId = patientUser.UserId,
                    Name = "Mg Min Khant",
                    MobileNo = "09979990016",
                    Email = "minkhant@family.demo",
                    DateOfBirth = new DateOnly(2014, 6, 10),
                    Gender = "male",
                    BloodType = "A+",
                    Allergies = "Peanuts",
                    ChronicConditions = "Mild Asthma",
                    Address = """
                    {
                      "ActualAddress": "No. 45, Bogyoke Road, Bahan, Yangon",
                      "Allergies": "Peanuts",
                      "ChronicConditions": "Mild Asthma"
                    }
                    """,
                    CreatedAt = new DateTime(2026, 8, 1, 10, 30, 0, DateTimeKind.Utc),
                    UpdatedAt = now,
                    DeleteFlag = false
                };
                context.TblPatients.Add(p6);
            }

            await context.SaveChangesAsync();

            // 2. Ensure appointments across August 2026 including comprehensive schedule for 24 Aug 2026
            var appointmentData = new[]
            {
                // Earlier August consultations
                (Code: "APT-20260802-001", Patient: p2, Date: new DateTime(2026, 8, 2, 9, 0, 0, DateTimeKind.Utc), Status: "completed", Reason: "Routine Health Checkup", Notes: "Routine Health Checkup & Blood Pressure Monitoring"),
                (Code: "APT-20260805-002", Patient: p1, Date: new DateTime(2026, 8, 5, 10, 30, 0, DateTimeKind.Utc), Status: "completed", Reason: "General Medical Consultation", Notes: "General Medical Consultation & Seasonal Allergy"),
                (Code: "APT-20260808-003", Patient: p2, Date: new DateTime(2026, 8, 8, 14, 0, 0, DateTimeKind.Utc), Status: "completed", Reason: "Specialist Review", Notes: "Hypertension Medication Adjustment"),
                (Code: "APT-20260812-004", Patient: p3, Date: new DateTime(2026, 8, 12, 11, 0, 0, DateTimeKind.Utc), Status: "completed", Reason: "Health Screening & Check", Notes: "Annual Health Screening & Blood Panel"),
                (Code: "APT-20260815-005", Patient: p1, Date: new DateTime(2026, 8, 15, 9, 30, 0, DateTimeKind.Utc), Status: "completed", Reason: "Follow-up Revisit", Notes: "Asthma Inhaler Refill & Spirometry Review"),
                (Code: "APT-20260819-006", Patient: p3, Date: new DateTime(2026, 8, 19, 15, 30, 0, DateTimeKind.Utc), Status: "completed", Reason: "General Medical Consultation", Notes: "Seasonal Flu, Sore Throat & Viral Fever"),

                // 24 Aug 2026 appointments
                (Code: "APT-20260824-001", Patient: p2, Date: new DateTime(2026, 8, 24, 8, 30, 0, DateTimeKind.Utc), Status: "completed", Reason: "Routine Health Checkup", Notes: "Hypertension Routine Follow-up & BP Monitoring"),
                (Code: "APT-20260824-002", Patient: p1, Date: new DateTime(2026, 8, 24, 9, 15, 0, DateTimeKind.Utc), Status: "completed", Reason: "General Medical Consultation", Notes: "General Medical Consultation & Seasonal Fever"),
                (Code: "APT-20260824-003", Patient: p4, Date: new DateTime(2026, 8, 24, 10, 0, 0, DateTimeKind.Utc), Status: "completed", Reason: "Specialist Review", Notes: "Type 2 Diabetes Review & Fasting Blood Glucose"),
                (Code: "APT-20260824-004", Patient: p3, Date: new DateTime(2026, 8, 24, 11, 0, 0, DateTimeKind.Utc), Status: "completed", Reason: "General Medical Consultation", Notes: "Dermatology & Allergic Rhinitis Consultation"),
                (Code: "APT-20260824-005", Patient: p5, Date: new DateTime(2026, 8, 24, 11, 45, 0, DateTimeKind.Utc), Status: "completed", Reason: "Health Screening & Check", Notes: "Hyperlipidemia & Cardiovascular Screening"),
                (Code: "APT-20260824-006", Patient: p6, Date: new DateTime(2026, 8, 24, 13, 30, 0, DateTimeKind.Utc), Status: "completed", Reason: "Follow-up Revisit", Notes: "Pediatric Asthma Review & Inhaler Assessment"),
                (Code: "APT-20260824-007", Patient: p2, Date: new DateTime(2026, 8, 24, 14, 30, 0, DateTimeKind.Utc), Status: "confirmed", Reason: "Follow-up Revisit", Notes: "Routine Blood Pressure Follow-up & ECG Review"),
                (Code: "APT-20260824-008", Patient: p1, Date: new DateTime(2026, 8, 24, 15, 15, 0, DateTimeKind.Utc), Status: "confirmed", Reason: "General Medical Consultation", Notes: "General Consultation & Prescription Renewal"),
                (Code: "APT-20260824-009", Patient: p4, Date: new DateTime(2026, 8, 24, 16, 0, 0, DateTimeKind.Utc), Status: "pending", Reason: "Specialist Review", Notes: "Dietary Advice & Laboratory Panel Review"),
                (Code: "APT-20260824-010", Patient: p3, Date: new DateTime(2026, 8, 24, 16, 45, 0, DateTimeKind.Utc), Status: "cancelled", Reason: "Health Screening & Check", Notes: "Patient requested cancellation due to work schedule"),

                // Later August appointments
                (Code: "APT-20260825-008", Patient: p1, Date: new DateTime(2026, 8, 25, 10, 30, 0, DateTimeKind.Utc), Status: "confirmed", Reason: "General Medical Consultation", Notes: "General Consultation & Prescription Renewal"),
                (Code: "APT-20260827-009", Patient: p3, Date: new DateTime(2026, 8, 27, 14, 0, 0, DateTimeKind.Utc), Status: "pending", Reason: "Specialist Review", Notes: "Dermatology & Skin Rash Review"),
                (Code: "APT-20260829-010", Patient: p1, Date: new DateTime(2026, 8, 29, 11, 0, 0, DateTimeKind.Utc), Status: "pending", Reason: "Health Screening & Check", Notes: "General Wellness & Diagnostic Lab Review"),
            };

            var apptList = new List<TblAppointment>();
            foreach (var item in appointmentData)
            {
                var appt = await context.TblAppointments.FirstOrDefaultAsync(a => a.AppointmentCode == item.Code);
                if (appt == null)
                {
                    appt = new TblAppointment
                    {
                        AppointmentCode = item.Code,
                        PatientId = item.Patient.PatientId,
                        Datetime = item.Date,
                        Status = item.Status,
                        Notes = item.Notes,
                        CreatedAt = item.Date.AddDays(-2),
                        UpdatedAt = now
                    };
                    context.TblAppointments.Add(appt);
                }
                apptList.Add(appt);
            }
            await context.SaveChangesAsync();

            // 3. Ensure Payments exist (Total 210,000 MMK Paid Revenue on 24 Aug 2026)
            var a1 = apptList.FirstOrDefault(a => a.AppointmentCode == "APT-20260802-001");
            var a2 = apptList.FirstOrDefault(a => a.AppointmentCode == "APT-20260805-002");
            var a3 = apptList.FirstOrDefault(a => a.AppointmentCode == "APT-20260808-003");
            var a4 = apptList.FirstOrDefault(a => a.AppointmentCode == "APT-20260812-004");
            var a5 = apptList.FirstOrDefault(a => a.AppointmentCode == "APT-20260815-005");
            var a6 = apptList.FirstOrDefault(a => a.AppointmentCode == "APT-20260819-006");
            var a24_1 = apptList.FirstOrDefault(a => a.AppointmentCode == "APT-20260824-001");
            var a24_2 = apptList.FirstOrDefault(a => a.AppointmentCode == "APT-20260824-002");
            var a24_3 = apptList.FirstOrDefault(a => a.AppointmentCode == "APT-20260824-003");
            var a24_4 = apptList.FirstOrDefault(a => a.AppointmentCode == "APT-20260824-004");
            var a24_5 = apptList.FirstOrDefault(a => a.AppointmentCode == "APT-20260824-005");
            var a24_6 = apptList.FirstOrDefault(a => a.AppointmentCode == "APT-20260824-006");
            var a24_7 = apptList.FirstOrDefault(a => a.AppointmentCode == "APT-20260824-007");
            var a24_8 = apptList.FirstOrDefault(a => a.AppointmentCode == "APT-20260824-008");
            var a24_9 = apptList.FirstOrDefault(a => a.AppointmentCode == "APT-20260824-009");
            var a25_8 = apptList.FirstOrDefault(a => a.AppointmentCode == "APT-20260825-008");

            var paymentsToEnsure = new[]
            {
                // Earlier August payments
                (Appt: a1, Amount: 25000m, Tax: 1250m, Method: "kpay", Status: "paid", PaidAt: (DateTime?)new DateTime(2026, 8, 2, 9, 45, 0, DateTimeKind.Utc)),
                (Appt: a2, Amount: 30000m, Tax: 1500m, Method: "wavepay", Status: "paid", PaidAt: (DateTime?)new DateTime(2026, 8, 5, 11, 15, 0, DateTimeKind.Utc)),
                (Appt: a3, Amount: 20000m, Tax: 1000m, Method: "kpay", Status: "paid", PaidAt: (DateTime?)new DateTime(2026, 8, 8, 14, 30, 0, DateTimeKind.Utc)),
                (Appt: a4, Amount: 18000m, Tax: 900m, Method: "cash", Status: "paid", PaidAt: (DateTime?)new DateTime(2026, 8, 12, 11, 45, 0, DateTimeKind.Utc)),
                (Appt: a5, Amount: 35000m, Tax: 1750m, Method: "wavepay", Status: "paid", PaidAt: (DateTime?)new DateTime(2026, 8, 15, 10, 15, 0, DateTimeKind.Utc)),
                (Appt: a6, Amount: 25000m, Tax: 1250m, Method: "cash", Status: "paid", PaidAt: (DateTime?)new DateTime(2026, 8, 19, 16, 15, 0, DateTimeKind.Utc)),

                // 24 Aug 2026 Paid Payments (Total = 210,000 MMK)
                (Appt: a24_1, Amount: 35000m, Tax: 1750m, Method: "kpay", Status: "paid", PaidAt: (DateTime?)new DateTime(2026, 8, 24, 9, 0, 0, DateTimeKind.Utc)),
                (Appt: a24_2, Amount: 25000m, Tax: 1250m, Method: "wavepay", Status: "paid", PaidAt: (DateTime?)new DateTime(2026, 8, 24, 9, 45, 0, DateTimeKind.Utc)),
                (Appt: a24_3, Amount: 45000m, Tax: 2250m, Method: "cash", Status: "paid", PaidAt: (DateTime?)new DateTime(2026, 8, 24, 10, 30, 0, DateTimeKind.Utc)),
                (Appt: a24_4, Amount: 20000m, Tax: 1000m, Method: "cbpay", Status: "paid", PaidAt: (DateTime?)new DateTime(2026, 8, 24, 11, 30, 0, DateTimeKind.Utc)),
                (Appt: a24_5, Amount: 55000m, Tax: 2750m, Method: "kpay", Status: "paid", PaidAt: (DateTime?)new DateTime(2026, 8, 24, 12, 15, 0, DateTimeKind.Utc)),
                (Appt: a24_6, Amount: 30000m, Tax: 1500m, Method: "cash", Status: "paid", PaidAt: (DateTime?)new DateTime(2026, 8, 24, 14, 0, 0, DateTimeKind.Utc)),

                // 24 Aug 2026 Pending Payments (Total = 82,000 MMK)
                (Appt: a24_7, Amount: 22000m, Tax: 1100m, Method: "kpay", Status: "pending", PaidAt: (DateTime?)null),
                (Appt: a24_8, Amount: 28000m, Tax: 1400m, Method: "wavepay", Status: "pending", PaidAt: (DateTime?)null),
                (Appt: a24_9, Amount: 32000m, Tax: 1600m, Method: "cbpay", Status: "pending", PaidAt: (DateTime?)null),

                // Later August payments
                (Appt: a25_8, Amount: 35000m, Tax: 1750m, Method: "cbpay", Status: "pending", PaidAt: (DateTime?)null),
            };

            foreach (var p in paymentsToEnsure)
            {
                if (p.Appt != null)
                {
                    var exists = await context.TblPayments.AnyAsync(pay => pay.AppointmentId == p.Appt.Id);
                    if (!exists)
                    {
                        context.TblPayments.Add(new TblPayment
                        {
                            AppointmentId = p.Appt.Id,
                            Amount = p.Amount,
                            Tax = p.Tax,
                            Charges = 0,
                            PaymentMethod = p.Method,
                            PaymentStatus = p.Status,
                            PaidAt = p.PaidAt,
                            UpdatedAt = now
                        });
                    }
                }
            }
            await context.SaveChangesAsync();

            // 4. Ensure any completed appointment in the database has a paid payment record
            var completedApptsWithoutPayment = await context.TblAppointments
                .Where(a => a.Status == "completed" && !context.TblPayments.Any(p => p.AppointmentId == a.Id))
                .ToListAsync();

            if (completedApptsWithoutPayment.Count > 0)
            {
                var rand = new Random(42);
                string[] methods = { "kpay", "wavepay", "cash", "cbpay", "ayapay" };
                decimal[] standardAmounts = { 15000m, 20000m, 25000m, 30000m, 35000m, 45000m, 50000m };

                foreach (var appt in completedApptsWithoutPayment)
                {
                    decimal amt = standardAmounts[rand.Next(standardAmounts.Length)];
                    context.TblPayments.Add(new TblPayment
                    {
                        AppointmentId = appt.Id,
                        Amount = amt,
                        Tax = amt * 0.05m,
                        Charges = 0,
                        PaymentMethod = methods[rand.Next(methods.Length)],
                        PaymentStatus = "paid",
                        PaidAt = appt.Datetime.AddMinutes(20),
                        UpdatedAt = now
                    });
                }
                await context.SaveChangesAsync();
            }
        }

        private static async Task<TblUser> EnsureDemoUserAsync(
            AppDbContext context,
            string name,
            string mobileNo,
            string email,
            string role,
            DateTime now)
        {
            var user = await context.TblUsers
                .FirstOrDefaultAsync(u => u.Email == email);

            if (user == null)
            {
                user = new TblUser
                {
                    Name = name,
                    MobileNo = mobileNo,
                    Email = email,
                    PasswordHash = "demo-password-hash",
                    CreatedAt = now,
                    UpdatedAt = now,
                    DeleteFlag = false
                };
                context.TblUsers.Add(user);
                await context.SaveChangesAsync();
            }

            // Query the database directly — do NOT rely on navigation properties
            // which may be stale or incomplete from earlier seeder operations.
            var roleExists = await context.TblUserRoles
                .AnyAsync(r => r.UserId == user.UserId
                    && r.Role.ToLower() == role.ToLower());

            if (!roleExists)
            {
                try
                {
                    context.TblUserRoles.Add(new TblUserRole
                    {
                        UserId = user.UserId,
                        Role = role
                    });
                    await context.SaveChangesAsync();
                }
                catch (DbUpdateException)
                {
                    // UNIQUE constraint (user_id, role) already satisfied — safe to ignore
                    context.ChangeTracker.Clear();
                }
            }

            return user;
        }

        private static void ConfigureDatabaseProvider(DbContextOptionsBuilder options, IConfiguration configuration)
        {
            if (IsSqliteProvider(configuration))
            {
                var connectionString = GetConnectionString(configuration, "SqliteConnection", "Data Source=scms.local.db");
                options.UseSqlite(connectionString);
                return;
            }

            if (IsPostgreSqlProvider(configuration))
            {
                var connectionString = GetConnectionString(configuration, "PostgreSqlConnection", null);
                connectionString = ParsePostgreSqlConnectionString(connectionString);
                options.UseNpgsql(connectionString);
                return;
            }

            throw new InvalidOperationException("Unsupported Database:Provider. Use 'Sqlite' or 'PostgreSql'.");
        }

        private static string GetConnectionString(IConfiguration configuration, string namedConnection, string? fallback)
        {
            var connectionString = configuration["DATABASE_URL"]
                ?? configuration.GetConnectionString(namedConnection)
                ?? configuration.GetConnectionString("DefaultConnection")
                ?? fallback;

            if (string.IsNullOrWhiteSpace(connectionString))
            {
                throw new InvalidOperationException($"Connection string '{namedConnection}', 'DefaultConnection', or 'DATABASE_URL' is missing.");
            }

            return connectionString;
        }

        private static string ParsePostgreSqlConnectionString(string connectionString)
        {
            if (connectionString.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase)
                || connectionString.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
            {
                var uri = new Uri(connectionString);
                var userInfo = uri.UserInfo.Split(':');
                var username = userInfo[0];
                var password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : "";
                var host = uri.Host;
                var port = uri.Port > 0 ? uri.Port : 5432;
                var database = uri.AbsolutePath.TrimStart('/');

                return $"Host={host};Port={port};Database={database};Username={username};Password={password};SSL Mode=Require;Trust Server Certificate=true;";
            }

            return connectionString;
        }

        private static bool IsSqliteProvider(IConfiguration configuration)
        {
            var provider = GetDatabaseProvider(configuration);
            return string.Equals(provider, "Sqlite", StringComparison.OrdinalIgnoreCase)
                || string.Equals(provider, "SQLite", StringComparison.OrdinalIgnoreCase);
        }

        private static bool IsPostgreSqlProvider(IConfiguration configuration)
        {
            var provider = GetDatabaseProvider(configuration);
            return string.Equals(provider, "PostgreSql", StringComparison.OrdinalIgnoreCase)
                || string.Equals(provider, "PostgreSQL", StringComparison.OrdinalIgnoreCase)
                || string.Equals(provider, "Postgres", StringComparison.OrdinalIgnoreCase)
                || string.Equals(provider, "Npgsql", StringComparison.OrdinalIgnoreCase);
        }

        private static bool ShouldInitializeDatabase(IConfiguration configuration)
        {
            return IsSqliteProvider(configuration);
        }

        private static string GetDatabaseProvider(IConfiguration configuration)
            => configuration["Database:Provider"] ?? "Sqlite";
    }
}

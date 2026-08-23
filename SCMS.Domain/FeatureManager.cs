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

            var hasPatientProfile = await context.TblPatients
                .AnyAsync(p => p.UserId == patientUser.UserId && p.DeleteFlag != true);
            if (!hasPatientProfile)
            {
                context.TblPatients.Add(new TblPatient
                {
                    UserId = patientUser.UserId,
                    Name = "SCMS Patient",
                    MobileNo = patientUser.MobileNo,
                    Email = patientUser.Email,
                    DateOfBirth = new DateOnly(1990, 1, 1),
                    Gender = "male",
                    BloodType = "O+",
                    Address = """
                    {
                      "ActualAddress": "SQLite demo address",
                      "Allergies": "No known drug allergies",
                      "ChronicConditions": "None"
                    }
                    """,
                    CreatedAt = now,
                    UpdatedAt = now,
                    DeleteFlag = false
                });
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
                options.UseNpgsql(connectionString);
                return;
            }

            throw new InvalidOperationException("Unsupported Database:Provider. Use 'Sqlite' or 'PostgreSql'.");
        }

        private static string GetConnectionString(IConfiguration configuration, string namedConnection, string? fallback)
        {
            var connectionString = configuration.GetConnectionString(namedConnection)
                ?? configuration.GetConnectionString("DefaultConnection")
                ?? fallback;

            if (string.IsNullOrWhiteSpace(connectionString))
            {
                throw new InvalidOperationException($"Connection string '{namedConnection}' or 'DefaultConnection' is missing.");
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

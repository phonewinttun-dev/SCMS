using Serilog;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Scalar.AspNetCore;
using SCMS.Domain;
using SCMS.Domain.Realtime;
using SCMS.Shared;
using SCMS.Api.Middleware;

AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);
Log.Logger = new LoggerConfiguration()
        .MinimumLevel.Debug()
        .WriteTo.Console()
        .WriteTo.File("logs/scms_log.txt", rollingInterval: RollingInterval.Hour)
        .CreateLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    //Add Serilog
    builder.Services.AddSerilog();

    builder.Services.AddControllers()
        .AddJsonOptions(options =>
        {
            options.JsonSerializerOptions.Converters.Add(new SCMS.Domain.Common.DateOnlyJsonConverter());
            options.JsonSerializerOptions.Converters.Add(new SCMS.Domain.Common.NullableDateOnlyJsonConverter());
        });
    builder.Services.AddExceptionHandler<ApiExceptionHandler>();
    builder.Services.AddProblemDetails();
    builder.Services.AddScmsFeatureServices(builder.Configuration);

    // Gemini calls are chained up to 5 deep per chat turn, so cap each hop well under
    // HttpClient's 100s default to keep the worst case bounded.
    builder.Services.AddHttpClient(SCMS.Api.Controllers.McpController.GeminiHttpClientName, client =>
    {
        client.Timeout = TimeSpan.FromSeconds(30);
    });

    builder.Services.AddSignalR();
    builder.Services.AddHealthChecks();

    builder.Services.Configure<ForwardedHeadersOptions>(options =>
    {
        options.ForwardedHeaders = Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedFor | Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedProto;
        options.KnownNetworks.Clear();
        options.KnownProxies.Clear();
    });



    builder.Services.AddCors(options =>
    {
        options.AddPolicy("ScmsWeb", policy =>
        {
            policy
                .SetIsOriginAllowed(_ => true)
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials();
        });
    });



    builder.Services
        .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            var issuer =
                builder.Configuration["Jwt:Issuer"]
                ?? "SCMS.Api";

            var audience =
                builder.Configuration["Jwt:Audience"]
                ?? "SCMS.Web";

            var signingKey =
                builder.Configuration["Jwt:SigningKey"]
                ?? "SCMS development signing key - 32 characters long!";

            options.TokenValidationParameters =
                new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = issuer,

                    ValidateAudience = true,
                    ValidAudience = audience,

                    ValidateIssuerSigningKey = true,

                    IssuerSigningKey =
                        new SymmetricSecurityKey(
                            Encoding.UTF8.GetBytes(signingKey)
                        ),

                    ValidateLifetime = true,

                    ClockSkew = TimeSpan.FromMinutes(1)
                };



            options.Events = new JwtBearerEvents
            {
                OnMessageReceived = context =>
                {
                    var accessToken =
                        context.Request.Query["access_token"];

                    var path =
                        context.HttpContext.Request.Path;

                    if (
                        !string.IsNullOrEmpty(accessToken)
                        && path.StartsWithSegments("/hubs")
                    )
                    {
                        context.Token = accessToken;
                    }

                    return Task.CompletedTask;
                }
            };
        });

    builder.Services.AddAuthorization();

    builder.Services.AddEndpointsApiExplorer();

    builder.Services.AddSwaggerGen(options =>
    {
        options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
        {
            Name = "Authorization",
            Type = SecuritySchemeType.Http,
            Scheme = "Bearer",
            BearerFormat = "JWT",
            In = ParameterLocation.Header,
            Description = "JWT Authorization header using the Bearer scheme. Example: \"Bearer {token}\""
        });

        options.AddSecurityRequirement(new OpenApiSecurityRequirement
        {
            {
                new OpenApiSecurityScheme
                {
                    Reference = new OpenApiReference
                    {
                        Type = ReferenceType.SecurityScheme,
                        Id = "Bearer"
                    }
                },
                Array.Empty<string>()
            }
        });
    });



    var app = builder.Build();


    app.UseForwardedHeaders();

    var enableScalarDocs = app.Environment.IsDevelopment()
        || builder.Configuration.GetValue("Features:EnableScalarDocs", true);

    if (enableScalarDocs)
    {
        app.MapSwagger("/openapi/{documentName}.json");

        app.MapScalarApiReference(options =>
        {
            options.AddPreferredSecuritySchemes(new[] { "Bearer" });
        });

        app.MapGet("/", () => Results.Redirect("/scalar")).ExcludeFromDescription();
    }

    app.MapHealthChecks("/health");

    await app.Services.EnsureScmsDatabaseCreatedAsync(app.Configuration, app.Logger);

    if (args.Contains("--seed") || args.Contains("--mass-seed") || args.Contains("seed"))
    {
        using var scope = app.Services.CreateScope();
        var seeder = scope.ServiceProvider.GetRequiredService<SCMS.Domain.Features.Dev.MassDatabaseSeeder>();
        await seeder.Seed1YearDataAsync();
        await app.Services.EnsureScmsDatabaseCreatedAsync(app.Configuration, app.Logger);
        app.Logger.LogInformation("Database seeding completed successfully.");
        return;
    }

    app.UseExceptionHandler();


    app.UseHttpsRedirection();


    app.UseCors("ScmsWeb");

    app.UseAuthentication();

    app.UseAuthorization();



    app.MapControllers();



    app.MapHub<QueueHub>("/hubs/queue");

    app.MapHub<NotificationsHub>("/hubs/notifications");



    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application start-up failed");
}
finally
{
    Log.CloseAndFlush();
}

using Serilog;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;
using SCMS.Domain;
using SCMS.Domain.Database;
using SCMS.Domain.Realtime;
using SCMS.Shared;

AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

try
{
    var builder = WebApplication.CreateBuilder(args);

    Log.Logger = new LoggerConfiguration()
        .MinimumLevel.Debug()
        .WriteTo.Console()
        .WriteTo.File("logs/scms_log.txt", rollingInterval: RollingInterval.Hour)
        .CreateLogger();

    //Add Serilog
    builder.Services.AddSerilog();



    builder.Services.AddControllers();
    builder.AddDomain();

    builder.Services.AddSignalR();



    builder.Services.AddCors(options =>
    {
        options.AddPolicy("ScmsWebApp", policy =>
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
                ?? "SCMS.WebApp";

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
        options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
        {
            Name = "Authorization",
            Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
            Scheme = "Bearer",
            BearerFormat = "JWT",
            In = Microsoft.OpenApi.Models.ParameterLocation.Header,
            Description = "JWT Authorization header using the Bearer scheme. Example: \"Bearer {token}\""
        });

        options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
        {
            {
                new Microsoft.OpenApi.Models.OpenApiSecurityScheme
                {
                    Reference = new Microsoft.OpenApi.Models.OpenApiReference
                    {
                        Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                        Id = "Bearer"
                    }
                },
                Array.Empty<string>()
            }
        });
    });



    var app = builder.Build();

    await app.InitializeScmsDatabaseAsync();


    if (app.Environment.IsDevelopment())
    {
        app.MapSwagger("/openapi/{documentName}.json");

        app.MapScalarApiReference(options =>
        {
            options.Authentication = new()
            {
                PreferredSecuritySchemes = ["Bearer"]
            };
        });
    }



    app.UseExceptionHandler(errorApp =>
    {
        errorApp.Run(async context =>
        {
            context.Response.StatusCode =
                StatusCodes.Status500InternalServerError;

            context.Response.ContentType =
                "application/json";

            await context.Response.WriteAsJsonAsync(
                Result.Failure(
                    "An unexpected server error occurred. Check the API logs and database connection."
                )
            );
        });
    });


    app.UseHttpsRedirection();


    app.UseCors("ScmsWebApp");

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

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
USER $APP_UID
WORKDIR /app
EXPOSE 8080
ENV ASPNETCORE_HTTP_PORTS=8080

# This stage is used to build the service project
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["SCMS.Api/SCMS.Api.csproj", "SCMS.Api/"]
COPY ["SCMS.Database/SCMS.Database.csproj", "SCMS.Database/"]
COPY ["SCMS.Domain/SCMS.Domain.csproj", "SCMS.Domain/"]
COPY ["SCMS.Shared/SCMS.Shared.csproj", "SCMS.Shared/"]
RUN dotnet restore "./SCMS.Api/SCMS.Api.csproj"
COPY . .
WORKDIR "/src/SCMS.Api"
RUN dotnet build "./SCMS.Api.csproj" -c $BUILD_CONFIGURATION -o /app/build

# This stage is used to publish the service project to be copied to the final stage
FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "./SCMS.Api.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

# This stage is used in production or when running from VS in regular mode (Default when not using the Debug configuration)
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "SCMS.Api.dll"]

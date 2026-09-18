FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY AiObservability.Api/AiObservability.Api.csproj AiObservability.Api/
RUN dotnet restore AiObservability.Api/AiObservability.Api.csproj
COPY . .
WORKDIR /src/AiObservability.Api
RUN dotnet publish -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
EXPOSE 5000
ENV ASPNETCORE_URLS=http://+:5000
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "AiObservability.Api.dll"]

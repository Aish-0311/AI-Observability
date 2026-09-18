using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AiObservability.Api.Data;

namespace AiObservability.Api.Controllers;

[ApiController]
[Route("api/dashboard")]
[Authorize]
public class DashboardController : ControllerBase
{
    [HttpGet]
    public IActionResult Get() => Ok(SeedDashboard.Get());
}

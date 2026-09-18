using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AiObservability.Api.Controllers;

[ApiController]
[Route("api")]
[AllowAnonymous]
public class HealthController : ControllerBase
{
    [HttpGet("health")]
    public IActionResult GetHealth()
    {
        return Ok(new { status = ".::Healthy::.", timestamp = DateTime.UtcNow.ToString("o") });
    }
}

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AiObservability.Api.Data;

namespace AiObservability.Api.Controllers;

[ApiController]
[Route("api/costs")]
[Authorize]
public class CostsController : ControllerBase
{
    [HttpGet]
    public IActionResult Get() => Ok(SeedCosts.Get());
}

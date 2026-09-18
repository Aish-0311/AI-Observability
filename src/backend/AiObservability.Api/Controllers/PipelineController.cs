using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AiObservability.Api.Data;

namespace AiObservability.Api.Controllers;

[ApiController]
[Route("api/pipeline")]
[Authorize]
public class PipelineController : ControllerBase
{
    [HttpGet("runs")]
    public IActionResult GetAll() => Ok(SeedPipeline.Get());

    [HttpGet("runs/{runId}")]
    public IActionResult GetById(string runId)
    {
        var run = SeedPipeline.Get().FirstOrDefault(r => r.RunId == runId);
        if (run is null)
            return NotFound(new { message = $"Pipeline run '{runId}' not found" });
        return Ok(run);
    }
}

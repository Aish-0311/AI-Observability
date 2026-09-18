using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AiObservability.Api.Data;

namespace AiObservability.Api.Controllers;

[ApiController]
[Route("api/knowledge")]
[Authorize]
public class KnowledgeController : ControllerBase
{
    [HttpGet("runbooks")]
    public IActionResult GetRunbooks([FromQuery] string? q)
    {
        var runbooks = SeedRunbooks.Get();

        if (!string.IsNullOrWhiteSpace(q))
        {
            var query = q.ToLowerInvariant();
            runbooks = runbooks.Where(r =>
                r.Title.Contains(query, StringComparison.OrdinalIgnoreCase) ||
                r.Summary.Contains(query, StringComparison.OrdinalIgnoreCase) ||
                r.Category.Contains(query, StringComparison.OrdinalIgnoreCase)
            ).ToList();
        }

        return Ok(runbooks);
    }
}

using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AiObservability.Api.Models;

namespace AiObservability.Api.Controllers;

[ApiController]
[Route("api")]
public class AuthController : ControllerBase
{
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (request.Password != "ClusterReply2026!")
            return Unauthorized(new { message = "Invalid credentials" });

        var email = request.Email ?? "cluster@reply.de";
        var nameParts = email.Split('@')[0].Split('.');
        var name = string.Join(' ', nameParts.Select(p =>
            string.IsNullOrEmpty(p) ? p : char.ToUpper(p[0]) + p[1..]));
        var role = "sre";

        var claims = new List<Claim>
        {
            new(ClaimTypes.Email, email),
            new(ClaimTypes.Name, name),
            new(ClaimTypes.Role, role),
        };

        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        var principal = new ClaimsPrincipal(identity);

        await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, principal);

        return Ok(new UserInfo(email, name, role));
    }

    [HttpPost("logout")]
    [AllowAnonymous]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent();
    }
}

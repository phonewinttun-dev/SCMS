using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SCMS.Domain.Security;
using SCMS.Shared;
using SCMS.Shared.Contracts.Auth;

namespace SCMS.Domain.Features.Auth
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        [AllowAnonymous]
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            var result = await _authService.RegisterAsync(request);
            return result.IsSuccess ? Ok(result) : BadRequest(result);
        }

        [AllowAnonymous]
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var result = await _authService.LoginAsync(request);
            return result.IsSuccess ? Ok(result) : Unauthorized(result);
        }

        //[AllowAnonymous]
        //[HttpPost("refresh")]
        //public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequest request)
        //{
        //    var result = await _authService.RefreshAsync(request);
        //    return result.IsSuccess ? Ok(result) : Unauthorized(result);
        //}

        //[Authorize]
        //[HttpPost("logout")]
        //public async Task<IActionResult> Logout([FromBody] RefreshTokenRequest request)
        //{
        //    var result = await _authService.LogoutAsync(request.RefreshToken);
        //    return Ok(result);
        //}
        // don't need to consdier the logout . frontend will just delete the token from local storage and the backend will handle the expired token when it comes in with a request.

    }
}

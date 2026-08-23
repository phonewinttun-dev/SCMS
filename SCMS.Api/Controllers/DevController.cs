using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Hosting;
using SCMS.Domain.Features.Dev;
using SCMS.Shared;

namespace SCMS.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [AllowAnonymous]
    [Produces("application/json")]
    public class DevController : ControllerBase
    {
        private readonly MassDatabaseSeeder _seeder;
        private readonly IWebHostEnvironment _env;
        private readonly Microsoft.Extensions.Configuration.IConfiguration _configuration;

        public DevController(MassDatabaseSeeder seeder, IWebHostEnvironment env, Microsoft.Extensions.Configuration.IConfiguration configuration)
        {
            _seeder = seeder;
            _env = env;
            _configuration = configuration;
        }

        /// <summary>Development endpoint to populate 1 year of realistic clinical data (Dev or Demo mode).</summary>
        [HttpPost("seed-1year")]
        [ProducesResponseType(typeof(Result<string>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(Result), StatusCodes.Status403Forbidden)]
        public async Task<IActionResult> Seed1Year()
        {
            var allowSeeding = _env.IsDevelopment() || _configuration.GetValue("Database:AllowDemoSeeding", false);
            if (!allowSeeding)
            {
                return StatusCode(StatusCodes.Status403Forbidden, Result.Failure("Seeding is only permitted in development or demo mode."));
            }

            await _seeder.Seed1YearDataAsync();
            return Ok(Result<string>.Success("Seeded 1 year of clinical data successfully."));
        }
    }
}

using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SCMS.Domain.Features.Dev;
using SCMS.Domain.Tests.TestSupport;
using Xunit;

namespace SCMS.Domain.Tests.Dev
{
    public class MassDatabaseSeederTests
    {
        [Fact]
        public async Task Seed1YearDataAsync_SeedsAllDemoAccountsAndPermissions()
        {
            using var db = new TestDatabase();
            var seeder = new MassDatabaseSeeder(db.Context);

            await seeder.Seed1YearDataAsync();

            // Verify demo accounts
            var admin = await db.Context.TblUsers
                .Include(u => u.TblUserRoles)
                .FirstOrDefaultAsync(u => u.Email == "admin@scms.demo");
            Assert.NotNull(admin);
            Assert.Contains("owner", admin.TblUserRoles.Select(r => r.Role.ToLowerInvariant()));

            var doctor = await db.Context.TblUsers
                .Include(u => u.TblUserRoles)
                .FirstOrDefaultAsync(u => u.Email == "doctor@scms.demo");
            Assert.NotNull(doctor);
            Assert.Contains("doctor", doctor.TblUserRoles.Select(r => r.Role.ToLowerInvariant()));

            var patient = await db.Context.TblUsers
                .Include(u => u.TblUserRoles)
                .FirstOrDefaultAsync(u => u.Email == "user@scms.demo");
            Assert.NotNull(patient);
            Assert.Contains("user", patient.TblUserRoles.Select(r => r.Role.ToLowerInvariant()));

            // Verify patient profile
            var patientProfile = await db.Context.TblPatients
                .FirstOrDefaultAsync(p => p.UserId == patient.UserId && p.Name == "SCMS Patient");
            Assert.NotNull(patientProfile);

            // Verify system permissions & role permissions exist
            var permissionsCount = await db.Context.TblPermissions.CountAsync();
            Assert.True(permissionsCount > 0, "tbl_permission should contain permissions");

            var rolePermissionsCount = await db.Context.TblRolePermissions.CountAsync();
            Assert.True(rolePermissionsCount > 0, "tbl_role_permission should contain role permissions");

            // Verify doctor role has permissions
            var doctorRole = await db.Context.TblUserRoles.FirstOrDefaultAsync(r => r.Role == "doctor");
            Assert.NotNull(doctorRole);
            var doctorPerms = await db.Context.TblRolePermissions
                .Where(rp => rp.RoleId == doctorRole.Id)
                .ToListAsync();
            Assert.NotEmpty(doctorPerms);
        }
    }
}

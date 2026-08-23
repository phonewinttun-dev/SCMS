using System;
using Xunit;
using SCMS.Domain.Common;

namespace SCMS.Domain.Tests.Mcp
{
    public class ClinicClockTests
    {
        [Fact]
        public void DefaultTimeZone_IsAheadOfUtc()
        {
            // The clinic runs on Asia/Yangon (UTC+6:30). If this ever resolves to UTC,
            // "today" and every bare time in the MCP tools silently shift by 6.5 hours.
            var offset = ClinicClock.TimeZone.GetUtcOffset(DateTime.UtcNow);

            Assert.Equal(TimeSpan.FromMinutes(390), offset);
        }

        [Fact]
        public void ToUtc_AndBack_RoundTrips()
        {
            var clinicLocal = new DateTime(2026, 6, 24, 8, 30, 0);

            var utc = ClinicClock.ToUtc(clinicLocal);
            var back = ClinicClock.ToClinic(utc);

            Assert.Equal(clinicLocal, back);
        }

        [Fact]
        public void ToUtc_ShiftsAClinicMorningBackwardsIntoThepreviousUtcDay()
        {
            // 08:30 in Yangon is 02:00 UTC the same day; 02:00 in Yangon is 19:30 UTC the day before.
            Assert.Equal(new DateTime(2026, 6, 24, 2, 0, 0, DateTimeKind.Utc),
                ClinicClock.ToUtc(new DateTime(2026, 6, 24, 8, 30, 0)));

            Assert.Equal(new DateTime(2026, 6, 23, 19, 30, 0, DateTimeKind.Utc),
                ClinicClock.ToUtc(new DateTime(2026, 6, 24, 2, 0, 0)));
        }

        [Fact]
        public void DayBoundsUtc_SpanExactlyOneDay()
        {
            var (start, end) = ClinicClock.DayBoundsUtc(new DateTime(2026, 6, 24));

            Assert.Equal(TimeSpan.FromDays(1), end - start);
            Assert.Equal(new DateTime(2026, 6, 24, 0, 0, 0), ClinicClock.ToClinic(start));
        }

        [Fact]
        public void TodayBoundsUtc_ContainsTheCurrentInstant()
        {
            var (start, end) = ClinicClock.TodayBoundsUtc();
            var now = DateTime.UtcNow;

            Assert.True(start <= now, "clinic day starts before now");
            Assert.True(end > now, "clinic day ends after now");
        }
    }
}

using System;

namespace SCMS.Domain.Common
{
    /// <summary>
    /// Single source of truth for "what time is it at the clinic".
    ///
    /// The database stores UTC. Everything a human sees or types - "today's
    /// appointments", "reschedule to 08:30" - is expressed in clinic local time.
    /// Converting at the boundary here keeps those two worlds from being mixed up.
    /// </summary>
    public static class ClinicClock
    {
        private const string DefaultTimeZoneId = "Asia/Yangon";

        // Fallback used when the host has no tz database entry for the configured id.
        private static readonly TimeSpan DefaultFallbackOffset = new(6, 30, 0);

        private static TimeZoneInfo _timeZone = Resolve(DefaultTimeZoneId);

        public static TimeZoneInfo TimeZone => _timeZone;

        /// <summary>Configure the clinic time zone at startup. Falls back to the default on an unknown id.</summary>
        public static void Configure(string? timeZoneId)
        {
            _timeZone = Resolve(string.IsNullOrWhiteSpace(timeZoneId) ? DefaultTimeZoneId : timeZoneId!);
        }

        private static TimeZoneInfo Resolve(string timeZoneId)
        {
            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
            }
            catch (Exception)
            {
                // Hosts without the IANA tz database (some minimal containers) still need
                // the clinic offset to be right, so synthesise it rather than silently using UTC.
                return TimeZoneInfo.CreateCustomTimeZone(
                    "SCMS-Clinic",
                    DefaultFallbackOffset,
                    "SCMS Clinic Time",
                    "SCMS Clinic Time");
            }
        }

        /// <summary>Current clinic-local time.</summary>
        public static DateTime Now => TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, _timeZone);

        /// <summary>Clinic-local calendar date for right now.</summary>
        public static DateTime Today => Now.Date;

        /// <summary>Clinic-local calendar date as a DateOnly (for expiry-date comparisons).</summary>
        public static DateOnly TodayDateOnly => DateOnly.FromDateTime(Today);

        /// <summary>Convert a UTC instant from the database into clinic-local time for display.</summary>
        public static DateTime ToClinic(DateTime utc)
        {
            var asUtc = utc.Kind == DateTimeKind.Utc
                ? utc
                : DateTime.SpecifyKind(utc, DateTimeKind.Utc);
            return TimeZoneInfo.ConvertTimeFromUtc(asUtc, _timeZone);
        }

        /// <summary>Convert a clinic-local wall-clock time into the UTC instant to store or query with.</summary>
        public static DateTime ToUtc(DateTime clinicLocal)
        {
            var unspecified = DateTime.SpecifyKind(clinicLocal, DateTimeKind.Unspecified);

            // Ambiguous/invalid local times only occur under DST; Yangon has none, but a
            // differently configured clinic might, so resolve them deterministically.
            if (_timeZone.IsInvalidTime(unspecified))
            {
                unspecified = unspecified.AddHours(1);
            }

            return TimeZoneInfo.ConvertTimeToUtc(unspecified, _timeZone);
        }

        /// <summary>Start (inclusive) and end (exclusive) UTC bounds of a clinic-local calendar day.</summary>
        public static (DateTime StartUtc, DateTime EndUtc) DayBoundsUtc(DateTime clinicLocalDate)
        {
            var start = ToUtc(clinicLocalDate.Date);
            var end = ToUtc(clinicLocalDate.Date.AddDays(1));
            return (start, end);
        }

        /// <summary>Start (inclusive) and end (exclusive) UTC bounds of the clinic's today.</summary>
        public static (DateTime StartUtc, DateTime EndUtc) TodayBoundsUtc() => DayBoundsUtc(Today);
    }
}

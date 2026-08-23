using System;

namespace SCMS.Domain.Common
{
    /// <summary>
    /// Canonical display formats for SCMS. Every user-facing date in the API, PDFs,
    /// notifications and AI replies goes through these so the system never shows
    /// two different date shapes for the same value.
    /// </summary>
    public static class FormatHelper
    {
        /// <summary>Date only: 24/06/2026</summary>
        public const string DateFormat = "dd/MM/yyyy";

        /// <summary>Time only, 24-hour: 14:30</summary>
        public const string TimeFormat = "HH:mm";

        /// <summary>Date and time: 24/06/2026 14:30</summary>
        public const string DateTimeFormat = DateFormat + " " + TimeFormat;

        /// <summary>Day-of-week prefixed date: Wednesday, 24/06/2026</summary>
        public const string DayDateFormat = "dddd, " + DateFormat;

        private static readonly System.Globalization.CultureInfo Culture =
            System.Globalization.CultureInfo.InvariantCulture;

        public static string ToDisplayDate(this DateTime value) => value.ToString(DateFormat, Culture);

        public static string ToDisplayDate(this DateOnly value) => value.ToString(DateFormat, Culture);

        public static string ToDisplayTime(this DateTime value) => value.ToString(TimeFormat, Culture);

        public static string ToDisplayDateTime(this DateTime value) => value.ToString(DateTimeFormat, Culture);
    }
}

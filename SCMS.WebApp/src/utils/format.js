/**
 * Standard date & time formatting utilities for SCMS.
 * Enforces "dd-MM-yyyy" and 12-hour AM/PM format across all UI components and reports.
 */

const SEP = "-";

/** Two-digit pad. */
const pad = (n) => String(n).padStart(2, "0");

/**
 * Format any date value into "dd-MM-yyyy".
 * Handles ISO strings ("2026-08-20", "2026-08-20T14:30:00Z"), Date objects, and timestamps.
 * Returns "-" for null or invalid inputs.
 */
export function formatDate(val) {
  if (!val) return "-";

  if (typeof val === "object") {
    if (val instanceof Date) {
      if (isNaN(val.getTime())) return "-";
      return `${pad(val.getDate())}${SEP}${pad(val.getMonth() + 1)}${SEP}${val.getFullYear()}`;
    }
    if ("target" in val && typeof val.target?.value === "string") {
      val = val.target.value;
    } else {
      return "-";
    }
  }

  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed || trimmed === "[object Object]") return "-";

    const datePart = trimmed.includes("T")
      ? trimmed.split("T")[0]
      : trimmed.includes(" ")
      ? trimmed.split(" ")[0]
      : trimmed;

    // ISO "yyyy-MM-dd" straight from the API.
    const iso = datePart.split("-");
    if (iso.length === 3 && iso[0].length === 4) {
      const [y, m, d] = iso;
      return `${pad(d.slice(0, 2))}${SEP}${pad(m)}${SEP}${y}`;
    }

    // Already "dd-MM-yyyy" or "dd/MM/yyyy"
    const dmySlash = datePart.split("/");
    if (dmySlash.length === 3 && dmySlash[2].length === 4) {
      return `${pad(dmySlash[0])}${SEP}${pad(dmySlash[1])}${SEP}${dmySlash[2]}`;
    }

    if (iso.length === 3 && iso[2].length === 4) {
      return `${pad(iso[0])}${SEP}${pad(iso[1])}${SEP}${iso[2]}`;
    }
  }

  const d = new Date(val);
  if (isNaN(d.getTime())) return typeof val === "string" ? val : "-";

  return `${pad(d.getDate())}${SEP}${pad(d.getMonth() + 1)}${SEP}${d.getFullYear()}`;
}

/**
 * Format any date/time value into "dd-MM-yyyy hh:mm AM/PM".
 */
export function formatDateTime(val) {
  if (!val) return "-";

  const d = new Date(val);
  if (isNaN(d.getTime())) {
    return formatDate(val);
  }

  return `${formatDate(d)} ${formatTime(d)}`;
}

/**
 * Format time only into 12-hour "hh:mm AM/PM" format.
 */
export function formatTime(val) {
  if (!val) return "-";
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);
  let hours = d.getHours();
  const minutes = pad(d.getMinutes());
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 becomes 12
  return `${pad(hours)}:${minutes} ${ampm}`;
}

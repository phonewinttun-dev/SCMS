/**
 * Standard date & time formatting utilities for SCMS.
 * Enforces "dd/MM/yyyy" across all UI components and reports.
 */

const SEP = "/";

/** Two-digit pad. */
const pad = (n) => String(n).padStart(2, "0");

/**
 * Format any date value into "dd/MM/yyyy".
 * Handles ISO strings ("2026-08-20", "2026-08-20T14:30:00Z"), Date objects, and timestamps.
 * Returns "-" for null or invalid inputs.
 */
export function formatDate(val) {
  if (!val) return "-";

  if (typeof val === "string") {
    const trimmed = val.trim();
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

    // Already "dd/MM/yyyy" - the backend's canonical shape, pass it through.
    const dmySlash = datePart.split("/");
    if (dmySlash.length === 3 && dmySlash[2].length === 4) {
      return datePart;
    }

    // Legacy "dd-MM-yyyy" from older payloads; normalise the separator.
    if (iso.length === 3 && iso[2].length === 4) {
      return iso.join(SEP);
    }
  }

  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);

  return `${pad(d.getDate())}${SEP}${pad(d.getMonth() + 1)}${SEP}${d.getFullYear()}`;
}

/**
 * Format any date/time value into "dd/MM/yyyy HH:mm".
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
 * Format time only into 24-hour "HH:mm".
 */
export function formatTime(val) {
  if (!val) return "-";
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

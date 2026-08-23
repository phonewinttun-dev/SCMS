import { useState } from "react";
import { CheckCircledIcon, CrossCircledIcon, CodeIcon, InfoCircledIcon } from "@radix-ui/react-icons";
import StatusBadge from "../StatusBadge";
import { humanizeKey } from "../../utils/mcpToolCatalog";

const STATUS_KEYS = new Set(["status", "newStatus", "stockHealthStatus"]);

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

const pickHeading = (item) => {
  const headingKeys = ["patientName", "medicineName", "name", "title", "diseaseName", "recommendation"];
  for (const k of headingKeys) {
    if (item[k]) return item[k];
  }
  return null;
};

function FieldRow({ fieldKey, value, language }) {
  if (value === null || value === undefined || value === "") return null;

  if (STATUS_KEYS.has(fieldKey) && typeof value === "string") {
    return (
      <div className="flex items-center justify-between gap-3 py-1">
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {humanizeKey(fieldKey, language)}
        </span>
        <StatusBadge value={value} />
      </div>
    );
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    return (
      <div className="py-1">
        <span className="block text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
          {humanizeKey(fieldKey, language)}
        </span>
        <div className="space-y-1.5">
          {value.map((v, i) =>
            isPlainObject(v) ? (
              <ResultCard key={i} item={v} language={language} compact />
            ) : (
              <div
                key={i}
                className="rounded-lg bg-secondary/60 border border-border/60 px-2.5 py-1 text-xs font-semibold text-foreground"
              >
                {String(v)}
              </div>
            )
          )}
        </div>
      </div>
    );
  }

  if (isPlainObject(value)) {
    return (
      <div className="py-1">
        <span className="block text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
          {humanizeKey(fieldKey, language)}
        </span>
        <ResultCard item={value} language={language} compact />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {humanizeKey(fieldKey, language)}
      </span>
      <span className="text-xs font-bold text-foreground text-right">{String(value)}</span>
    </div>
  );
}

function ResultCard({ item, language, compact = false, skipKeys = [] }) {
  const heading = pickHeading(item);
  const entries = Object.entries(item).filter(([k]) => !skipKeys.includes(k) && k !== "message" && !(heading && item[k] === heading));

  return (
    <div
      className={`rounded-2xl border border-border/70 bg-secondary/40 ${
        compact ? "p-2.5" : "p-3.5"
      }`}
    >
      {heading && (
        <div className="text-xs font-extrabold text-foreground mb-1">{heading}</div>
      )}
      <div className="divide-y divide-border/50">
        {entries.map(([k, v]) => (
          <FieldRow key={k} fieldKey={k} value={v} language={language} />
        ))}
      </div>
    </div>
  );
}

function EmptyResult({ language }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-secondary/40 px-3 py-2.5 text-xs font-semibold text-muted-foreground">
      <InfoCircledIcon className="w-4 h-4 shrink-0" />
      {language === "mm" ? "ရလဒ်မတွေ့ရှိပါ။" : "No results found."}
    </div>
  );
}

/**
 * Renders an MCP tool response in plain language instead of a raw JSON dump.
 * Always keeps a "View raw JSON" escape hatch for power users / debugging.
 */
export default function ToolResultView({ rawText, isError, language = "en" }) {
  const [showRaw, setShowRaw] = useState(false);

  let parsed = null;
  let parseFailed = false;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    parseFailed = true;
  }

  const renderBody = () => {
    if (parseFailed) {
      return <div className="whitespace-pre-wrap text-xs font-semibold text-foreground">{rawText}</div>;
    }

    if (isError) {
      const message =
        (isPlainObject(parsed) && (parsed.message || parsed.error)) || rawText;
      return (
        <div className="flex items-start gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 px-3 py-2.5">
          <CrossCircledIcon className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
          <span className="text-xs font-bold text-rose-700 dark:text-rose-300 leading-relaxed">{message}</span>
        </div>
      );
    }

    if (Array.isArray(parsed)) {
      if (parsed.length === 0) return <EmptyResult language={language} />;
      if (!isPlainObject(parsed[0])) {
        return (
          <ul className="list-disc pl-5 space-y-1">
            {parsed.map((v, i) => (
              <li key={i} className="text-xs font-semibold text-foreground">
                {String(v)}
              </li>
            ))}
          </ul>
        );
      }
      return (
        <div className="space-y-2">
          {parsed.map((item, i) => (
            <ResultCard key={i} item={item} language={language} />
          ))}
        </div>
      );
    }

    if (isPlainObject(parsed)) {
      if (parsed.ambiguity) {
        return (
          <div className="space-y-2">
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 px-3 py-2.5">
              <InfoCircledIcon className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300 leading-relaxed">
                {parsed.message}
              </span>
            </div>
            {Array.isArray(parsed.appointments) &&
              parsed.appointments.map((a, i) => <ResultCard key={i} item={a} language={language} />)}
          </div>
        );
      }

      const hasBanner = typeof parsed.message === "string";
      const remainingEntries = Object.entries(parsed).filter(
        ([k]) => k !== "message" && k !== "success"
      );
      const isEmptyResult =
        hasBanner &&
        remainingEntries.every(([, v]) => v === null || v === undefined || v === "" || v === 0);

      return (
        <div className="space-y-2.5">
          {hasBanner && (
            <div
              className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 ${
                parsed.success === false
                  ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900"
                  : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900"
              }`}
            >
              {parsed.success === false ? (
                <CrossCircledIcon className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              ) : (
                <CheckCircledIcon className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              )}
              <span
                className={`text-xs font-bold leading-relaxed ${
                  parsed.success === false
                    ? "text-rose-700 dark:text-rose-300"
                    : "text-emerald-700 dark:text-emerald-300"
                }`}
              >
                {parsed.message}
              </span>
            </div>
          )}

          {!isEmptyResult && remainingEntries.length > 0 && (
            <ResultCard item={Object.fromEntries(remainingEntries)} language={language} skipKeys={["success"]} />
          )}
        </div>
      );
    }

    return <div className="whitespace-pre-wrap text-xs font-semibold text-foreground">{rawText}</div>;
  };

  return (
    <div className="space-y-2">
      {renderBody()}
      <button
        type="button"
        onClick={() => setShowRaw((v) => !v)}
        className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground hover:text-foreground transition btn-target"
      >
        <CodeIcon className="w-3 h-3" />
        {showRaw
          ? language === "mm"
            ? "Raw JSON ဖျောက်ရန်"
            : "Hide raw JSON"
          : language === "mm"
          ? "Raw JSON ကြည့်ရန်"
          : "View raw JSON"}
      </button>
      {showRaw && (
        <pre className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3 text-[11px] font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap max-h-[200px] overflow-auto">
          {rawText}
        </pre>
      )}
    </div>
  );
}

import { PlusIcon, TrashIcon } from "@radix-ui/react-icons";
import { humanizeKey } from "../../utils/mcpToolCatalog";

/**
 * Repeatable row editor for a JSON-schema array-of-object property (e.g. the
 * prescription template `items` list), instead of asking a non-technical
 * user to hand-write a JSON array in a textarea.
 */
export default function ArrayObjectField({ itemSchema, value, onChange, language = "en" }) {
  const properties = itemSchema?.properties || {};
  const required = itemSchema?.required || [];
  const rows = Array.isArray(value) ? value : [];

  const emptyRow = () => {
    const row = {};
    Object.keys(properties).forEach((k) => {
      row[k] = "";
    });
    return row;
  };

  const addRow = () => onChange([...rows, emptyRow()]);
  const removeRow = (idx) => onChange(rows.filter((_, i) => i !== idx));
  const updateRow = (idx, key, val) =>
    onChange(rows.map((r, i) => (i === idx ? { ...r, [key]: val } : r)));

  return (
    <div className="space-y-2.5">
      {rows.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/70 px-3 py-3 text-center text-[11px] font-semibold text-muted-foreground">
          {language === "mm" ? "မည်သည့်အချက်အလက်မှ မရှိသေးပါ" : "No items added yet"}
        </div>
      )}

      {rows.map((row, idx) => (
        <div key={idx} className="rounded-xl border border-border/70 bg-secondary/40 p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">
              {language === "mm" ? `အချက် ${idx + 1}` : `Item ${idx + 1}`}
            </span>
            <button
              type="button"
              onClick={() => removeRow(idx)}
              className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition btn-target"
              title={language === "mm" ? "ဖျက်ရန်" : "Remove"}
            >
              <TrashIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {Object.entries(properties).map(([k, prop]) => {
              const isReq = required.includes(k);
              const isNumeric = prop.type === "integer" || prop.type === "number";
              return (
                <label key={k} className="block text-xs col-span-1">
                  <span className="block text-[10px] font-bold text-muted-foreground mb-1">
                    {humanizeKey(k, language)}
                    {isReq && <span className="text-rose-500 ml-0.5">*</span>}
                  </span>
                  <input
                    type={isNumeric ? "number" : "text"}
                    className="scms-input w-full text-xs h-8"
                    value={row[k] ?? ""}
                    onChange={(e) => updateRow(idx, k, e.target.value)}
                  />
                </label>
              );
            })}
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addRow}
        className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-orange-300 dark:border-orange-900 text-orange-600 dark:text-orange-400 py-2 text-xs font-bold hover:bg-orange-50 dark:hover:bg-orange-950/30 transition btn-target"
      >
        <PlusIcon className="w-3.5 h-3.5" />
        {language === "mm" ? "အချက်အလက်ထပ်ထည့်ရန်" : "Add item"}
      </button>
    </div>
  );
}

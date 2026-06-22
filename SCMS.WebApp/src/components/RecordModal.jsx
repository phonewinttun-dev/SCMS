import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { useLanguage } from "../context/LanguageContext";

export default function RecordModal({ title, fields, form, onChange, onClose, onSubmit, loading }) {
  const { t } = useLanguage();

  return createPortal(
    <div className="modal modal-open">
      <div className="modal-box max-w-3xl rounded-[18px] border border-scms-border bg-white p-0 shadow-scms-modal">
        <div className="flex items-center justify-between border-b border-scms-border px-6 py-5">
          <h2 className="text-xl font-black text-scms-text">{title}</h2>
          <button className="btn btn-ghost btn-sm btn-square" onClick={onClose} aria-label={t.close}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6">
          <div className="grid gap-4 md:grid-cols-2">
            {fields.map((field) => (
              <label key={field.name} className={field.type === "textarea" ? "md:col-span-2" : ""}>
                <span className="mb-2 block text-xs font-extrabold text-scms-text">{field.label}</span>
                {field.type === "textarea" ? (
                  <textarea
                    className="scms-textarea w-full"
                    value={form[field.name] || ""}
                    onChange={(event) => onChange(field.name, event.target.value)}
                    placeholder={field.placeholder || field.label}
                    required={field.required}
                  />
                ) : field.type === "select" ? (
                  <select
                    className="scms-select w-full"
                    value={form[field.name] || ""}
                    onChange={(event) => onChange(field.name, event.target.value)}
                    required={field.required}
                  >
                    <option value="">{field.placeholder || field.label}</option>
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="scms-input w-full"
                    type={field.type || "text"}
                    value={form[field.name] || ""}
                    onChange={(event) => onChange(field.name, event.target.value)}
                    placeholder={field.placeholder || field.label}
                    required={field.required}
                  />
                )}
              </label>
            ))}
          </div>

          <div className="modal-action mt-6">
            <button type="button" className="scms-btn-outline" onClick={onClose}>
              {t.cancel}
            </button>
            <button type="submit" className="scms-btn-primary" disabled={loading}>
              {loading && <span className="loading loading-spinner loading-sm" />}
              {t.save}
            </button>
          </div>
        </form>
      </div>
      <button
        className="modal-backdrop bg-[rgba(15,23,42,0.45)]"
        aria-label={t.close}
        onClick={onClose}
      >
      </button>
    </div>,
    document.body
  );
}

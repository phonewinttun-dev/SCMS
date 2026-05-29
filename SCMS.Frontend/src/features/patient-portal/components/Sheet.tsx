import type { ReactNode } from "react";
import { Icon } from "./Icons";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Sheet({ open, onClose, title, children }: SheetProps) {
  if (!open) return null;

  return (
    <div className="sheet-overlay" onClick={onClose} role="presentation">
      <div
        className="sheet-body"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
        aria-label={title}
      >
        <div className="sheet-handle-wrap">
          <div className="sheet-handle" />
        </div>
        <div className="sheet-header">
          <h2 className="sheet-title">{title}</h2>
          <button type="button" className="sheet-close" onClick={onClose} aria-label="ပိတ်မည်">
            <Icon name="x" size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

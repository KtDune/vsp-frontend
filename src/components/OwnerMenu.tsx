import { useState } from "react";
import { EllipsisVertical } from "lucide-react";

export type OwnerMenuItem = {
  label: string;
  busy?: boolean;
  busyLabel?: string;
  danger?: boolean;
  disabled?: boolean;
  onClick: (close: () => void) => void;
};

export default function OwnerMenu({ label, items }: { label: string; items: OwnerMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  if (items.length === 0) return null;

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={label}
        className="cursor-pointer rounded-full p-1 text-text-dim transition hover:bg-surface-hover hover:text-text"
      >
        <EllipsisVertical className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10 cursor-default" onClick={close} />
          <div className="absolute right-0 top-7 z-20 w-32 rounded-lg border border-border bg-bg py-1 shadow-lg">
            {items.map((item) => (
              <button
                key={item.label}
                onClick={() => item.onClick(close)}
                disabled={item.disabled || item.busy}
                className={`block w-full cursor-pointer px-3 py-1.5 text-left text-sm font-medium hover:bg-surface-hover disabled:opacity-50 ${
                  item.danger ? "text-red-400" : ""
                }`}
              >
                {item.busy ? (item.busyLabel ?? item.label) : item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

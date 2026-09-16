import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "./button";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

function Overlay({
  open,
  onClose,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-slate-900/45" aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative z-[101] w-full ${wide ? "max-w-lg" : "max-w-md"} max-h-[min(88svh,720px)] overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  danger,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Overlay open={open} onClose={onClose}>
      <div className="p-5">
        <h3 className="font-serif text-lg font-semibold text-navy">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={danger ? "danger" : "default"} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Overlay>
  );
}

export function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <Overlay open={open} onClose={onClose} wide>
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-3">
        <h3 className="font-serif text-lg font-semibold text-navy">{title}</h3>
        <button
          type="button"
          className="rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 hover:text-navy"
          onClick={onClose}
          aria-label="Close"
        >
          Close
        </button>
      </div>
      <div className="p-5">{children}</div>
    </Overlay>
  );
}

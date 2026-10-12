import { Maximize2, Minimize2, Minus, Trash2, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Button } from "../Button";

export type ModalSize = "small" | "medium" | "large";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Footer actions (right-aligned), e.g. Cancel / Save Buttons. */
  footer?: ReactNode;
  /** FDS-101 Form Modal widths 400 / 560 / 720. */
  size?: ModalSize;
  /**
   * FDS-101 Form Modal `Show Window Actions` (minimize / maximize). Behaviour while minimized is
   * an open design question (DCF-0001 Q25): here it docks as a non-modal title bar.
   */
  windowActions?: boolean;
  /** Close button label. */
  closeLabel?: string;
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** FDS-101 Modal (388:2275) / Form Modal (358:352). Focus-trapped dialog; Escape closes. */
export function Modal({ open, onClose, title, children, footer, size = "medium", windowActions, closeLabel = "Close" }: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const inBody = FOCUSABLE.split(",").map((s) => `.fx-modal__body ${s}`).join(",");
    const first = panel?.querySelector<HTMLElement>(inBody) ?? panel?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();
    return () => {
      setMinimized(false);
      setMaximized(false);
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab" || minimized) return;
    const nodes = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (!first || !last) return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  const panel = (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal={!minimized}
      aria-labelledby={titleId}
      className={["fx-modal", `fx-modal--${size}`, maximized && "fx-modal--maximized", minimized && "fx-modal--minimized"].filter(Boolean).join(" ")}
      onKeyDown={onKeyDown}
    >
      <div className="fx-modal__header">
        <h2 id={titleId} className="fx-modal__title">{title}</h2>
        <div className="fx-modal__window">
          {windowActions && (
            <>
              <button type="button" className="fx-modal__win-btn" aria-label={minimized ? "Restore" : "Minimize"} onClick={() => setMinimized((m) => !m)}>
                <Minus aria-hidden="true" />
              </button>
              {!minimized && (
                <button type="button" className="fx-modal__win-btn" aria-label={maximized ? "Exit full size" : "Full size"} aria-pressed={maximized} onClick={() => setMaximized((m) => !m)}>
                  {maximized ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}
                </button>
              )}
            </>
          )}
          <button type="button" className="fx-modal__win-btn" aria-label={closeLabel} onClick={onClose}>
            <X aria-hidden="true" />
          </button>
        </div>
      </div>
      {!minimized && (
        <>
          <div className="fx-modal__body">{children}</div>
          {footer && <div className="fx-modal__footer">{footer}</div>}
        </>
      )}
    </div>
  );

  return minimized ? panel : <div className="fx-modal__overlay">{panel}</div>;
}

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** FDS-101 Modal `Type=Delete`: destructive confirm and trash icon. */
  destructive?: boolean;
  busy?: boolean;
}

/** FDS-101 Modal Type=Confirm / Delete (388:2275). Cancel is focused first. */
export function ConfirmDialog({ open, title, message, confirmLabel, cancelLabel = "Cancel", onConfirm, onCancel, destructive, busy }: ConfirmDialogProps) {
  const titleId = useId();
  const descId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    return () => previous?.focus?.();
  }, [open]);
  if (!open) return null;
  return (
    <div className="fx-modal__overlay">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="fx-modal fx-modal--confirm"
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel();
          if (e.key === "Tab") {
            const nodes = Array.from(e.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE));
            const [first, last] = [nodes[0], nodes[nodes.length - 1]];
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last?.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <div className="fx-modal__confirm-content">
          {destructive && (
            <span className="fx-modal__confirm-icon" aria-hidden="true">
              <Trash2 />
            </span>
          )}
          <div>
            <h2 id={titleId} className="fx-modal__title">{title}</h2>
            <div id={descId} className="fx-modal__message">{message}</div>
          </div>
        </div>
        <div className="fx-modal__footer">
          <Button ref={cancelRef} variant="secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant={destructive ? "destructive" : "primary"} onClick={onConfirm} loading={busy}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

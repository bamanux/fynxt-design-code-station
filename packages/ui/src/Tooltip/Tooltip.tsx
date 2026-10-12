import { cloneElement, useEffect, useId, useState, type ReactElement, type SyntheticEvent } from "react";

export interface TooltipProps {
  /** Tooltip text. Keep it short; it is read as the trigger's description. */
  content: string;
  /** A single focusable element (e.g. an IconButton). Receives `aria-describedby`. */
  children: ReactElement;
  placement?: "top" | "bottom";
}

type TriggerProps = {
  "aria-describedby"?: string;
  onMouseEnter?: (e: SyntheticEvent) => void;
  onMouseLeave?: (e: SyntheticEvent) => void;
  onFocus?: (e: SyntheticEvent) => void;
  onBlur?: (e: SyntheticEvent) => void;
};

/** FDS-101 Tooltip (node 66:39). Shows on hover and keyboard focus; Escape dismisses. */
export function Tooltip({ content, children, placement = "top" }: TooltipProps) {
  const id = useId();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const child = children as ReactElement<TriggerProps>;
  const chain = (own: ((e: SyntheticEvent) => void) | undefined, next: boolean) => (e: SyntheticEvent) => {
    own?.(e);
    setOpen(next);
  };
  const describedBy = [child.props["aria-describedby"], id].filter(Boolean).join(" ");

  return (
    <span className="fx-tooltip">
      {cloneElement(child, {
        "aria-describedby": describedBy,
        onMouseEnter: chain(child.props.onMouseEnter, true),
        onMouseLeave: chain(child.props.onMouseLeave, false),
        onFocus: chain(child.props.onFocus, true),
        onBlur: chain(child.props.onBlur, false),
      })}
      <span role="tooltip" id={id} className={`fx-tooltip__bubble fx-tooltip__bubble--${placement}`} hidden={!open}>
        {content}
      </span>
    </span>
  );
}

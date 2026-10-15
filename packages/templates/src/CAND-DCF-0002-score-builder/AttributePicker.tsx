import { Button, Checkbox, type ButtonProps } from "@fynxt/ui";
import { Plus } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

export interface AttributePickerProps {
  /** e.g. "Contact". */
  objectName: string;
  /** Fields not yet used by the object. */
  fields: { id: string; label: string }[];
  onAdd: (fieldIds: string[]) => void;
  variant?: ButtonProps["variant"];
  disabled?: boolean;
  align?: "start" | "center";
}

/**
 * "Add attribute" with a checklist popover anchored to the button (frame 09: "Contact fields ·
 * choose one or more", Add N attributes). Template-level composite: FDS-101 Checkbox + Menu styling.
 */
export function AttributePicker({ objectName, fields, onAdd, variant = "ghost", disabled, align = "start" }: AttributePickerProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLInputElement>("input")?.focus();
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <span className="fx-sb-picker" ref={wrapRef}>
      <Button
        ref={triggerRef}
        variant={variant}
        size="s"
        leadingIcon={<Plus />}
        disabled={disabled || !fields.length}
        aria-expanded={open}
        aria-controls={id}
        aria-haspopup="dialog"
        onClick={() => {
          setPicked([]);
          setOpen((o) => !o);
        }}
      >
        Add attribute
      </Button>
      {open && (
        <div
          ref={panelRef}
          id={id}
          role="dialog"
          aria-label={`Add ${objectName} attributes`}
          className="fx-sb-picker__panel"
          data-align={align}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              close();
            }
          }}
        >
          <p className="fx-sb-picker__heading">{objectName} fields · choose one or more</p>
          <div className="fx-sb-picker__list">
            {fields.map((f) => (
              <Checkbox key={f.id} label={f.label} checked={picked.includes(f.id)} onChange={(e) => setPicked((p) => (e.target.checked ? [...p, f.id] : p.filter((x) => x !== f.id)))} />
            ))}
          </div>
          <div className="fx-sb-picker__foot">
            <Button
              size="s"
              disabled={!picked.length}
              onClick={() => {
                onAdd(picked);
                close();
              }}
            >
              {picked.length ? `Add ${picked.length} ${picked.length === 1 ? "attribute" : "attributes"}` : "Add attributes"}
            </Button>
          </div>
        </div>
      )}
    </span>
  );
}

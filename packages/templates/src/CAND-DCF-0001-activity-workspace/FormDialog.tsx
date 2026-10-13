import { Alert, Button, EntityChip, Modal, MultiSelect, Select, TextArea, TextField } from "@fynxt/ui";
import { Briefcase, Plus, Search } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Association, FormConfig, FormField, Option } from "./types";

export type FormValue = string | string[];
export type FormValues = Record<string, FormValue>;

export interface FormDialogProps {
  open: boolean;
  mode: "add" | "edit";
  config: FormConfig;
  initial: FormValues;
  users: Option[];
  associable: Association[];
  onSubmit: (values: FormValues) => Promise<void>;
  onClose: () => void;
  /** Shown when saving fails (copy from the host, Q23). */
  saveErrorTitle: string;
}

const isEmpty = (v: FormValue | undefined) => (Array.isArray(v) ? v.length === 0 : !v || !v.trim());

function invalidDate(field: FormField, v: FormValue | undefined): boolean {
  if (typeof v !== "string" || !v) return false;
  if (field.type === "time") return !/^([01]\d|2[0-3]):[0-5]\d$/.test(v);
  if (field.type === "date" || field.type === "datetime") return Number.isNaN(new Date(v).getTime());
  return false;
}

/** Validates a form against its schema. Only "required" and "parseable date/time" are checked (I1 AC6). */
export function validate(fields: FormField[], values: FormValues, config: Pick<FormConfig, "requiredMessage" | "invalidDateMessage">): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const f of fields) {
    const v = values[f.name];
    if (f.required && isEmpty(v)) errors[f.name] = config.requiredMessage(f.label);
    else if (invalidDate(f, v)) errors[f.name] = config.invalidDateMessage;
  }
  return errors;
}

export const associationKey = (a: Association) => `${a.type}:${a.id}`;

/** Create/edit dialog rendered from a FormConfig (P2 Add/Edit Task, P3 Add Follow-up). */
export function FormDialog({ open, mode, config, initial, users, associable, onSubmit, onClose, saveErrorTitle }: FormDialogProps) {
  const [values, setValues] = useState<FormValues>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [assocSearch, setAssocSearch] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const formId = `fx-aw-form-${mode}-${config.addTitle.replace(/\W+/g, "-").toLowerCase()}`;

  useEffect(() => {
    if (open) {
      setValues(initial);
      setErrors({});
      setSaveError(null);
      setAssocSearch(false);
    }
    // Re-seed only when the dialog opens, not on every parent render.
  }, [open]);

  const set = (name: string, v: FormValue) => {
    setValues((prev) => ({ ...prev, [name]: v }));
    if (errors[name]) setErrors(({ [name]: _removed, ...rest }) => rest);
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    const found = validate(config.fields, values, config);
    setErrors(found);
    const firstInvalid = config.fields.find((f) => found[f.name]);
    if (firstInvalid) {
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>(`[data-field="${firstInvalid.name}"] input, [data-field="${firstInvalid.name}"] textarea, [data-field="${firstInvalid.name}"] select`)?.focus());
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  const assocOptions = associable.map((a) => ({ value: associationKey(a), label: `${a.type}: ${a.label}` }));

  function renderField(f: FormField) {
    const v = values[f.name];
    const status = errors[f.name] ? ("error" as const) : undefined;
    const common = { label: f.label, required: f.required, status, helperText: errors[f.name] };
    const str = typeof v === "string" ? v : "";
    const arr = Array.isArray(v) ? v : [];
    switch (f.type) {
      case "textarea":
        return <TextArea {...common} value={str} placeholder={f.placeholder} onChange={(e) => set(f.name, e.target.value)} />;
      case "select":
        return <Select {...common} value={str} placeholder={f.placeholder} options={f.options ?? []} onChange={(e) => set(f.name, e.target.value)} />;
      case "users":
        return <MultiSelect {...common} leadingIcon={<Search />} options={users} value={arr} placeholder={f.placeholder} onChange={(next) => set(f.name, next)} />;
      case "tags":
        return <MultiSelect {...common} options={f.options ?? []} value={arr} placeholder={f.placeholder} onChange={(next) => set(f.name, next)} />;
      case "associations":
        // Approved frame: "+ Add association" button; the record search appears on demand (AC10).
        if (!assocSearch && f.addLabel)
          return (
            <div className="fx-aw-assoc">
              <span className="fx-field__label">{f.label}</span>
              <div className="fx-aw-assoc__row">
                <Button variant="secondary" size="s" leadingIcon={<Plus />} onClick={() => setAssocSearch(true)}>
                  {f.addLabel}
                </Button>
                {arr.map((key) => {
                  const opt = assocOptions.find((o) => o.value === key);
                  return opt ? <EntityChip key={key} label={opt.label} icon={<Briefcase />} onRemove={() => set(f.name, arr.filter((k) => k !== key))} /> : null;
                })}
              </div>
            </div>
          );
        return <MultiSelect {...common} leadingIcon={<Search />} options={assocOptions} value={arr} placeholder={f.placeholder} onChange={(next) => set(f.name, next)} />;
      case "datetime":
        return <TextField {...common} type="datetime-local" value={str} onChange={(e) => set(f.name, e.target.value)} />;
      case "date":
        return <TextField {...common} type="date" value={str} onChange={(e) => set(f.name, e.target.value)} />;
      case "time":
        return <TextField {...common} type="time" value={str} onChange={(e) => set(f.name, e.target.value)} />;
      default:
        return <TextField {...common} value={str} placeholder={f.placeholder} onChange={(e) => set(f.name, e.target.value)} />;
    }
  }

  const empty = Object.fromEntries(config.fields.map((f) => [f.name, ["users", "tags", "associations"].includes(f.type) ? [] : ""]));
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "edit" && config.editTitle ? config.editTitle : config.addTitle}
      size={config.size ?? "large"}
      windowActions={config.windowActions}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            {config.cancelLabel}
          </Button>
          {config.clearLabel && mode === "add" && (
            <Button variant="secondary" onClick={() => setValues(empty)} disabled={saving}>
              {config.clearLabel}
            </Button>
          )}
          <Button type="submit" form={formId} loading={saving}>
            {config.submitLabel}
          </Button>
        </>
      }
    >
      <form id={formId} ref={formRef} className="fx-aw-form" noValidate onSubmit={submit}>
        {saveError && <Alert status="error" title={saveErrorTitle}>{saveError}</Alert>}
        {config.fields.map((f) => (
          <div key={f.name} data-field={f.name} className={f.half ? "fx-aw-form__field fx-aw-form__field--half" : "fx-aw-form__field"}>
            {renderField(f)}
          </div>
        ))}
      </form>
    </Modal>
  );
}

import { Badge, Button, Checkbox, Modal, SearchField, Spinner, TextArea } from "@fynxt/ui";
import { useEffect, useState } from "react";
import type { Participant, ProgramsAdapter } from "./types";

export interface ParticipantPickerProps {
  open: boolean;
  title: string;
  description: string;
  participantType: string;
  typeLabel: string;
  adapter: ProgramsAdapter;
  /** Participants that can't be picked again, with the reason shown (e.g. "already added"). */
  unavailable: Record<string, string>;
  /** Optional free-text reason (Add blocked participant, DCF-0003 Q38 proposal). */
  withReason?: boolean;
  destructive?: boolean;
  confirmLabel: (count: number) => string;
  onConfirm: (selected: Participant[], reason: string) => void;
  onClose: () => void;
}

/**
 * Participant picker (DCF-0003 candidate, Q40): search, multi-select, optional reason.
 * Approved frames S2i (Add participants) and S3c (Add blocked participant).
 */
export function ParticipantPicker({ open, title, description, participantType, typeLabel, adapter, unavailable, withReason, destructive, confirmLabel, onConfirm, onClose }: ParticipantPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Participant[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<Record<string, Participant>>({});
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) {
      setQuery("");
      setSelected({});
      setReason("");
      return;
    }
    let live = true;
    setResults(null);
    setFailed(false);
    adapter.searchParticipants(participantType, query).then(
      (r) => live && setResults(r),
      () => live && setFailed(true)
    );
    return () => {
      live = false;
    };
  }, [open, query, participantType, adapter]);

  const count = Object.keys(selected).length;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="medium"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={destructive ? "destructive" : "primary"} disabled={count === 0} onClick={() => onConfirm(Object.values(selected), reason.trim())}>
            {confirmLabel(count)}
          </Button>
        </>
      }
    >
      <div className="fx-ip-picker">
        <p className="fx-ip-section__desc">{description}</p>
        <SearchField label={`Search ${typeLabel.toLowerCase()}s`} placeholder="Search by name, email or ID" value={query} onChange={setQuery} />
        {results === null && !failed && (
          <div className="fx-ip-state" role="status">
            <Spinner />
            <span>Searching…</span>
          </div>
        )}
        {failed && <p className="fx-ip-section__desc">Couldn't search participants. Try again.</p>}
        {results && results.length === 0 && <p className="fx-ip-section__desc">No participants match “{query}”.</p>}
        {results && results.length > 0 && (
          <ul className="fx-ip-picker__results" aria-label="Results">
            {results.map((p) => {
              const note = unavailable[p.id];
              return (
                <li key={p.id} className="fx-ip-picker__row">
                  <Checkbox
                    label={p.name}
                    description={note ? `${p.ref} · ${note}` : p.ref}
                    checked={Boolean(selected[p.id])}
                    disabled={Boolean(note)}
                    onChange={(e) =>
                      setSelected((s) => {
                        const next = { ...s };
                        if (e.target.checked) next[p.id] = p;
                        else delete next[p.id];
                        return next;
                      })
                    }
                  />
                  <Badge>{typeLabel}</Badge>
                </li>
              );
            })}
          </ul>
        )}
        <p className="fx-ip-section__desc" aria-live="polite">
          {count} selected
        </p>
        {withReason && <TextArea label="Reason (optional)" helperText="Visible to admins in the audit log" maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />}
      </div>
    </Modal>
  );
}

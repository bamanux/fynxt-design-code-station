import { Alert, Badge, Button, Card, Checkbox, DataTable, Modal, TextField, type DataTableColumn } from "@fynxt/ui";
import { UserPlus } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { StationUser } from "../../shared/types";
import { PageHeader } from "../components/PageHeader";
import { api } from "../lib/api";
import { useSession, useUser } from "../lib/session";
import { formatDate } from "../lib/status";
import { useAsync } from "../lib/useAsync";

type Draft = { email: string; name: string; roles: string[]; isAdmin: boolean };

function RolePicker({ roles, value, onChange }: { roles: string[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <fieldset className="stack role-picker">
      <legend className="field-like__label">Roles</legend>
      {roles.map((r) => (
        <Checkbox key={r} label={r} checked={value.includes(r)} onChange={(e) => onChange(e.target.checked ? [...value, r] : value.filter((x) => x !== r))} />
      ))}
    </fieldset>
  );
}

/** Admins invite FYNXT staff to the Station and decide their roles (agent/fdi/README.md §10). */
export function AdminUsersPage() {
  const me = useUser();
  const { meta } = useSession();
  const users = useAsync(api.users, []);
  const [inviting, setInviting] = useState(false);
  const [editing, setEditing] = useState<StationUser | null>(null);
  const [draft, setDraft] = useState<Draft>({ email: "", name: "", roles: [], isAdmin: false });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const roles = meta?.roles ?? [];
  const domain = meta?.allowedDomain ?? "fynxt.com";

  async function save(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      setInviting(false);
      setEditing(null);
      users.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function invite(e: FormEvent) {
    e.preventDefault();
    void save(() => api.inviteUser(draft));
  }

  const columns: DataTableColumn<StationUser>[] = [
    {
      id: "name",
      header: "Person",
      width: "28%",
      cell: (u) => (
        <span className="stack-tight">
          <span>{u.name}</span>
          <span className="muted">{u.email}</span>
        </span>
      ),
    },
    { id: "roles", header: "Roles", cell: (u) => (u.roles.length ? u.roles.join(", ") : <span className="muted">No role</span>) },
    {
      id: "access",
      header: "Access",
      width: "16%",
      cell: (u) => (
        <span className="row-gap">
          {u.isAdmin && <Badge status="primary">Admin</Badge>}
          {u.active ? <Badge status="success">Active</Badge> : <Badge>Deactivated</Badge>}
        </span>
      ),
    },
    { id: "last", header: "Last sign-in", width: "16%", cell: (u) => (u.lastSignInAt ? formatDate(u.lastSignInAt) : <span className="muted">Never</span>) },
    {
      id: "edit",
      header: <span className="fx-visually-hidden">Edit</span>,
      width: "calc(var(--fx-spacing-12) * 2)",
      cell: (u) => (
        <Button
          variant="ghost"
          size="s"
          onClick={() => {
            setError(null);
            setDraft({ email: u.email, name: u.name, roles: u.roles, isAdmin: u.isAdmin });
            setEditing(u);
          }}
        >
          Edit
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Users & roles" description={`Invite @${domain} colleagues to FDI Studio and choose their roles. Only invited, active people can sign in.`} />
      <div className="row-end">
        <Button
          leadingIcon={<UserPlus />}
          onClick={() => {
            setError(null);
            setDraft({ email: "", name: "", roles: [], isAdmin: false });
            setInviting(true);
          }}
        >
          Invite user
        </Button>
      </div>
      {users.error && <Alert status="error">{users.error}</Alert>}
      <Card as="section">
        <DataTable caption="Station users" columns={columns} rows={users.data ?? []} getRowId={(u) => u.email} empty={<p className="muted">No users yet.</p>} />
      </Card>

      <Modal open={inviting} onClose={() => setInviting(false)} title="Invite user" size="medium">
        <form className="stack" onSubmit={invite} noValidate>
          <TextField label="Work email" type="email" required placeholder={`name@${domain}`} value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} helperText={`Only @${domain} addresses.`} />
          <TextField label="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} helperText="Updated from Microsoft when they first sign in." />
          <RolePicker roles={roles} value={draft.roles} onChange={(r) => setDraft({ ...draft, roles: r })} />
          <Checkbox label="Admin" description="Can invite users, set roles and see every case. Not an approval role." checked={draft.isAdmin} onChange={(e) => setDraft({ ...draft, isAdmin: e.target.checked })} />
          {error && <Alert status="error" title="Couldn't invite">{error}</Alert>}
          <div className="row-end">
            <Button variant="ghost" onClick={() => setInviting(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={busy}>
              Invite
            </Button>
          </div>
        </form>
      </Modal>

      {editing && (
        <Modal open onClose={() => setEditing(null)} title={`Edit ${editing.name}`} size="medium">
          <div className="stack">
            <p className="muted">{editing.email}</p>
            <TextField label="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} helperText="Microsoft sign-in updates this from the person's account." />
            <RolePicker roles={roles} value={draft.roles} onChange={(r) => setDraft({ ...draft, roles: r })} />
            <Checkbox label="Admin" checked={draft.isAdmin} disabled={editing.email === me.email} description={editing.email === me.email ? "You can't remove your own Admin access." : undefined} onChange={(e) => setDraft({ ...draft, isAdmin: e.target.checked })} />
            {error && <Alert status="error" title="Couldn't save">{error}</Alert>}
            <div className="row-between">
              {editing.email !== me.email && (
                <Button variant={editing.active ? "destructive" : "secondary"} onClick={() => void save(() => api.updateUser(editing.email, { active: !editing.active }))}>
                  {editing.active ? "Deactivate" : "Reactivate"}
                </Button>
              )}
              <div className="row-gap">
                <Button variant="ghost" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button loading={busy} onClick={() => void save(() => api.updateUser(editing.email, { name: draft.name, roles: draft.roles, isAdmin: draft.isAdmin }))}>
                  Save
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, Plus, UserPlus } from "lucide-react";

type ManagedUser = {
  id: string;
  name: string;
  email: string;
  loginId: string | null;
  phone: string | null;
  role: string;
  status: string;
  lastLoginAt: string | null;
};

function roleLabel(role: string) {
  return role.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function UsersManager({
  initialUsers,
  roles,
  currentUserId,
}: {
  initialUsers: ManagedUser[];
  roles: string[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Create-user form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loginId, setLoginId] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState(roles[0] ?? "VIEWER");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);

  async function refresh() {
    const response = await fetch("/api/v1/users");
    const body = await response.json().catch(() => null);
    if (response.ok && body?.data?.users) setUsers(body.data.users);
    router.refresh();
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setMessage(null);
    const response = await fetch("/api/v1/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, email, loginId, phone, role, password }),
    });
    const body = await response.json().catch(() => null);
    setCreating(false);
    if (!response.ok) {
      setMessage({ kind: "error", text: body?.error ?? "Could not create user." });
      return;
    }
    setMessage({ kind: "success", text: `${name} created.` });
    setName(""); setEmail(""); setLoginId(""); setPhone(""); setPassword("");
    await refresh();
  }

  async function updateUser(id: string, patch: { role?: string; status?: string }) {
    setBusyId(id);
    setMessage(null);
    const response = await fetch(`/api/v1/users/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    const body = await response.json().catch(() => null);
    setBusyId(null);
    if (!response.ok) {
      setMessage({ kind: "error", text: body?.error ?? "Update failed." });
      return;
    }
    setUsers((list) => list.map((user) => (user.id === id ? { ...user, ...patch } : user)));
    router.refresh();
  }

  async function resetPassword(id: string, name: string) {
    const password = globalThis.prompt(`Enter a new password for ${name} (min 6 characters):`);
    if (!password) return;
    setBusyId(id);
    setMessage(null);
    const response = await fetch(`/api/v1/users/${id}/password`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const body = await response.json().catch(() => null);
    setBusyId(null);
    setMessage(
      response.ok
        ? { kind: "success", text: `Password reset for ${name}.` }
        : { kind: "error", text: body?.error ?? "Reset failed." },
    );
  }

  return (
    <div className="grid gap-6">
      {message ? (
        <div className={`rounded-lg px-3 py-2 text-sm ${message.kind === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
          {message.text}
        </div>
      ) : null}

      <section className="card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
          <UserPlus size={18} />
          <h2 className="font-semibold">Add a user</h2>
        </div>
        <form onSubmit={createUser} className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
          <label className="block">
            <span className="label">Full name</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label className="block">
            <span className="label">Email <span className="font-normal text-slate-400">(optional if login ID set)</span></span>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="block">
            <span className="label">Login ID <span className="font-normal text-slate-400">(optional username)</span></span>
            <input className="input" value={loginId} onChange={(e) => setLoginId(e.target.value)} placeholder="e.g. Dakshdod" />
          </label>
          <label className="block">
            <span className="label">Phone</span>
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <label className="block">
            <span className="label">Role</span>
            <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
              {roles.map((r) => (
                <option key={r} value={r}>{roleLabel(r)}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Temporary password</span>
            <input className="input" type="text" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
          </label>
          <div className="md:col-span-2 xl:col-span-3">
            <button className="btn-primary w-fit" disabled={creating || !name || (!email && !loginId) || password.length < 6}>
              {creating ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
              Create user
            </button>
          </div>
        </form>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold">Team ({users.length})</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {users.map((user) => (
            <div key={user.id} className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-navy-900">{user.name}</span>
                  <span className={`chip ${user.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{user.status}</span>
                  {user.id === currentUserId ? <span className="chip bg-navy-100 text-navy-800">You</span> : null}
                </div>
                <div className="mt-1 truncate text-xs text-slate-500">
                  {user.loginId ? <span className="font-medium">@{user.loginId}</span> : null}
                  {user.loginId && user.email ? " · " : null}
                  {user.email && !user.email.endsWith("@users.local") ? user.email : null}
                  {user.lastLoginAt ? ` · last login ${new Date(user.lastLoginAt).toLocaleDateString()}` : " · never signed in"}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="input h-9 w-auto px-2 py-0 text-xs"
                  value={user.role}
                  disabled={busyId === user.id}
                  onChange={(e) => updateUser(user.id, { role: e.target.value })}
                >
                  {roles.map((r) => (
                    <option key={r} value={r}>{roleLabel(r)}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn-outline h-9 px-3 text-xs"
                  disabled={busyId === user.id || user.id === currentUserId}
                  onClick={() => updateUser(user.id, { status: user.status === "ACTIVE" ? "DISABLED" : "ACTIVE" })}
                >
                  {user.status === "ACTIVE" ? "Deactivate" : "Activate"}
                </button>
                <button type="button" className="btn-outline h-9 px-3 text-xs" disabled={busyId === user.id} onClick={() => resetPassword(user.id, user.name)}>
                  <KeyRound size={13} /> Reset password
                </button>
              </div>
            </div>
          ))}
          {!users.length ? <div className="p-8 text-center text-sm text-slate-500">No users yet.</div> : null}
        </div>
      </section>
    </div>
  );
}

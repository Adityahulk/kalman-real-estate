"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, FileText, KeyRound, Loader2, Pencil, Plus, Save, Trash2, UserPlus, X } from "lucide-react";

type ProfileFile = { fileId: string; fileName: string; mimeType: string };
type ProfileValue = string | ProfileFile | null;
type ManagedUser = {
  id: string;
  name: string;
  email: string;
  loginId: string | null;
  phone: string | null;
  role: string;
  customRoleId: string | null;
  departmentId: string | null;
  designationId: string | null;
  profileData: Record<string, ProfileValue> | null;
  status: string;
  lastLoginAt: string | null;
  customRole: { id: string; name: string } | null;
  department: { id: string; name: string } | null;
  designation: { id: string; name: string } | null;
};
type CustomRole = { id: string; name: string; baseRole: string; departmentId: string | null; designationId: string | null };
type Department = { id: string; name: string };
type Designation = { id: string; name: string; departmentId: string };
type UserField = { id: string; label: string; key: string; type: "TEXT" | "IMAGE" | "DOCUMENT"; required: boolean };

function roleLabel(role: string) {
  return role.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (character) => character.toUpperCase());
}

export function UsersManager({
  initialUsers,
  roles,
  customRoles,
  departments,
  designations,
  userFields,
  currentUserId,
  isSuperAdmin,
}: {
  initialUsers: ManagedUser[];
  roles: string[];
  customRoles: CustomRole[];
  departments: Department[];
  designations: Designation[];
  userFields: UserField[];
  currentUserId: string;
  isSuperAdmin: boolean;
}) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loginId, setLoginId] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState(roles.includes("VIEWER") ? "VIEWER" : roles[0] ?? "VIEWER");
  const [customRoleId, setCustomRoleId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [designationId, setDesignationId] = useState("");
  const [password, setPassword] = useState("");
  const [profileData, setProfileData] = useState<Record<string, ProfileValue>>({});
  const [profileFiles, setProfileFiles] = useState<Record<string, File | null>>({});
  const [creating, setCreating] = useState(false);
  const filteredDesignations = useMemo(
    () => designations.filter((item) => !departmentId || item.departmentId === departmentId),
    [departmentId, designations],
  );

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
    try {
      const response = await fetch("/api/v1/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, loginId, phone, role, customRoleId: customRoleId || null, departmentId: departmentId || null, designationId: designationId || null, password, profileData }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error ?? "Could not create user.");
      const nextProfile = { ...profileData };
      try {
        for (const field of userFields.filter((item) => item.type !== "TEXT")) {
          const file = profileFiles[field.key];
          if (file) nextProfile[field.key] = await uploadProfileFile(body.data.id, field.key, file);
        }
        if (JSON.stringify(nextProfile) !== JSON.stringify(profileData)) {
          await patchUser(body.data.id, { profileData: nextProfile });
        }
      } catch (uploadError) {
        resetCreateForm();
        await refresh();
        setMessage({ kind: "error", text: `${name} was created, but a profile file could not be uploaded. Open the user profile to retry. ${uploadError instanceof Error ? uploadError.message : ""}` });
        return;
      }
      setMessage({ kind: "success", text: `${name} created.` });
      resetCreateForm();
      await refresh();
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Could not create user." });
    } finally {
      setCreating(false);
    }
  }

  function resetCreateForm() {
    setName(""); setEmail(""); setLoginId(""); setPhone(""); setPassword("");
    setCustomRoleId(""); setDepartmentId(""); setDesignationId(""); setProfileData({}); setProfileFiles({});
  }

  async function patchUser(id: string, patch: Record<string, unknown>) {
    const response = await fetch(`/api/v1/users/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(body?.error ?? "Update failed.");
    return body.data;
  }

  async function updateUser(id: string, patch: Record<string, unknown>, success = "User updated.") {
    setBusyId(id);
    setMessage(null);
    try {
      await patchUser(id, patch);
      setMessage({ kind: "success", text: success });
      await refresh();
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Update failed." });
    } finally {
      setBusyId(null);
    }
  }

  async function resetPassword(id: string, userName: string) {
    const nextPassword = globalThis.prompt(`Enter a new password for ${userName} (min 6 characters):`);
    if (!nextPassword) return;
    setBusyId(id);
    const response = await fetch(`/api/v1/users/${id}/password`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: nextPassword }),
    });
    const body = await response.json().catch(() => null);
    setBusyId(null);
    setMessage(response.ok ? { kind: "success", text: `Password reset for ${userName}.` } : { kind: "error", text: body?.error ?? "Reset failed." });
  }

  async function deleteUser(user: ManagedUser) {
    const confirmed = window.confirm(
      `Disable ${user.name}?\n\nThe user will immediately lose access and will not be able to sign in. Their records and audit history will be preserved and the account can be reactivated later.`,
    );
    if (!confirmed) return;
    setBusyId(user.id);
    const response = await fetch(`/api/v1/users/${user.id}`, { method: "DELETE" });
    const body = await response.json().catch(() => null);
    setBusyId(null);
    if (!response.ok) return setMessage({ kind: "error", text: body?.error ?? "Could not disable user." });
    setUsers((list) => list.map((item) => item.id === user.id ? { ...item, status: "DISABLED" } : item));
    setMessage({ kind: "success", text: `${user.name} was disabled. Their records and audit history were preserved.` });
  }

  function startEdit(user: ManagedUser) {
    setEditingId(user.id);
    setName(user.name);
    setEmail(user.email.endsWith("@users.local") ? "" : user.email);
    setLoginId(user.loginId ?? "");
    setPhone(user.phone ?? "");
    setRole(user.role);
    setCustomRoleId(user.customRoleId ?? "");
    setDepartmentId(user.departmentId ?? "");
    setDesignationId(user.designationId ?? "");
    setProfileData(user.profileData ?? {});
    setProfileFiles({});
    setExpandedId(user.id);
  }

  async function saveEdit(user: ManagedUser) {
    setBusyId(user.id);
    try {
      const nextProfile = { ...profileData };
      for (const field of userFields.filter((item) => item.type !== "TEXT")) {
        const file = profileFiles[field.key];
        if (file) nextProfile[field.key] = await uploadProfileFile(user.id, field.key, file);
      }
      await patchUser(user.id, { name, email: email || user.email, loginId: loginId || null, phone, role, customRoleId: customRoleId || null, departmentId: departmentId || null, designationId: designationId || null, profileData: nextProfile });
      setEditingId(null);
      setMessage({ kind: "success", text: `${name}'s profile was updated.` });
      resetCreateForm();
      await refresh();
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Could not update profile." });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="grid gap-6">
      {message ? <div className={`sticky top-3 z-30 rounded-lg px-4 py-3 text-sm shadow-lg ${message.kind === "success" ? "bg-emerald-700 text-white" : "bg-rose-700 text-white"}`}>{message.text}</div> : null}

      <section className="card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4"><UserPlus size={18} /><h2 className="font-semibold">Add a user</h2></div>
        <form onSubmit={createUser} className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
          <TextInput label="Full name" value={name} onChange={setName} required />
          <TextInput label="Email (optional if login ID set)" value={email} onChange={setEmail} type="email" />
          <TextInput label="Login ID (optional username)" value={loginId} onChange={setLoginId} />
          <TextInput label="Phone" value={phone} onChange={setPhone} />
          <SelectInput label="Department" value={departmentId} onChange={(value) => { setDepartmentId(value); setDesignationId(""); }} options={departments} empty="Select department" />
          <SelectInput label="Designation" value={designationId} onChange={setDesignationId} options={filteredDesignations} empty="Select designation" />
          <label><span className="label">Custom role</span><select className="input" value={customRoleId} onChange={(event) => { const id = event.target.value; setCustomRoleId(id); const selected = customRoles.find((item) => item.id === id); if (selected) { setRole(selected.baseRole); if (selected.departmentId) setDepartmentId(selected.departmentId); if (selected.designationId) setDesignationId(selected.designationId); } }}><option value="">Use standard role</option>{customRoles.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label><span className="label">Standard role</span><select className="input" value={role} disabled={Boolean(customRoleId)} onChange={(event) => setRole(event.target.value)}>{roles.map((item) => <option key={item} value={item}>{roleLabel(item)}</option>)}</select></label>
          <TextInput label="Temporary password" value={password} onChange={setPassword} type="text" required />
          {userFields.map((field) => <ProfileField key={field.id} field={field} value={profileData[field.key]} file={profileFiles[field.key]} onValue={(value) => setProfileData((current) => ({ ...current, [field.key]: value }))} onFile={(file) => setProfileFiles((current) => ({ ...current, [field.key]: file }))} />)}
          <div className="md:col-span-2 xl:col-span-3"><button className="btn-primary w-fit" disabled={creating || !name || (!email && !loginId) || password.length < 6}>{creating ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}Create user</button></div>
        </form>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold">Users ({users.length})</h2><p className="mt-1 text-sm text-slate-500">Open a user to view their complete profile and account controls.</p></div>
        <div className="divide-y divide-slate-100">
          {users.map((user) => {
            const expanded = expandedId === user.id;
            const editing = editingId === user.id;
            return (
              <div key={user.id}>
                <button type="button" className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-slate-50" onClick={() => setExpandedId(expanded ? null : user.id)}>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><span className="font-medium text-navy-900">{user.name}</span><span className={`chip ${user.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{user.status}</span>{user.id === currentUserId ? <span className="chip bg-navy-100 text-navy-800">You</span> : null}</div>
                    <div className="mt-1 truncate text-xs text-slate-500">{user.customRole?.name ?? roleLabel(user.role)}{user.department ? ` · ${user.department.name}` : ""}{user.designation ? ` · ${user.designation.name}` : ""}</div>
                  </div>
                  {expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
                </button>
                {expanded ? (
                  <div className="border-t border-slate-100 bg-slate-50 px-5 py-5">
                    {editing ? (
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <TextInput label="Full name" value={name} onChange={setName} required />
                        <TextInput label="Email" value={email} onChange={setEmail} type="email" />
                        <TextInput label="Login ID" value={loginId} onChange={setLoginId} />
                        <TextInput label="Phone" value={phone} onChange={setPhone} />
                        <SelectInput label="Department" value={departmentId} onChange={(value) => { setDepartmentId(value); setDesignationId(""); }} options={departments} empty="Select department" />
                        <SelectInput label="Designation" value={designationId} onChange={setDesignationId} options={filteredDesignations} empty="Select designation" />
                        <label><span className="label">Custom role</span><select className="input" value={customRoleId} onChange={(event) => setCustomRoleId(event.target.value)}><option value="">Use standard role</option>{customRoles.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                        <label><span className="label">Standard role</span><select className="input" value={role} disabled={Boolean(customRoleId)} onChange={(event) => setRole(event.target.value)}>{roles.map((item) => <option key={item} value={item}>{roleLabel(item)}</option>)}</select></label>
                        {userFields.map((field) => <ProfileField key={field.id} field={field} value={profileData[field.key]} file={profileFiles[field.key]} onValue={(value) => setProfileData((current) => ({ ...current, [field.key]: value }))} onFile={(file) => setProfileFiles((current) => ({ ...current, [field.key]: file }))} />)}
                        <div className="flex gap-2 md:col-span-2 xl:col-span-3"><button className="btn-primary" disabled={busyId === user.id} onClick={() => void saveEdit(user)}><Save size={15} /> Save profile</button><button className="btn-outline" onClick={() => { setEditingId(null); resetCreateForm(); }}><X size={15} /> Cancel</button></div>
                      </div>
                    ) : (
                      <>
                        <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                          <ProfileItem label="Email" value={user.email.endsWith("@users.local") ? "Not provided" : user.email} />
                          <ProfileItem label="Login ID" value={user.loginId || "Not provided"} />
                          <ProfileItem label="Phone" value={user.phone || "Not provided"} />
                          <ProfileItem label="Department" value={user.department?.name || "Not assigned"} />
                          <ProfileItem label="Designation" value={user.designation?.name || "Not assigned"} />
                          <ProfileItem label="Role" value={user.customRole?.name ?? roleLabel(user.role)} />
                          {userFields.map((field) => <ProfileItem key={field.id} label={field.label} value={user.profileData?.[field.key]} />)}
                          <ProfileItem label="Last login" value={user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Never signed in"} />
                        </div>
                        <div className="mt-5 flex flex-wrap gap-2">
                          {isSuperAdmin ? <button className="btn-outline h-9 text-xs" onClick={() => startEdit(user)}><Pencil size={13} /> Edit user</button> : null}
                          <button className="btn-outline h-9 text-xs" disabled={busyId === user.id} onClick={() => void resetPassword(user.id, user.name)}><KeyRound size={13} /> Reset password</button>
                          {isSuperAdmin && user.id !== currentUserId ? <button className="btn-outline h-9 text-xs" disabled={busyId === user.id} onClick={() => void updateUser(user.id, { status: user.status === "ACTIVE" ? "DISABLED" : "ACTIVE" }, user.status === "ACTIVE" ? "User deactivated." : "User activated.")}>{user.status === "ACTIVE" ? "Deactivate" : "Activate"}</button> : null}
                          {isSuperAdmin && user.id !== currentUserId ? <button className="btn-outline h-9 border-rose-200 text-xs text-rose-700" disabled={busyId === user.id} onClick={() => void deleteUser(user)}><Trash2 size={13} /> Delete user</button> : null}
                        </div>
                      </>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
          {!users.length ? <div className="p-8 text-center text-sm text-slate-500">No users yet.</div> : null}
        </div>
      </section>
    </div>
  );
}

function TextInput({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return <label><span className="label">{label}</span><input className="input" type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} /></label>;
}

function SelectInput({ label, value, onChange, options, empty }: { label: string; value: string; onChange: (value: string) => void; options: { id: string; name: string }[]; empty: string }) {
  return <label><span className="label">{label}</span><select className="input" value={value} onChange={(event) => onChange(event.target.value)}><option value="">{empty}</option>{options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>;
}

function ProfileField({ field, value, file, onValue, onFile }: { field: UserField; value: ProfileValue | undefined; file: File | null | undefined; onValue: (value: ProfileValue) => void; onFile: (file: File | null) => void }) {
  if (field.type === "TEXT") return <TextInput label={`${field.label}${field.required ? " *" : ""}`} value={typeof value === "string" ? value : ""} onChange={onValue} required={field.required} />;
  const stored = isProfileFile(value) ? value.fileName : "";
  return <label><span className="label">{field.label}{field.required ? " *" : ""}</span><input className="input py-2" type="file" accept={field.type === "IMAGE" ? "image/*" : undefined} required={field.required && !stored} onChange={(event) => onFile(event.target.files?.[0] ?? null)} />{file?.name || stored ? <span className="mt-1 block text-xs text-slate-500">{file?.name ?? stored}</span> : null}</label>;
}

function ProfileItem({ label, value }: { label: string; value: ProfileValue | string | undefined }) {
  return <div><div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>{isProfileFile(value) ? <a className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-navy-700 underline" href={`/api/v1/files/${value.fileId}/download`}><FileText size={14} />{value.fileName}</a> : <div className="mt-1 break-words text-sm text-slate-800">{typeof value === "string" && value ? value : "Not provided"}</div>}</div>;
}

function isProfileFile(value: unknown): value is ProfileFile {
  return Boolean(value && typeof value === "object" && "fileId" in value && "fileName" in value);
}

async function uploadProfileFile(userId: string, key: string, file: File): Promise<ProfileFile> {
  const metaResponse = await fetch("/api/v1/files/upload", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ fileName: file.name, mimeType: file.type || "application/octet-stream", sizeBytes: file.size, visibility: "ADMIN_ONLY", ownerType: "User", ownerId: userId, categoryKey: `user-profile-${key}` }),
  });
  const meta = await metaResponse.json().catch(() => null);
  if (!metaResponse.ok) throw new Error(meta?.error ?? `Could not upload ${file.name}.`);
  const target = meta.data.upload.primary ?? meta.data.upload;
  const uploadResponse = await fetch(typeof target === "string" ? target : target.url, { method: "PUT", headers: { "content-type": file.type || "application/octet-stream" }, body: file });
  if (!uploadResponse.ok) throw new Error(`Could not upload ${file.name}.`);
  const completeResponse = await fetch(`/api/v1/files/${meta.data.file.id}/upload-complete`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ storageProvider: target.provider ?? (String(target).includes("/api/v1/storage/upload") ? "LOCAL" : "S3"), storageKey: target.storageKey ?? meta.data.file.storageKey, sizeBytes: file.size }),
  });
  const completed = await completeResponse.json().catch(() => null);
  if (!completeResponse.ok) throw new Error(completed?.error ?? `Could not finalize ${file.name}.`);
  return { fileId: meta.data.file.id, fileName: file.name, mimeType: file.type || "application/octet-stream" };
}

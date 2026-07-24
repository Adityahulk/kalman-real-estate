"use client";

import { useMemo, useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";

type Department = { id: string; name: string };
type Designation = { id: string; name: string; departmentId: string };
type CustomRole = {
  id: string;
  name: string;
  description: string | null;
  baseRole: string;
  permissions: unknown;
  departmentId: string | null;
  designationId: string | null;
};
type UserField = { id: string; label: string; key: string; type: "TEXT" | "IMAGE" | "DOCUMENT"; required: boolean };
type BaseRole = { role: string; permissions: string[] };

const permissionLabels: Record<string, string> = {
  tenant: "Firm settings",
  users: "Users and roles",
  projects: "Projects",
  cad: "Maps",
  ownership: "Ownership",
  documents: "Letters and documents",
  files: "File uploads",
  development: "Development",
  engineering: "Engineering",
  liaison: "Government approvals",
  marketing: "Marketing",
  finance: "Finance",
  ai: "AI tools",
  owner: "Owner portal",
};

export function RoleSettingsManager({
  initial,
}: {
  initial: {
    departments: Department[];
    designations: Designation[];
    roles: CustomRole[];
    fields: UserField[];
    permissions: string[];
    baseRoles: BaseRole[];
  };
}) {
  const [data, setData] = useState(initial);
  const [message, setMessage] = useState("");
  const [departmentName, setDepartmentName] = useState("");
  const [designationName, setDesignationName] = useState("");
  const [designationDepartment, setDesignationDepartment] = useState("");
  const [fieldLabel, setFieldLabel] = useState("");
  const [fieldType, setFieldType] = useState<UserField["type"]>("TEXT");
  const [fieldRequired, setFieldRequired] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [baseRole, setBaseRole] = useState("VIEWER");
  const [roleDepartment, setRoleDepartment] = useState("");
  const [roleDesignation, setRoleDesignation] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);

  const groupedPermissions = useMemo(() => {
    const groups = new Map<string, string[]>();
    for (const permission of data.permissions) {
      const group = permission.split(".")[0];
      groups.set(group, [...(groups.get(group) ?? []), permission]);
    }
    return [...groups.entries()];
  }, [data.permissions]);

  async function refresh(success?: string) {
    const response = await fetch("/api/v1/settings/user-roles");
    const body = await response.json().catch(() => null);
    if (response.ok) setData(body.data);
    setMessage(response.ok ? success ?? "" : body?.error ?? "Could not refresh settings.");
  }

  async function mutate(method: "POST" | "PATCH" | "DELETE", body: Record<string, unknown>, success: string) {
    const response = await fetch("/api/v1/settings/user-roles", {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) return setMessage(result?.error ?? "Could not save settings.");
    await refresh(success);
  }

  function chooseBaseRole(next: string) {
    setBaseRole(next);
    setPermissions(data.baseRoles.find((item) => item.role === next)?.permissions ?? []);
  }

  function editRole(role: CustomRole) {
    setEditingRoleId(role.id);
    setRoleName(role.name);
    setRoleDescription(role.description ?? "");
    setBaseRole(role.baseRole);
    setRoleDepartment(role.departmentId ?? "");
    setRoleDesignation(role.designationId ?? "");
    setPermissions(Array.isArray(role.permissions) ? role.permissions.filter((item): item is string => typeof item === "string") : []);
  }

  function resetRole() {
    setEditingRoleId(null);
    setRoleName("");
    setRoleDescription("");
    setRoleDepartment("");
    setRoleDesignation("");
    chooseBaseRole("VIEWER");
  }

  const roleDesignations = data.designations.filter((item) => !roleDepartment || item.departmentId === roleDepartment);

  return (
    <div className="grid gap-6">
      {message ? <div className="sticky top-3 z-20 rounded-lg bg-navy-900 px-4 py-3 text-sm text-white shadow-lg">{message}</div> : null}

      <section className="card overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold">Departments &amp; designations</h2>
          <p className="mt-1 text-sm text-slate-500">Organize people by department first, then assign their designation.</p>
        </div>
        <div className="grid gap-6 p-5 lg:grid-cols-2">
          <div>
            <div className="flex gap-2">
              <input className="input" value={departmentName} onChange={(event) => setDepartmentName(event.target.value)} placeholder="e.g. Marketing" />
              <button className="btn-primary shrink-0" disabled={!departmentName.trim()} onClick={() => void mutate("POST", { resource: "department", name: departmentName }, "Department added.").then(() => setDepartmentName(""))}><Plus size={15} /> Add</button>
            </div>
            <div className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
              {data.departments.map((department) => <SettingRow key={department.id} label={department.name} onEdit={() => rename("department", department.id, department.name, mutate)} onDelete={() => confirmDelete("department", department.id, department.name, mutate)} />)}
              {!data.departments.length ? <Empty text="No departments yet." /> : null}
            </div>
          </div>
          <div>
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <select className="input" value={designationDepartment} onChange={(event) => setDesignationDepartment(event.target.value)}>
                <option value="">Select department</option>
                {data.departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <input className="input" value={designationName} onChange={(event) => setDesignationName(event.target.value)} placeholder="e.g. Head of Marketing" />
              <button className="btn-primary" disabled={!designationDepartment || !designationName.trim()} onClick={() => void mutate("POST", { resource: "designation", departmentId: designationDepartment, name: designationName }, "Designation added.").then(() => setDesignationName(""))}><Plus size={15} /> Add</button>
            </div>
            <div className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
              {data.designations.map((designation) => <SettingRow key={designation.id} label={designation.name} detail={data.departments.find((item) => item.id === designation.departmentId)?.name} onEdit={() => rename("designation", designation.id, designation.name, mutate)} onDelete={() => confirmDelete("designation", designation.id, designation.name, mutate)} />)}
              {!data.designations.length ? <Empty text="No designations yet." /> : null}
            </div>
          </div>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold">Roles &amp; permissions</h2>
          <p className="mt-1 text-sm text-slate-500">Choose exactly what members of this role can view or manage.</p>
        </div>
        <div className="grid gap-6 p-5 xl:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.4fr)]">
          <div className="space-y-3">
            {data.roles.map((role) => (
              <div key={role.id} className={`rounded-lg border p-3 ${editingRoleId === role.id ? "border-navy-500 bg-navy-50" : "border-slate-200"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div><div className="font-medium">{role.name}</div><div className="mt-1 text-xs text-slate-500">{role.description || role.baseRole.replaceAll("_", " ")}</div></div>
                  <div className="flex gap-1"><button className="btn-ghost h-8 px-2" onClick={() => editRole(role)}><Pencil size={14} /></button><button className="btn-ghost h-8 px-2 text-rose-700" onClick={() => confirmDelete("role", role.id, role.name, mutate)}><Trash2 size={14} /></button></div>
                </div>
              </div>
            ))}
            {!data.roles.length ? <Empty text="No custom roles yet." /> : null}
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label><span className="label">Role name</span><input className="input" value={roleName} onChange={(event) => setRoleName(event.target.value)} placeholder="e.g. Marketing Lead" /></label>
              <label><span className="label">Permission starting point</span><select className="input" value={baseRole} onChange={(event) => chooseBaseRole(event.target.value)}>{data.baseRoles.map((item) => <option key={item.role} value={item.role}>{pretty(item.role)}</option>)}</select></label>
              <label><span className="label">Department</span><select className="input" value={roleDepartment} onChange={(event) => { setRoleDepartment(event.target.value); setRoleDesignation(""); }}><option value="">Any department</option>{data.departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label><span className="label">Designation</span><select className="input" value={roleDesignation} onChange={(event) => setRoleDesignation(event.target.value)}><option value="">Any designation</option>{roleDesignations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label className="md:col-span-2"><span className="label">Description</span><input className="input" value={roleDescription} onChange={(event) => setRoleDescription(event.target.value)} /></label>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {groupedPermissions.map(([group, items]) => (
                <div key={group} className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="mb-2 text-sm font-semibold">{permissionLabels[group] ?? pretty(group)}</div>
                  <div className="space-y-2">{items.map((permission) => <label key={permission} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={permissions.includes(permission)} onChange={() => setPermissions((list) => list.includes(permission) ? list.filter((item) => item !== permission) : [...list, permission])} /><span>{permission.endsWith(".view") ? "View" : permission.endsWith(".manage") ? "Add, edit & delete" : pretty(permission.split(".")[1])}</span></label>)}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <button className="btn-primary" disabled={!roleName.trim()} onClick={() => void mutate(editingRoleId ? "PATCH" : "POST", { resource: "role", ...(editingRoleId ? { id: editingRoleId } : {}), name: roleName, description: roleDescription, baseRole, departmentId: roleDepartment || null, designationId: roleDesignation || null, permissions }, editingRoleId ? "Role updated." : "Role created.").then(resetRole)}>{editingRoleId ? <Check size={15} /> : <Plus size={15} />}{editingRoleId ? "Save role" : "Create role"}</button>
              {editingRoleId ? <button className="btn-outline" onClick={resetRole}><X size={15} /> Cancel</button> : null}
            </div>
          </div>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold">Additional user fields</h2>
          <p className="mt-1 text-sm text-slate-500">These fields appear on every new user form and profile.</p>
        </div>
        <div className="p-5">
          <div className="grid gap-2 md:grid-cols-[1fr_180px_auto_auto]">
            <input className="input" value={fieldLabel} onChange={(event) => setFieldLabel(event.target.value)} placeholder="e.g. ID proof or profile photo" />
            <select className="input" value={fieldType} onChange={(event) => setFieldType(event.target.value as UserField["type"])}><option value="TEXT">Text</option><option value="IMAGE">Image</option><option value="DOCUMENT">Document</option></select>
            <label className="flex items-center gap-2 px-2 text-sm"><input type="checkbox" checked={fieldRequired} onChange={(event) => setFieldRequired(event.target.checked)} /> Required</label>
            <button className="btn-primary" disabled={!fieldLabel.trim()} onClick={() => void mutate("POST", { resource: "field", label: fieldLabel, type: fieldType, required: fieldRequired }, "User field added.").then(() => setFieldLabel(""))}><Plus size={15} /> Add field</button>
          </div>
          <div className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
            {data.fields.map((field) => <SettingRow key={field.id} label={field.label} detail={`${pretty(field.type)}${field.required ? " · Required" : ""}`} onEdit={() => rename("field", field.id, field.label, mutate, "label")} onDelete={() => confirmDelete("field", field.id, field.label, mutate)} />)}
            {!data.fields.length ? <Empty text="No additional fields yet." /> : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function SettingRow({ label, detail, onEdit, onDelete }: { label: string; detail?: string; onEdit: () => void; onDelete: () => void }) {
  return <div className="flex items-center justify-between gap-3 px-3 py-2.5"><div><div className="text-sm font-medium">{label}</div>{detail ? <div className="text-xs text-slate-500">{detail}</div> : null}</div><div className="flex gap-1"><button className="btn-ghost h-8 px-2" onClick={onEdit}><Pencil size={13} /></button><button className="btn-ghost h-8 px-2 text-rose-700" onClick={onDelete}><Trash2 size={13} /></button></div></div>;
}

function Empty({ text }: { text: string }) {
  return <div className="px-3 py-5 text-center text-sm text-slate-500">{text}</div>;
}

function pretty(value: string) {
  return value.replaceAll("_", " ").replaceAll(".", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function rename(resource: string, id: string, current: string, mutate: (method: "PATCH", body: Record<string, unknown>, success: string) => Promise<void>, property = "name") {
  const next = window.prompt(`Rename "${current}"`, current)?.trim();
  if (next && next !== current) void mutate("PATCH", { resource, id, [property]: next }, `${pretty(resource)} renamed.`);
}

function confirmDelete(resource: string, id: string, name: string, mutate: (method: "DELETE", body: Record<string, unknown>, success: string) => Promise<void>) {
  if (window.confirm(`Delete "${name}"? Existing users will keep their accounts but this assignment will be removed.`)) {
    void mutate("DELETE", { resource, id }, `${pretty(resource)} deleted.`);
  }
}

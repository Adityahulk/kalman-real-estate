import { requirePagePermission } from "@/server/page-auth";
import { listLetterFieldSettings } from "@/server/services/letter-field-settings";
import { LetterFieldSettingsEditor } from "./letter-field-settings-editor";

export const dynamic = "force-dynamic";

export default async function LetterFieldsSettingsPage() {
  const session = await requirePagePermission("projects.manage");
  const categories = await listLetterFieldSettings(session.tenantId);
  return <div>
    <div className="mb-4">
      <h2 className="text-lg font-semibold">Letter fields</h2>
      <p className="mt-1 text-sm text-slate-500">Create reusable field groups for allotment and transfer letter templates.</p>
    </div>
    <LetterFieldSettingsEditor categories={categories} />
  </div>;
}

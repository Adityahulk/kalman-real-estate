import { listCrmSettings } from "@/server/services/crm";
import { CrmNav } from "../crm-nav";
import { requireCrmContext } from "../crm-page-context";
import { CrmSettings } from "./settings-client";

export const dynamic = "force-dynamic";
export default async function CrmSettingsPage() {
  const { context } = await requireCrmContext("crm.assign"); const data = await listCrmSettings(context);
  return <main className="px-4 py-6 lg:px-8"><CrmNav canManageSettings/><div className="mb-5"><h1 className="text-3xl font-semibold">CRM settings</h1><p className="mt-2 text-sm text-slate-600">Manage lead sources, campaigns, reusable communication text, and automation rules without changing code.</p></div><CrmSettings data={JSON.parse(JSON.stringify(data))}/></main>;
}

import { BackButton } from "@/components/back-button";
import { requirePagePermission } from "@/server/page-auth";
import { listLetterFieldSettings } from "@/server/services/letter-field-settings";
import { SettingsTabs } from "../settings-tabs";
import { LetterFieldSettingsEditor } from "./letter-field-settings-editor";

export const dynamic = "force-dynamic";

export default async function LetterFieldsSettingsPage() {
  const session = await requirePagePermission("projects.manage");
  const categories = await listLetterFieldSettings(session.tenantId);
  return <main className="min-h-[calc(100vh-4rem)] px-4 py-6 lg:px-8">
    <BackButton fallbackHref="/app" />
    <SettingsTabs active="letters" />
    <LetterFieldSettingsEditor categories={categories} />
  </main>;
}

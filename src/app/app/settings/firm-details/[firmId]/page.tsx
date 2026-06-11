import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/server/session";
import { firmFieldsForUser, firmForUser } from "@/server/services/firms";
import { FirmDetailsEditor } from "./firm-details-editor";
import { BackButton } from "@/components/back-button";

export const dynamic = "force-dynamic";

export default async function FirmDetailPage({ params }: { params: { firmId: string } }) {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const [firm, fields] = await Promise.all([
    firmForUser(session, params.firmId).catch(() => null),
    firmFieldsForUser(session.id),
  ]);
  if (!firm) notFound();

  return (
    <main className="min-h-[calc(100vh-4rem)] px-4 py-6 lg:px-8">
      <BackButton fallbackHref="/app/settings/firm-details" />
      <FirmDetailsEditor
        firm={{
          id: firm.id,
          name: firm.name,
          address: firm.address ?? "",
          pan: firm.pan ?? "",
          email: firm.contactEmail ?? "",
          logoDataUrl: firm.logoDataUrl ?? "",
          authorizedPersons: Array.isArray(firm.authorizedPersons) ? firm.authorizedPersons.map(String) : [""],
          customFields: typeof firm.customFields === "object" && firm.customFields && !Array.isArray(firm.customFields)
            ? firm.customFields as Record<string, string>
            : {},
        }}
        customFields={fields.map((field) => ({ id: field.id, key: field.key, label: field.label }))}
      />
    </main>
  );
}

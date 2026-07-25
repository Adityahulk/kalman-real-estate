import { notFound } from "next/navigation";
import { requirePagePermission } from "@/server/page-auth";
import { firmFieldsForUser, firmForUser } from "@/server/services/firms";
import { FirmDetailsEditor } from "./firm-details-editor";

export const dynamic = "force-dynamic";

export default async function FirmDetailPage(props: { params: Promise<{ firmId: string }> }) {
  const params = await props.params;
  const session = await requirePagePermission("tenant.manage");

  const [firm, fields] = await Promise.all([
    firmForUser(session, params.firmId).catch(() => null),
    firmFieldsForUser(session.id),
  ]);
  if (!firm) notFound();

  return (
    <div>
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
    </div>
  );
}

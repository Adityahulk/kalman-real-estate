import { BackButton } from "@/components/back-button";
import { requireAnyPagePermission } from "@/server/page-auth";
import { MarketingTaskForm } from "../marketing-actions";

export const dynamic = "force-dynamic";

export default async function MarketingNewIdeaPage() {
  await requireAnyPagePermission(["marketing.manage", "marketing.execute"]);
  return (
    <main className="px-4 py-6 lg:px-8">
      <BackButton fallbackHref="/app/marketing" />
      <header className="mb-6 border-b border-slate-200 pb-5">
        <div className="text-sm text-slate-500">Marketing</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Add new project idea</h1>
        <p className="mt-2 text-sm text-slate-600">Create a team idea here and send it for approval.</p>
      </header>
      <div className="max-w-3xl">
        <MarketingTaskForm />
      </div>
    </main>
  );
}

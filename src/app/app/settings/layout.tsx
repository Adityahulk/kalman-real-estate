import { Role } from "@prisma/client";
import { BackButton } from "@/components/back-button";
import { getSessionUser } from "@/server/session";
import { SettingsTabs } from "./settings-tabs";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionUser();
  const canShowUsers = session?.role === Role.SUPER_ADMIN;

  return (
    <main className="min-h-[calc(100vh-4rem)] px-4 py-6 lg:px-8">
      <header className="mb-5">
        <BackButton fallbackHref="/app" />
        <div className="mt-3">
          <h1 className="text-2xl font-semibold text-navy-950">Settings</h1>
          <p className="mt-1 text-sm text-slate-500">Configure the firm, project structure, workflows, and team access.</p>
        </div>
      </header>
      <div className="grid min-w-0 gap-5 lg:grid-cols-[230px_minmax(0,1fr)]">
        <SettingsTabs canShowUsers={canShowUsers} />
        <section className="min-w-0">{children}</section>
      </div>
    </main>
  );
}

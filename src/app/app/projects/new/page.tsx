import { CreateProjectForm } from "../project-actions";
import { BackButton } from "@/components/back-button";

export default function NewProjectPage() {
  return (
    <main className="px-4 py-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <BackButton fallbackHref="/app" />
        <div className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Create project</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            This becomes the workspace for CAD, ownership, registry, documents, development, and cost tracking.
          </p>
        </div>
        <CreateProjectForm />
      </div>
    </main>
  );
}

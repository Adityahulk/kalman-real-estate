import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/server/session";

export default async function ScopedProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const [session, route] = await Promise.all([getSessionUser(), params]);
  if (!session) redirect("/login");
  if (Array.isArray(session.projectIds) && !session.projectIds.includes(route.projectId)) notFound();
  return children;
}

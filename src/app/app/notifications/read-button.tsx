"use client";

import { useRouter } from "next/navigation";

export function NotificationReadButton({ id }: { id: string }) {
  const router = useRouter();
  async function read() {
    await fetch(`/api/v1/notifications/${id}/read`, { method: "POST" });
    router.refresh();
  }
  return <button className="btn-outline h-8 px-3 text-xs" onClick={read}>Mark read</button>;
}

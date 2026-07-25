"use client";

import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  status: string;
  createdAt: string;
};

export function NotificationBell() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unread = items.filter((item) => item.status !== "READ").length;

  async function refresh() {
    const response = await fetch("/api/v1/notifications", { cache: "no-store" });
    const body = await response.json().catch(() => null);
    if (response.ok && Array.isArray(body?.data)) setItems(body.data);
  }

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 30_000);
    const onFocus = () => void refresh();
    const onNotification = () => void refresh();
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("widestate:notification", onNotification);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("widestate:notification", onNotification);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  async function markRead(id: string) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, status: "READ" } : item));
    await fetch(`/api/v1/notifications/${id}/read`, { method: "POST" }).catch(() => undefined);
  }

  return (
    <div className="relative" ref={ref}>
      <button className="btn-ghost relative h-9 w-9 px-0" type="button" onClick={() => setOpen((value) => !value)} title="Notifications" aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`} aria-expanded={open}>
        <Bell size={18} />
        {unread ? <span className="absolute right-0.5 top-0.5 flex min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-4 text-white">{unread > 99 ? "99+" : unread}</span> : null}
      </button>
      {open ? (
        <div className="absolute right-0 top-11 z-40 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <span className="text-sm font-semibold">Notifications</span>
            {unread ? <span className="text-xs text-slate-500">{unread} unread</span> : null}
          </div>
          <div className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
            {items.slice(0, 8).map((item) => (
              <button key={item.id} type="button" className={`w-full px-3 py-3 text-left hover:bg-slate-50 ${item.status === "READ" ? "" : "bg-navy-50/50"}`} onClick={() => void markRead(item.id)}>
                <div className="flex gap-2">
                  {item.status !== "READ" ? <span className="mt-1.5 size-2 shrink-0 rounded-full bg-navy-600" /> : <CheckCheck className="mt-0.5 shrink-0 text-slate-400" size={14} />}
                  <span className="min-w-0"><span className="block text-sm font-medium text-slate-800">{item.title}</span><span className="mt-0.5 block text-xs leading-5 text-slate-600">{item.body}</span><span className="mt-1 block text-[11px] text-slate-400">{new Date(item.createdAt).toLocaleString("en-IN")}</span></span>
                </div>
              </button>
            ))}
            {!items.length ? <div className="px-3 py-8 text-center text-sm text-slate-500">No notifications yet.</div> : null}
          </div>
          <Link className="block border-t border-slate-100 px-3 py-3 text-center text-sm font-medium text-navy-800 hover:bg-slate-50" href="/app/notifications" onClick={() => setOpen(false)}>View all notifications</Link>
        </div>
      ) : null}
    </div>
  );
}

import Link from "next/link";
import { ClipboardList, FileStack, Map, Settings, TextCursorInput } from "lucide-react";

export function SettingsTabs({ active }: { active: "firm" | "files" | "maps" | "letters" | "project-details" }) {
  return (
    <div className="mb-4 mt-2 flex flex-wrap gap-2">
      <Link className={active === "firm" ? "btn-primary" : "btn-outline"} href="/app/settings/firm-details"><Settings size={16} /> Firm details</Link>
      <Link className={active === "project-details" ? "btn-primary" : "btn-outline"} href="/app/settings/project-details"><ClipboardList size={16} /> Project details</Link>
      <Link className={active === "files" ? "btn-primary" : "btn-outline"} href="/app/settings/project-files"><FileStack size={16} /> Project files</Link>
      <Link className={active === "maps" ? "btn-primary" : "btn-outline"} href="/app/settings/project-maps"><Map size={16} /> Project maps</Link>
      <Link className={active === "letters" ? "btn-primary" : "btn-outline"} href="/app/settings/letter-fields"><TextCursorInput size={16} /> Letter fields</Link>
    </div>
  );
}

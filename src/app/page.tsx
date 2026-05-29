import Link from "next/link";
import {
  BadgeIndianRupee,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  GitBranch,
  HardHat,
  Landmark,
  Layers3,
  LineChart,
  Map,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";

const modules = [
  {
    icon: Map,
    title: "CAD Visualization",
    copy: "Upload DXF layouts and turn plots, roads, utilities, labels, and amenities into clickable builder maps.",
  },
  {
    icon: UserRoundCheck,
    title: "Ownership Ledger",
    copy: "Track company inventory, allotments, transfers, registry status, owner records, and append-only plot history.",
  },
  {
    icon: HardHat,
    title: "Site & Plot Development",
    copy: "Monitor roads, boundaries, drainage, utilities, rooms, bathrooms, electrical, plumbing, finishing, and photos.",
  },
  {
    icon: FileText,
    title: "Documents & Registry",
    copy: "Maintain allotment letters, transfer letters, PAN, Aadhaar, registry receipts, deeds, KYC, NOC, and agreements.",
  },
  {
    icon: PlayCircle,
    title: "Marketing Workflow",
    copy: "Assign shoots, upload raw media, manage editor drafts, collect comments, and approve final campaign assets.",
  },
  {
    icon: BadgeIndianRupee,
    title: "Cost Control & AI",
    copy: "Connect BOQ, vendors, POs, invoices, payments, CAD quantities, and AI variance insights in INR.",
  },
];

const proofPoints = [
  "INR budgets, BOQ, purchase orders, invoices, and payment status",
  "Plot allotment, resale transfer, registry tracking, and full audit trail",
  "PAN, Aadhaar, KYC, registry receipt, deed, NOC, and agreement vault",
  "Builder owner, admin, site engineer, finance, marketing, contractor, and plot owner roles",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-navy-950">
      <section className="relative overflow-hidden bg-navy-950 text-white">
        <div className="absolute inset-0 opacity-20">
          <div className="h-full w-full bg-[linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] bg-[size:48px_48px]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <nav className="flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold-shine text-navy-950">
                <Building2 size={21} />
              </span>
              <span>
                <span className="block text-sm font-semibold uppercase tracking-wide text-gold-300">Kalman Estate OS</span>
                <span className="block text-xs text-slate-300">Builder operating system</span>
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <a className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white sm:inline-flex" href="#modules">
                Modules
              </a>
              <Link className="btn-gold" href="/login">
                Sign in
              </Link>
            </div>
          </nav>

          <div className="grid gap-10 py-12 lg:grid-cols-[0.94fr_1.06fr] lg:items-center lg:py-20">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-gold-200">
                <ShieldCheck size={14} />
                Tenant-safe software for real estate builders
              </div>
              <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                The operating system for real estate builders.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                Control CAD maps, plot ownership, registry documents, site progress, marketing execution, costs, and AI reports from one production workspace.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link className="btn-gold h-11 px-5" href="/login">
                  Sign in
                </Link>
                <a className="btn border border-white/15 bg-white/10 text-white hover:bg-white/15" href="#modules">
                  View platform modules
                </a>
              </div>
              <div className="mt-8 grid max-w-2xl gap-3 text-sm text-slate-300 sm:grid-cols-3">
                <div className="border-t border-white/10 pt-3">DXF CAD visualizations</div>
                <div className="border-t border-white/10 pt-3">Plot-level audit history</div>
                <div className="border-t border-white/10 pt-3">Owner-safe document access</div>
              </div>
            </div>

            <ProductPreview />
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
          {proofPoints.map((point) => (
            <div key={point} className="flex gap-3 rounded-lg bg-white p-4 text-sm leading-5 text-slate-700 shadow-sm">
              <CheckCircle2 className="mt-0.5 shrink-0 text-gold-600" size={17} />
              <span>{point}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="modules" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <div className="text-sm font-semibold uppercase tracking-wide text-gold-700">Platform modules</div>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-navy-950 sm:text-4xl">
            One workspace from site plan to handover.
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Built for the practical work of builders: plots, owners, contractors, documents, construction progress, project media, and cost control.
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((module) => (
            <article key={module.title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
              <module.icon className="text-navy-800" size={22} />
              <h3 className="mt-4 text-lg font-semibold text-navy-950">{module.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{module.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-navy-50">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <div>
            <div className="text-sm font-semibold uppercase tracking-wide text-gold-700">Built for Indian builders</div>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-navy-950">
              Ownership and documents are first-class, not an afterthought.
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Builders need more than a CRM. They need a reliable plot ledger, a document vault, and clear history for every allotment, transfer, registry update, and owner-visible file.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["Allotment", "Generate letters, link owners, preserve plot history."],
              ["Transfer", "Record buyer, value, notes, and supporting documents."],
              ["Registry", "Track registry status, receipt, deed, number, and date."],
              ["Owner portal", "Show only approved documents and owner-visible progress."],
            ].map(([title, copy]) => (
              <div key={title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-semibold text-navy-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-navy-950 px-6 py-8 text-white sm:px-8 lg:flex lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Ready to run your builder workspace?</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Sign in to manage CAD, ownership, documents, development, marketing, finance, and AI insights.
            </p>
          </div>
          <Link className="btn-gold mt-5 lg:mt-0" href="/login">
            Sign in to Kalman Estate OS
          </Link>
        </div>
      </section>
    </main>
  );
}

function ProductPreview() {
  return (
    <div className="rounded-lg border border-white/10 bg-white/10 p-3 shadow-2xl backdrop-blur">
      <div className="rounded-lg bg-slate-950 p-4 ring-1 ring-white/10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-400">Vrinda Enclave</div>
            <div className="mt-1 text-lg font-semibold">Live builder command center</div>
          </div>
          <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200">42% complete</span>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-lg border border-white/10 bg-navy-950 p-3">
            <div className="mb-3 flex items-center justify-between text-xs text-slate-300">
              <span className="inline-flex items-center gap-2"><Layers3 size={14} /> CAD site map</span>
              <span>DXF extracted</span>
            </div>
            <svg viewBox="0 0 520 330" className="h-auto w-full rounded-md bg-slate-900">
              <rect width="520" height="330" fill="#071329" />
              <path d="M52 56H468V276H52Z" fill="none" stroke="#64748b" strokeWidth="3" />
              <path d="M78 100H444" stroke="#94a3b8" strokeWidth="18" strokeLinecap="round" opacity=".35" />
              <path d="M78 230H444" stroke="#94a3b8" strokeWidth="18" strokeLinecap="round" opacity=".35" />
              <path d="M254 76V258" stroke="#94a3b8" strokeWidth="16" strokeLinecap="round" opacity=".35" />
              {[
                [98, 122, "A-101"],
                [172, 122, "A-102"],
                [300, 122, "B-201"],
                [374, 122, "B-202"],
                [98, 178, "A-103"],
                [172, 178, "A-104"],
                [300, 178, "B-203"],
                [374, 178, "B-204"],
              ].map(([x, y, label]) => (
                <g key={label}>
                  <rect x={Number(x)} y={Number(y)} width="58" height="42" rx="4" fill="#f4c54222" stroke="#e2b13a" />
                  <text x={Number(x) + 12} y={Number(y) + 25} fill="#f8fafc" fontSize="12">{label}</text>
                </g>
              ))}
              <rect x="206" y="188" width="96" height="48" rx="5" fill="#22c55e22" stroke="#86efac" />
              <text x="226" y="217" fill="#dcfce7" fontSize="12">Park</text>
            </svg>
          </div>

          <div className="space-y-3">
            <PreviewPanel icon={Landmark} label="Ownership" value="A-101 allotted" detail="Owner vault: PAN, Aadhaar, registry receipt" />
            <PreviewPanel icon={ClipboardCheck} label="Progress" value="Bathroom plumbing 70%" detail="Owner-visible update pending approval" />
            <PreviewPanel icon={LineChart} label="Cost control" value="₹8.4L variance risk" detail="AI flags BOQ consumption above plan" />
            <PreviewPanel icon={GitBranch} label="Audit" value="18 plot events" detail="Allotment, transfer, registry, document history" />
            <PreviewPanel icon={Sparkles} label="AI report" value="Weekly summary ready" detail="Delay, wastage, and owner progress insights" />
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewPanel({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Landmark;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.06] p-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
        <Icon size={14} />
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-white">{value}</div>
      <div className="mt-1 text-xs leading-5 text-slate-400">{detail}</div>
    </div>
  );
}

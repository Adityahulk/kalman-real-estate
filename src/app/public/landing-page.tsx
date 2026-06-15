"use client";

import {
  ArrowRight,
  BadgeIndianRupee,
  BellRing,
  Blocks,
  BookOpenCheck,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  Database,
  FileStack,
  HardHat,
  Headphones,
  Layers3,
  LineChart,
  LockKeyhole,
  Mail,
  Map,
  Menu,
  MessageCircle,
  PanelsTopLeft,
  Phone,
  Route,
  Settings2,
  ShieldCheck,
  Target,
  Users,
  Workflow,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { trackLandingEvent } from "./analytics";

const navigation = [
  ["Solutions", "solutions"],
  ["Platform", "platform"],
  ["CRM", "crm"],
  ["Ownership", "ownership"],
  ["Construction", "construction"],
  ["Cost Control", "cost-control"],
  ["Custom Solutions", "custom"],
  ["Our Work", "portfolio"],
  ["About", "implementation"],
] as const;

const problems: Array<[string, string, LucideIcon]> = [
  ["Scattered property records", "Plot, owner, payment and registry information often lives across files, teams and individual systems.", FileStack],
  ["Disconnected sales and inventory", "Sales teams need live availability and reliable customer context before making commitments.", Target],
  ["Progress without one source of truth", "Site updates arrive through calls and messages, making accountability and reporting difficult.", HardHat],
  ["Costs discovered too late", "BOQ, procurement, contractor bills and actual consumption rarely tell one consistent story.", BadgeIndianRupee],
];

const connectedOperations: Array<[LucideIcon, string, string]> = [
  [PanelsTopLeft, "Marketing workflows", "Shoots, raw media, edits, comments and approvals."],
  [BellRing, "Notifications", "Assignments, document events, progress and payment risks."],
  [LockKeyhole, "Role-based access", "Purpose-built views for management, teams, contractors and owners."],
  [BookOpenCheck, "Document archive", "Project records remain searchable beyond daily plot workflows."],
  [MessageCircle, "Reports and sharing", "Management exports and controlled WhatsApp sharing."],
  [Users, "Owner services", "Approved documents and progress through a secure owner portal."],
];

const engagementOptions: Array<[string, string, LucideIcon]> = [
  ["Complete Real Estate Operating System", "Connect management, CRM, ownership, projects, construction, costs and owners in one environment.", Blocks],
  ["Selected Modules", "Begin with the operational area creating the most risk or friction, then expand through connected modules.", Layers3],
  ["Custom Technology Solution", "Build specialized workflows, integrations, portals and reporting around your company’s requirements.", Settings2],
];

const credibilityPoints: Array<[LucideIcon, string, string]> = [
  [Map, "Workflow demonstrations", "See real project, map, ownership and document journeys."],
  [Database, "Migration methodology", "Data is reviewed and reconciled before it becomes operational."],
  [ShieldCheck, "Security principles", "Tenant isolation, permissions, visibility controls and audit history."],
  [Headphones, "Implementation support", "Configuration, training and expansion stay part of the engagement."],
];

const outcomes = [
  "One verified record for every project, plot, owner, document and transaction",
  "Faster allotment, transfer, registry and customer-document workflows",
  "Live visibility into construction, contractors, issues and approvals",
  "Earlier warning of delays, wastage and cost variance",
  "Secure self-service access for owners without exposing internal records",
  "Consistent operating processes across projects, companies and teams",
];

const ownershipFeatures = [
  "Company-held, allotted, transferred and registered inventory",
  "Individual, company and shared ownership structures",
  "PAN, Aadhaar, KYC, agreements, NOCs, receipts and registry deeds",
  "Editable allotment, transfer and registry letter workflows",
  "Signed-page replacement and supporting-document PDF assembly",
  "Chronological, append-only plot and property history",
];

const crmFeatures = [
  "Lead capture from campaigns, portals and referrals",
  "Lead assignment, follow-ups and activity history",
  "Live project and inventory matching",
  "Site visits, bookings and customer document collection",
  "Sales pipeline and team-performance visibility",
  "Connected handover from booking to ownership and service",
];

const constructionFeatures = [
  "Roads, boundaries, drainage, electricity, water and amenities",
  "Plot, unit, floor, room and utility-level progress",
  "Contractor assignment, deadlines, checklists and site issues",
  "Progress photographs, approvals and owner-visible updates",
];

const costFeatures = [
  "Project budgets, BOQ quantities and map-linked measurements",
  "Vendors, contractors, purchase orders, invoices and payments",
  "Planned versus actual quantity and consumption variance",
  "Human-reviewed AI summaries for cost, delay and wastage risks",
];

const customization = [
  "Custom workflows and approval stages",
  "Roles, permissions and project hierarchies",
  "Document templates and management reports",
  "CRM stages, custom fields and integrations",
  "Existing-data migration and builder branding",
  "Owner portal and customer experience",
];

const implementation = [
  ["Understand", "Map your projects, teams, records and current operating workflows."],
  ["Configure", "Set up modules, permissions, approvals, templates and reports."],
  ["Migrate", "Move verified project, inventory, ownership and customer data."],
  ["Launch", "Train teams and go live with selected projects and workflows."],
  ["Expand", "Support adoption, refine processes and extend across the company."],
];

const faqs = [
  ["Can the platform be customized?", "Yes. Workflows, approval stages, fields, roles, reports, document templates, project structures and owner experiences can be configured around your business."],
  ["Can we use only selected modules?", "Yes. You can begin with ownership and documents, CRM, construction, cost control or another priority area, then add connected modules later."],
  ["Can existing project and owner data be migrated?", "Yes. Migration begins with a structured review of your spreadsheets, files and existing systems so that only validated records enter the new workspace."],
  ["Does it work without CAD files?", "Yes. Projects, plots, site assets and detailed hierarchies can be created manually. CAD and PDF plans add spatial visualization when they are available."],
  ["Which drawing formats are supported?", "Current production workflows support DXF and supported vector or mixed PDFs. Complex drawings use guided review before creating live business records."],
  ["Can it connect with our existing CRM or accounting system?", "Yes. WIDESTATE OS can integrate with existing CRM, accounting, storage and business systems where suitable APIs or data exchange methods are available."],
  ["Can owners access their documents and progress?", "Yes. The owner portal shows only approved, owner-visible documents and progress for properties linked to that owner."],
  ["Can multiple projects and companies be managed?", "Yes. The platform supports multiple firms, projects, teams and permission boundaries from one operating environment."],
  ["How are sensitive documents controlled?", "Role-based permissions, file visibility rules, tenant isolation and audit history control access to ownership, KYC, registry and financial records."],
  ["How long does implementation take?", "Timing depends on modules, data quality, integrations and customization. The implementation plan is agreed after the workflow and data review."],
  ["Are training and ongoing support included?", "Implementation includes team onboarding and training. Ongoing support and expansion are planned according to the selected engagement."],
];

type LandingPageProps = {
  whatsappNumber: string;
  salesEmail: string;
};

export function LandingPage({ whatsappNumber, salesEmail }: LandingPageProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const phoneNumber = whatsappNumber.replace(/\D/g, "") || "918292098293";
  const phoneHref = `tel:+${phoneNumber}`;
  const phoneDisplay = phoneNumber === "918292098293" ? "+91 82920 98293" : `+${phoneNumber}`;
  const emailHref = `mailto:${salesEmail}?subject=${encodeURIComponent("WIDESTATE OS enquiry")}`;
  const whatsappHref = useMemo(() => {
    const message = "Hello Kalman Labs, I would like to discuss WIDESTATE OS for our real estate projects.";
    const number = whatsappNumber.replace(/\D/g, "");
    return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : `mailto:${salesEmail}?subject=${encodeURIComponent("WIDESTATE OS consultation")}`;
  }, [salesEmail, whatsappNumber]);
  const whatsappConfigured = Boolean(whatsappNumber.replace(/\D/g, ""));

  return (
    <main className="overflow-x-hidden bg-white text-navy-950">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="#top" className="flex items-center gap-3" aria-label="WIDESTATE OS home">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-navy-950 text-white"><Building2 size={19} /></span>
            <span><span className="block text-sm font-bold">WIDESTATE OS</span><span className="block text-[11px] text-slate-500">by Kalman Labs</span></span>
          </a>
          <nav className="hidden items-center gap-5 xl:flex" aria-label="Primary navigation">
            {navigation.map(([label, id]) => id === "portfolio" ? <Link key={id} className="text-sm font-medium text-slate-600 hover:text-navy-950" href="/portfolio">{label}</Link> : <a key={id} className="text-sm font-medium text-slate-600 hover:text-navy-950" href={`#${id}`}>{label}</a>)}
          </nav>
          <div className="hidden items-center gap-2 sm:flex">
            <Link className="btn-ghost" href="/login">Client sign in</Link>
            <a className="btn-gold" href="#book-demo" onClick={() => trackLandingEvent({ name: "cta_click", location: "header", detail: { action: "book_demo" } })}>Book a Demo</a>
          </div>
          <button className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 xl:hidden" onClick={() => setMenuOpen((value) => !value)} aria-label="Toggle navigation" aria-expanded={menuOpen}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {menuOpen ? (
          <nav className="border-t border-slate-200 bg-white px-4 py-4 xl:hidden" aria-label="Mobile navigation">
            <div className="mx-auto grid max-w-[1440px] gap-1">
              {navigation.map(([label, id]) => id === "portfolio" ? <Link key={id} className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" href="/portfolio" onClick={() => setMenuOpen(false)}>{label}</Link> : <a key={id} className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" href={`#${id}`} onClick={() => setMenuOpen(false)}>{label}</a>)}
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-200 pt-3"><Link className="btn-outline" href="/login">Sign in</Link><a className="btn-gold" href="#book-demo" onClick={() => setMenuOpen(false)}>Book Demo</a></div>
            </div>
          </nav>
        ) : null}
      </header>

      <section id="top" className="relative min-h-[720px] overflow-hidden bg-navy-950 text-white sm:min-h-[780px]">
        <HeroProductScene />
        <div className="absolute inset-0 bg-navy-950/55" />
        <div className="relative mx-auto flex min-h-[720px] max-w-[1440px] items-start px-4 pb-12 pt-20 sm:min-h-[780px] sm:px-6 sm:pb-44 lg:px-8 lg:pt-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-100"><ShieldCheck size={14} /> Real estate technology, configured around your operations</div>
            <h1 className="mt-7 text-4xl font-semibold leading-[1.08] sm:text-5xl lg:text-6xl">Run every real estate project from one intelligent operating system.</h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">Bring project planning, clickable site maps, plot ownership, documents, construction progress, sales CRM, costs, teams and customer services into one connected platform built around the way your company operates.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a className="btn-gold h-12 px-6" href="#book-demo" onClick={() => trackLandingEvent({ name: "cta_click", location: "hero", detail: { action: "book_demo" } })}>Book a Demo <ArrowRight size={17} /></a>
              <a className="btn h-12 border border-white/25 bg-white/10 px-6 text-white hover:bg-white/15" href={whatsappHref} target="_blank" rel="noreferrer" onClick={() => trackLandingEvent({ name: "cta_click", location: "hero", detail: { action: whatsappConfigured ? "whatsapp" : "email" } })}><MessageCircle size={17} /> {whatsappConfigured ? "Talk to Us on WhatsApp" : "Talk to Sales"}</a>
              <Link className="btn h-12 px-2 text-white hover:text-gold-200" href="/portfolio">View Our Work <ArrowRight size={17} /></Link>
            </div>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-300">
              <a className="inline-flex items-center gap-2 hover:text-white" href={phoneHref} onClick={() => trackLandingEvent({ name: "cta_click", location: "hero", detail: { action: "call" } })}><Phone size={15} /> {phoneDisplay}</a>
              <a className="inline-flex items-center gap-2 hover:text-white" href={emailHref} onClick={() => trackLandingEvent({ name: "cta_click", location: "hero", detail: { action: "email" } })}><Mail size={15} /> {salesEmail}</a>
            </div>
            <p className="mt-6 hidden max-w-2xl border-l-2 border-gold-400 pl-4 text-sm leading-6 text-slate-300 sm:block">Designed for real estate builders who have outgrown spreadsheets, disconnected tools, WhatsApp updates and scattered project records.</p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 hidden border-t border-white/10 bg-navy-950/80 backdrop-blur sm:block">
          <div className="mx-auto grid max-w-[1440px] grid-cols-2 gap-px bg-white/10 md:grid-cols-4">
            {[["Projects + CRM", "From enquiry to ownership"], ["Spatial operations", "Plans become clickable workspaces"], ["Control + traceability", "Every change remains accountable"], ["Configured delivery", "Modules, migration and training"]].map(([title, copy]) => (
              <div key={title} className="bg-navy-950/90 px-4 py-5 sm:px-6"><div className="text-sm font-semibold">{title}</div><div className="mt-1 text-xs leading-5 text-slate-400">{copy}</div></div>
            ))}
          </div>
        </div>
      </section>

      <section id="solutions" className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="The operational reality" title="Your projects are connected. Your software should be too." copy="Growth adds projects, people, approvals and customer commitments. The challenge is not a lack of effort; it is keeping every team aligned around reliable information." />
          <div className="mt-10 grid border border-slate-200 bg-white md:grid-cols-2 xl:grid-cols-4">
            {problems.map(([title, copy, Icon], index) => (
              <article key={String(title)} className={`p-6 ${index ? "border-t border-slate-200 md:border-l md:border-t-0" : ""} ${index === 2 ? "md:border-l-0 xl:border-l" : ""}`}>
                <Icon className="text-navy-700" size={22} /><h3 className="mt-5 text-base font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
          <SectionHeading eyebrow="Business outcomes" title="More control for management. Less friction for every team." copy="WIDESTATE OS connects the commercial, legal, construction and customer side of a project without forcing every department into the same screen." />
          <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {outcomes.map((outcome) => <div key={outcome} className="flex gap-3 border-t border-slate-200 pt-4"><CheckCircle2 className="mt-0.5 shrink-0 text-gold-600" size={18} /><span className="text-sm leading-6 text-slate-700">{outcome}</span></div>)}
          </div>
        </div>
      </section>

      <section id="platform" className="border-y border-slate-200 bg-navy-50">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <SectionHeading eyebrow="Interactive project intelligence" title="Turn project drawings into an operational workspace." copy="Upload supported plans to create a review-first, clickable view of plots, roads, utilities, amenities, electrical assets and development areas. Or build the same hierarchy manually when CAD is not required." />
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {["Ownership and registry", "Documents and letters", "Progress and contractors", "Photos, issues and costs", "Complete activity history", "Child drawings and subareas"].map((item) => <div key={item} className="flex items-center gap-2 text-sm text-slate-700"><Check size={16} className="text-gold-700" />{item}</div>)}
              </div>
            </div>
            <InteractiveMapPreview />
          </div>
        </div>
      </section>

      <section id="ownership" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <OwnershipPreview />
          <div>
            <SectionHeading eyebrow="Ownership and legal control" title="Every plot. Every owner. Every document. Every change." copy="Build institutional memory around your most sensitive property records. Ownership, transactions, registry, legal files and generated letters stay connected to the property they belong to." />
            <FeatureList items={ownershipFeatures} />
          </div>
        </div>
      </section>

      <section id="crm" className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <SectionHeading eyebrow="Real estate CRM" title="From first enquiry to booking and customer relationship." copy="Connect lead activity with the projects and inventory your team is actually selling, then carry verified customer information forward into ownership, documents and service." />
              <FeatureList items={crmFeatures} />
            </div>
            <CrmPreview />
          </div>
        </div>
      </section>

      <section id="construction" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-2">
          <CapabilityBand icon={HardHat} eyebrow="Construction and development" title="Accountability from site infrastructure to room-level work." copy="Give management, engineers and contractors the right view of progress without losing the spatial context of the project." items={constructionFeatures} />
          <CapabilityBand id="cost-control" icon={LineChart} eyebrow="Cost, BOQ and intelligence" title="See variance while there is still time to act." copy="Connect planned quantities, procurement, bills and payments, then use project data to support management decisions." items={costFeatures} />
        </div>
      </section>

      <section className="border-y border-slate-200 bg-navy-950 text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
            <div><div className="text-xs font-semibold uppercase tracking-wider text-gold-300">Connected operations</div><h2 className="mt-3 text-3xl font-semibold">The supporting workflows your teams still need.</h2></div>
            <div className="grid gap-px overflow-hidden rounded-md bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
              {connectedOperations.map(([Icon, title, copy]) => <div key={title} className="bg-navy-950 p-5"><Icon size={20} className="text-gold-300" /><h3 className="mt-4 font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{copy}</p></div>)}
            </div>
          </div>
        </div>
      </section>

      <section id="custom" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Custom solutions" title="Your company should not have to change its entire process to fit its software." copy="Kalman Labs works as an implementation and technology partner. We configure the operating model, migrate the right records, train teams and integrate existing systems where that is the better business decision." centered />
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {engagementOptions.map(([title, copy, Icon], index) => <article key={title} className={`rounded-md border p-6 ${index === 0 ? "border-navy-900 bg-navy-950 text-white" : "border-slate-200 bg-white"}`}><Icon size={23} className={index === 0 ? "text-gold-300" : "text-navy-700"} /><h3 className="mt-5 text-lg font-semibold">{title}</h3><p className={`mt-2 text-sm leading-6 ${index === 0 ? "text-slate-300" : "text-slate-600"}`}>{copy}</p></article>)}
        </div>
        <div className="mt-8 grid gap-3 border-t border-slate-200 pt-7 sm:grid-cols-2 lg:grid-cols-3">
          {customization.map((item) => <div key={item} className="flex items-center gap-3 text-sm text-slate-700"><Workflow size={16} className="text-gold-700" />{item}</div>)}
        </div>
      </section>

      <section id="implementation" className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Implementation partnership" title="A credible path from current process to working system." copy="The objective is adoption and reliable data, not simply switching on software." />
          <ol className="mt-10 grid border border-slate-200 bg-white md:grid-cols-5">
            {implementation.map(([title, copy], index) => <li key={title} className={`p-5 ${index ? "border-t border-slate-200 md:border-l md:border-t-0" : ""}`}><span className="text-xs font-semibold text-gold-700">0{index + 1}</span><h3 className="mt-4 font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{copy}</p></li>)}
          </ol>
          <div className="mt-10 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <div><div className="text-xs font-semibold uppercase tracking-wider text-gold-700">Credibility without theatre</div><h3 className="mt-3 text-2xl font-semibold">Proof should come from working systems and accountable delivery.</h3></div>
            <div className="grid gap-3 sm:grid-cols-2">
              {credibilityPoints.map(([Icon, title, copy]) => <div key={title} className="rounded-md border border-slate-200 bg-white p-5"><Icon size={19} className="text-navy-700" /><h4 className="mt-3 font-semibold">{title}</h4><p className="mt-1 text-sm leading-6 text-slate-600">{copy}</p></div>)}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Frequently asked questions" title="Questions builders ask before moving forward." centered />
        <div className="mt-9 divide-y divide-slate-200 border-y border-slate-200">
          {faqs.map(([question, answer]) => <Faq key={question} question={question} answer={answer} />)}
        </div>
      </section>

      <section id="book-demo" className="bg-navy-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-gold-300">Speak with Kalman Labs</div>
            <h2 className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl">See how WIDESTATE OS can work around your projects.</h2>
            <p className="mt-4 text-base leading-7 text-slate-300">Send a short enquiry or speak with us directly. We will understand your requirement and arrange the right product conversation.</p>
            <div className="mt-8 space-y-4">
              {["Discuss the workflows creating the most friction", "See relevant product journeys, not a generic tour", "Understand configuration, migration and rollout options"].map((item) => <div key={item} className="flex gap-3 text-sm text-slate-200"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-gold-300" />{item}</div>)}
            </div>
            <div className="mt-8 grid gap-3">
              <ContactLink icon={MessageCircle} label="WhatsApp us" detail={phoneDisplay} href={whatsappHref} external onClick={() => trackLandingEvent({ name: "cta_click", location: "final_cta", detail: { action: "whatsapp" } })} />
              <ContactLink icon={Phone} label="Call us" detail={phoneDisplay} href={phoneHref} onClick={() => trackLandingEvent({ name: "cta_click", location: "final_cta", detail: { action: "call" } })} />
              <ContactLink icon={Mail} label="Email us" detail={salesEmail} href={emailHref} onClick={() => trackLandingEvent({ name: "cta_click", location: "final_cta", detail: { action: "email" } })} />
            </div>
          </div>
          <DemoRequestForm />
        </div>
      </section>

      <footer className="border-t border-slate-800 bg-navy-950 pb-20 text-slate-400 sm:pb-0">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 px-4 py-8 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-white"><Building2 size={17} /></span><div><div className="text-sm font-semibold text-white">WIDESTATE OS</div><div className="text-xs">Real estate technology by Kalman Labs</div></div></div>
          <div className="flex flex-wrap items-center gap-5 text-xs"><a href={phoneHref} className="hover:text-white">{phoneDisplay}</a><a href={`mailto:${salesEmail}`} className="hover:text-white">{salesEmail}</a><Link href="/login" className="hover:text-white">Client sign in</Link><span>© {new Date().getFullYear()} Kalman Labs</span></div>
        </div>
      </footer>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white p-3 sm:hidden">
        <div className="grid grid-cols-2 gap-2">
          <a className="btn-outline w-full" href={phoneHref} onClick={() => trackLandingEvent({ name: "cta_click", location: "mobile_sticky", detail: { action: "call" } })}><Phone size={16} /> Call</a>
          <a className="btn-gold w-full" href={whatsappHref} target="_blank" rel="noreferrer" onClick={() => trackLandingEvent({ name: "cta_click", location: "mobile_sticky", detail: { action: "whatsapp" } })}><MessageCircle size={16} /> WhatsApp</a>
        </div>
      </div>
    </main>
  );
}

function SectionHeading({ eyebrow, title, copy, centered = false }: { eyebrow: string; title: string; copy?: string; centered?: boolean }) {
  return <div className={centered ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}><div className="text-xs font-semibold uppercase tracking-wider text-gold-700">{eyebrow}</div><h2 className="mt-3 text-3xl font-semibold leading-tight text-navy-950 sm:text-4xl">{title}</h2>{copy ? <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">{copy}</p> : null}</div>;
}

function FeatureList({ items }: { items: string[] }) {
  return <div className="mt-7 grid gap-3 sm:grid-cols-2">{items.map((item) => <div key={item} className="flex gap-3 text-sm leading-6 text-slate-700"><Check className="mt-1 shrink-0 text-gold-700" size={16} />{item}</div>)}</div>;
}

function CapabilityBand({ id, icon: Icon, eyebrow, title, copy, items }: { id?: string; icon: typeof HardHat; eyebrow: string; title: string; copy: string; items: string[] }) {
  return <article id={id} className="rounded-md border border-slate-200 bg-white p-6 sm:p-8"><Icon className="text-navy-700" size={24} /><div className="mt-6 text-xs font-semibold uppercase tracking-wider text-gold-700">{eyebrow}</div><h2 className="mt-3 text-2xl font-semibold leading-tight">{title}</h2><p className="mt-3 text-sm leading-6 text-slate-600">{copy}</p><FeatureList items={items} /></article>;
}

function Faq({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return <div><button className="flex w-full items-center justify-between gap-4 py-5 text-left" onClick={() => setOpen((value) => !value)} aria-expanded={open}><span className="font-semibold">{question}</span><ChevronDown className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} size={18} /></button>{open ? <p className="max-w-3xl pb-5 text-sm leading-7 text-slate-600">{answer}</p> : null}</div>;
}

function ContactLink({ icon: Icon, label, detail, href, external = false, onClick }: { icon: LucideIcon; label: string; detail: string; href: string; external?: boolean; onClick: () => void }) {
  return (
    <a className="flex items-center gap-4 border-t border-white/15 py-3 text-white transition-colors hover:border-gold-300 hover:text-gold-200" href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} onClick={onClick}>
      <Icon size={20} className="shrink-0 text-gold-300" />
      <span className="min-w-0"><span className="block text-sm font-semibold">{label}</span><span className="block break-all text-xs text-slate-400">{detail}</span></span>
      <ArrowRight size={16} className="ml-auto shrink-0" />
    </a>
  );
}

function DemoRequestForm() {
  const [state, setState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setState("submitting");
    setMessage("");
    const data = Object.fromEntries(new FormData(form));
    const response = await fetch("/api/v1/public/demo-requests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setState("error");
      setMessage(body?.error ?? "We could not send your request. Please try again.");
      return;
    }
    form.reset();
    setState("success");
    setMessage("Thank you. Our team will contact you shortly.");
    trackLandingEvent({ name: "demo_request_submitted", location: "lead_form", detail: { requirement: String(data.requirement ?? "") } });
  }

  return (
    <form onSubmit={submit} className="rounded-md bg-white p-5 text-navy-950 shadow-soft sm:p-7">
      <div className="flex items-start justify-between gap-4"><div><h3 className="text-xl font-semibold">Request a demo</h3><p className="mt-1 text-sm text-slate-600">Share your contact details and main requirement.</p></div><Route className="text-gold-700" size={23} /></div>
      <input className="hidden" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <FormField label="Name" name="name" autoComplete="name" required />
        <FormField label="Company" name="company" autoComplete="organization" required />
        <FormField label="Phone / WhatsApp number" name="phone" type="tel" autoComplete="tel" required />
        <label className="sm:col-span-2"><span className="label">Main requirement</span><select className="input h-10" name="requirement" required defaultValue=""><option value="" disabled>Select your priority</option><option>Complete operating system</option><option>CRM and lead management</option><option>Plot ownership and documents</option><option>CAD and project visualization</option><option>Construction and contractor tracking</option><option>Cost, BOQ and finance control</option><option>Custom real estate solution</option></select></label>
      </div>
      {message ? <div className={`mt-4 rounded-md px-3 py-2 text-sm ${state === "success" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`} role="status">{message}</div> : null}
      <button className="btn-gold mt-5 h-11 w-full" disabled={state === "submitting"}>{state === "submitting" ? "Sending enquiry…" : "Send enquiry"}{state !== "submitting" ? <ArrowRight size={17} /> : null}</button>
      <p className="mt-3 text-center text-xs leading-5 text-slate-500">Your details are used only to respond to this business enquiry.</p>
    </form>
  );
}

function FormField({ label, name, type = "text", autoComplete, required = false }: { label: string; name: string; type?: string; autoComplete?: string; required?: boolean }) {
  return <label><span className="label">{label}</span><input className="input h-10" name={name} type={type} autoComplete={autoComplete} required={required} /></label>;
}

function HeroProductScene() {
  return (
    <div className="absolute inset-y-0 left-[38%] right-[-8%] hidden opacity-90 lg:block" aria-hidden="true">
      <div className="absolute inset-0 bg-slate-100">
        <div className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-5 text-navy-950"><div className="flex items-center gap-3"><span className="h-7 w-7 rounded bg-navy-900" /><span className="text-sm font-semibold">Vrinda Enclave · Command Center</span></div><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs text-emerald-800">Live project</span></div>
        <div className="grid h-[calc(100%-3.5rem)] grid-cols-[180px_1fr]">
          <div className="border-r border-slate-200 bg-white p-4">
            {["Project overview", "Site map", "Ownership", "Construction", "Sales CRM", "Cost control"].map((item, index) => <div key={item} className={`mb-2 rounded-md px-3 py-2 text-xs ${index === 1 ? "bg-navy-950 text-white" : "text-slate-600"}`}>{item}</div>)}
          </div>
          <div className="p-5">
            <div className="grid grid-cols-4 gap-3">{[["474", "Total plots"], ["126", "Available"], ["68%", "Site progress"], ["₹8.4L", "Variance risk"]].map(([value, label]) => <div key={label} className="rounded-md border border-slate-200 bg-white p-3 text-navy-950"><div className="text-lg font-semibold">{value}</div><div className="mt-1 text-[10px] text-slate-500">{label}</div></div>)}</div>
            <div className="mt-4 grid h-[470px] grid-cols-[1fr_220px] gap-4">
              <div className="relative overflow-hidden rounded-md border border-slate-200 bg-slate-900 p-6">
                <div className="relative grid h-full grid-cols-5 gap-2">
                  {Array.from({ length: 25 }, (_, index) => <div key={index} className={`flex items-center justify-center border text-[9px] ${[7, 8, 13].includes(index) ? "border-emerald-400 bg-emerald-500/25 text-emerald-100" : index === 12 ? "border-gold-300 bg-gold-400/25 text-white" : "border-navy-300 bg-navy-400/20 text-slate-200"}`}>{index === 12 ? "A-101" : index + 101}</div>)}
                </div>
              </div>
              <div className="space-y-3">
                {[["Plot A-101", "Allotted · Registry pending"], ["Construction", "Plumbing 70%"], ["Documents", "8 verified · 1 missing"], ["Lead pipeline", "42 active enquiries"], ["Project alert", "Boundary work delayed"]].map(([title, copy]) => <div key={title} className="rounded-md border border-slate-200 bg-white p-3 text-navy-950"><div className="text-xs font-semibold">{title}</div><div className="mt-1 text-[10px] text-slate-500">{copy}</div></div>)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InteractiveMapPreview() {
  return <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-soft"><div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><div className="flex items-center gap-2 text-sm font-semibold"><Map size={17} /> Project map</div><div className="flex gap-2 text-[10px] text-slate-500"><span>Plots</span><span>Utilities</span><span>Development</span></div></div><div className="grid min-h-[400px] sm:grid-cols-[150px_1fr_180px]"><div className="hidden border-r border-slate-200 bg-slate-50 p-3 sm:block">{["Plot inventory", "Road network", "Electrical", "Drainage", "Amenities"].map((item, index) => <div key={item} className={`mb-2 rounded px-2 py-2 text-xs ${index === 0 ? "bg-white font-medium shadow-sm" : "text-slate-500"}`}>{item}</div>)}</div><div className="relative bg-slate-900 p-5"><div className="relative grid h-full grid-cols-4 gap-2">{Array.from({ length: 20 }, (_, index) => <div key={index} className={`flex min-h-12 items-center justify-center border text-[10px] ${index === 6 ? "border-gold-300 bg-gold-400/30 text-white" : "border-navy-300 bg-navy-500/20 text-slate-200"}`}>{index + 201}</div>)}</div></div><div className="border-l border-slate-200 p-4"><div className="text-[10px] uppercase text-slate-500">Selected plot</div><div className="mt-1 font-semibold">Plot 207</div><dl className="mt-5 space-y-4 text-xs"><div><dt className="text-slate-500">Ownership</dt><dd className="mt-1 font-medium">Company inventory</dd></div><div><dt className="text-slate-500">Documents</dt><dd className="mt-1 font-medium">No allotment yet</dd></div><div><dt className="text-slate-500">Development</dt><dd className="mt-1 font-medium">Site services ready</dd></div></dl><button className="btn-primary mt-6 h-9 w-full px-2 text-xs">Open workspace</button></div></div></div>;
}

function OwnershipPreview() {
  return <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-soft"><div className="border-b border-slate-200 px-5 py-4"><div className="text-xs uppercase text-slate-500">Plot trust record</div><div className="mt-1 flex items-center justify-between"><h3 className="font-semibold">A-101 · Ownership timeline</h3><span className="chip bg-emerald-50 text-emerald-800">Registered</span></div></div><div className="p-5"><div className="space-y-0">{[["12 Mar 2024", "Plot created from reviewed site plan", "Company inventory"], ["18 Apr 2024", "Allotted to Saloni Mehta", "₹54,00,000"], ["20 Apr 2024", "Allotment letter approved", "Document issued"], ["08 Jan 2025", "Registry completed", "Deed and receipt verified"]].map(([date, title, detail], index) => <div key={title} className="grid grid-cols-[18px_1fr] gap-3"><div className="flex flex-col items-center"><span className={`mt-1 h-3 w-3 rounded-full ${index === 3 ? "bg-gold-500" : "bg-navy-400"}`} />{index < 3 ? <span className="h-16 w-px bg-slate-200" /> : null}</div><div><div className="text-[10px] text-slate-500">{date}</div><div className="mt-1 text-sm font-medium">{title}</div><div className="text-xs text-slate-500">{detail}</div></div></div>)}</div><div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-200 pt-4">{[["8", "Documents"], ["4", "Legal events"], ["100%", "Audit history"]].map(([value, label]) => <div key={label} className="rounded-md bg-slate-50 p-3"><div className="font-semibold">{value}</div><div className="text-[10px] text-slate-500">{label}</div></div>)}</div></div></div>;
}

function CrmPreview() {
  return <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-soft"><div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><div className="text-xs uppercase text-slate-500">Sales CRM</div><h3 className="mt-1 font-semibold">Live opportunity pipeline</h3></div><span className="chip bg-navy-50 text-navy-800">42 active</span></div><div className="grid gap-3 p-4 sm:grid-cols-3">{[["New enquiries", "18", ["Amit Sharma", "Pooja Bansal", "RKS Holdings"]], ["Site visits", "9", ["Neeraj Arora", "Mehta Family", "Orbit Retail"]], ["Booking discussion", "5", ["Sonia Khanna", "Agarwal Foods", "Jain Associates"]]].map(([stage, count, leads]) => <div key={String(stage)} className="rounded-md bg-slate-50 p-3"><div className="flex items-center justify-between"><span className="text-xs font-semibold">{stage}</span><span className="text-xs text-slate-500">{count}</span></div><div className="mt-3 space-y-2">{(leads as string[]).map((lead, index) => <div key={lead} className="rounded-md border border-slate-200 bg-white p-3"><div className="text-xs font-medium">{lead}</div><div className="mt-1 text-[10px] text-slate-500">{index === 0 ? "Vrinda Enclave · A-101" : index === 1 ? "Ananta Enclave · Shortlist" : "Follow-up due today"}</div></div>)}</div></div>)}</div><div className="grid grid-cols-3 border-t border-slate-200"><div className="p-4"><div className="text-lg font-semibold">₹4.8 Cr</div><div className="text-[10px] text-slate-500">Open pipeline value</div></div><div className="border-l border-slate-200 p-4"><div className="text-lg font-semibold">12</div><div className="text-[10px] text-slate-500">Visits this week</div></div><div className="border-l border-slate-200 p-4"><div className="text-lg font-semibold">7</div><div className="text-[10px] text-slate-500">Inventory matches</div></div></div></div>;
}

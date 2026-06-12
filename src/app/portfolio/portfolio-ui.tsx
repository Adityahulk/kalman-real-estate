"use client";

import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Building2,
  Check,
  ChevronDown,
  CircleDot,
  Download,
  FileText,
  HardHat,
  Layers3,
  Mail,
  Map,
  Menu,
  MessageCircle,
  Phone,
  ShieldCheck,
  Users,
  Workflow,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { connectedJourney, evidenceLabel, portfolioSolutions, publicEngagements, type PortfolioEngagement } from "./portfolio-data";
import { trackLandingEvent } from "../public/analytics";

const phone = "+91 82920 98293";
const whatsappHref = "https://wa.me/918292098293?text=Hello%20Kalman%20Labs%2C%20I%20would%20like%20to%20discuss%20a%20real%20estate%20technology%20requirement.";
const emailHref = "mailto:company@kalman-labs.com?subject=Real%20estate%20technology%20enquiry";

export function PortfolioHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-navy-950 text-white"><Building2 size={19} /></span>
          <span><span className="block text-sm font-bold">KALMAN LABS</span><span className="block text-[11px] text-slate-500">Real estate technology</span></span>
        </Link>
        <nav className="hidden items-center gap-6 lg:flex" aria-label="Portfolio navigation">
          <Link href="/portfolio" className="text-sm font-medium text-slate-600 hover:text-navy-950">Portfolio</Link>
          <Link href="/portfolio/solutions" className="text-sm font-medium text-slate-600 hover:text-navy-950">Solutions</Link>
          <Link href="/portfolio/engagements" className="text-sm font-medium text-slate-600 hover:text-navy-950">Engagements</Link>
          <a href="/portfolio/Kalman-Labs-Real-Estate-Technology-Portfolio.pdf" className="text-sm font-medium text-slate-600 hover:text-navy-950" download>Download portfolio</a>
        </nav>
        <div className="hidden items-center gap-2 sm:flex">
          <a href={whatsappHref} target="_blank" rel="noreferrer" className="btn-outline" onClick={() => trackLandingEvent({ name: "portfolio_whatsapp", location: "portfolio_header" })}><MessageCircle size={16} /> WhatsApp</a>
          <a href="/#book-demo" className="btn-gold">Discuss a project</a>
        </div>
        <button className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 lg:hidden" aria-label="Toggle portfolio navigation" onClick={() => setOpen((value) => !value)}>{open ? <X size={20} /> : <Menu size={20} />}</button>
      </div>
      {open ? <nav className="grid gap-1 border-t border-slate-200 bg-white px-4 py-4 lg:hidden"><Link className="px-3 py-2" href="/portfolio">Portfolio</Link><Link className="px-3 py-2" href="/portfolio/solutions">Solutions</Link><Link className="px-3 py-2" href="/portfolio/engagements">Engagements</Link><a className="px-3 py-2" href="/portfolio/Kalman-Labs-Real-Estate-Technology-Portfolio.pdf" download>Download portfolio</a></nav> : null}
    </header>
  );
}

export function PortfolioFooter() {
  return (
    <>
      <section className="bg-navy-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-end lg:px-8">
          <div><div className="text-xs font-semibold uppercase tracking-wider text-gold-300">Start with your actual requirement</div><h2 className="mt-4 max-w-3xl text-3xl font-semibold sm:text-4xl">Let us understand your projects before recommending the software.</h2><p className="mt-4 max-w-2xl text-slate-300">We can implement the complete platform, selected modules, or a custom real estate technology solution around your existing operations.</p></div>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
            <a className="btn-gold" href={whatsappHref} target="_blank" rel="noreferrer"><MessageCircle size={16} /> WhatsApp</a>
            <a className="btn border border-white/20 text-white" href="tel:+918292098293"><Phone size={16} /> Call {phone}</a>
            <a className="btn border border-white/20 text-white" href={emailHref}><Mail size={16} /> Email</a>
          </div>
        </div>
      </section>
      <footer className="border-t border-slate-800 bg-navy-950 pb-20 text-slate-400 sm:pb-0">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 px-4 py-8 text-xs sm:flex-row sm:items-center sm:px-6 lg:px-8"><span>Kalman Labs · Real estate technology and implementation</span><span>{phone} · company@kalman-labs.com</span></div>
      </footer>
      <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 gap-2 border-t border-slate-200 bg-white p-3 sm:hidden"><a className="btn-outline" href="tel:+918292098293"><Phone size={16} /> Call</a><a className="btn-gold" href={whatsappHref} target="_blank" rel="noreferrer"><MessageCircle size={16} /> WhatsApp</a></div>
    </>
  );
}

export function PortfolioHome() {
  return (
    <main className="overflow-x-hidden bg-white text-navy-950">
      <PortfolioHeader />
      <section className="relative overflow-hidden bg-navy-950 text-white">
        <div className="absolute inset-y-0 right-0 hidden w-[48%] lg:block"><PortfolioSystemVisual /></div>
        <div className="relative mx-auto grid min-h-[690px] max-w-[1440px] items-center px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-wider text-gold-300">Kalman Labs · Real estate technology partner</div>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.08] sm:text-5xl lg:text-6xl">Real estate technology built around your projects, teams and operations.</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">We build and implement connected technology for plotted developers, residential builders, commercial projects and multi-project real estate companies.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link className="btn-gold h-12 px-6" href="/portfolio/engagements">View selected work <ArrowRight size={17} /></Link><a className="btn h-12 border border-white/20 px-6 text-white" href="/portfolio/Kalman-Labs-Real-Estate-Technology-Portfolio.pdf" download><Download size={17} /> Download portfolio</a></div>
            <div className="mt-10 grid gap-5 border-t border-white/15 pt-6 sm:grid-cols-3">{[["Products", "WIDESTATE OS + CRM/CLM"], ["Delivery", "Configuration to support"], ["Coverage", "Sales to owner service"]].map(([label, value]) => <div key={label}><div className="text-xs text-slate-400">{label}</div><div className="mt-1 text-sm font-semibold">{value}</div></div>)}</div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <PortfolioHeading eyebrow="Who we work with" title="Different builders need different operating models." copy="Our platforms and implementation approach are designed for plotted developments, residential and commercial projects, townships, growing builders and established multi-project groups." />
          <div className="mt-9 grid border border-slate-200 bg-white sm:grid-cols-2 lg:grid-cols-4">{["Plotted developers", "Residential builders", "Commercial projects", "Multi-project groups"].map((item, index) => <div key={item} className={`p-6 ${index ? "border-t border-slate-200 sm:border-l sm:border-t-0" : ""} ${index === 2 ? "sm:border-l-0 lg:border-l" : ""}`}><Building2 size={21} className="text-navy-600" /><h3 className="mt-4 font-semibold">{item}</h3><p className="mt-2 text-sm leading-6 text-slate-600">Connected workflows configured around project structure, teams, approvals and existing systems.</p></div>)}</div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <PortfolioHeading eyebrow="Products and platforms" title="A connected platform, specialist suites, and room for custom work." copy="Builders can begin with the area creating the most risk or friction, then expand without rebuilding the operational foundation." />
        <div className="mt-10 grid gap-x-8 gap-y-10 md:grid-cols-2">
          {portfolioSolutions.map((solution, index) => <article key={solution.slug} className="border-t border-slate-200 pt-5"><div className="flex items-start justify-between gap-4"><div><div className="text-xs font-semibold uppercase tracking-wider text-gold-700">{solution.eyebrow}</div><h3 className="mt-2 text-xl font-semibold">{solution.label}</h3></div><span className="text-3xl font-semibold text-slate-200">0{index + 1}</span></div><p className="mt-3 text-sm leading-7 text-slate-600">{solution.summary}</p><div className="mt-4 grid gap-2">{solution.outcomes.map((outcome) => <div key={outcome} className="flex gap-2 text-sm text-slate-700"><Check size={16} className="mt-0.5 shrink-0 text-gold-700" />{outcome}</div>)}</div></article>)}
        </div>
        <Link className="mt-10 inline-flex items-center gap-2 font-semibold text-navy-700" href="/portfolio/solutions">Explore the solution portfolio <ArrowRight size={17} /></Link>
      </section>

      <section className="border-y border-slate-200 bg-navy-50">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <PortfolioHeading eyebrow="Connected real estate journey" title="One operating thread from first enquiry to owner service." copy="Information should move forward with the customer and property instead of being recreated by every department." />
          <Journey />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><PortfolioHeading eyebrow="Selected builders, projects and engagements" title="Proof across products, engagements and specialist workflows." copy="Named delivery work, confidential engagements and configurable solutions are labelled separately so the evidence remains credible." /><Link className="btn-outline shrink-0" href="/portfolio/engagements">View all engagements <ArrowRight size={16} /></Link></div>
        <div className="mt-10 grid gap-5 lg:grid-cols-3">{publicEngagements.slice(0, 6).map((engagement) => <EngagementCard key={engagement.slug} engagement={engagement} />)}</div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.75fr_1.25fr] lg:px-8">
          <PortfolioHeading eyebrow="Implementation partnership" title="Software delivery is only useful when teams can operate it." copy="Kalman Labs covers workflow discovery, configuration, migration, cloud deployment, training, support and expansion." />
          <div className="grid gap-px overflow-hidden border border-slate-200 bg-slate-200 sm:grid-cols-2">{[["01", "Understand", "Projects, teams, records and current workflows."], ["02", "Configure", "Modules, roles, approvals, documents and reports."], ["03", "Migrate + launch", "Verified data, selected projects and team training."], ["04", "Support + expand", "Adoption, improvement and company-wide rollout."]].map(([number, title, copy]) => <div key={number} className="bg-white p-6"><div className="text-xs font-semibold text-gold-700">{number}</div><h3 className="mt-4 font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{copy}</p></div>)}</div>
        </div>
      </section>
      <PortfolioFooter />
    </main>
  );
}

export function SolutionsPage() {
  return <main className="bg-white text-navy-950"><PortfolioHeader /><PageHero eyebrow="Solution portfolio" title="Choose the complete operating system, selected modules, or a custom build." copy="Every solution is connected by a common principle: the property, customer, documents, teams and decisions should share reliable operational context." /><section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8"><div className="space-y-16">{portfolioSolutions.map((solution, index) => <article key={solution.slug} id={solution.slug} className="grid gap-8 border-t border-slate-200 pt-10 lg:grid-cols-[0.7fr_1.3fr]"><div><div className="text-xs font-semibold uppercase tracking-wider text-gold-700">0{index + 1} · {solution.eyebrow}</div><h2 className="mt-3 text-3xl font-semibold">{solution.label}</h2></div><div><p className="text-base leading-8 text-slate-600">{solution.summary}</p><div className="mt-7 grid gap-4 sm:grid-cols-3">{solution.outcomes.map((outcome) => <div key={outcome} className="border-l-2 border-gold-500 pl-4 text-sm leading-6 text-slate-700">{outcome}</div>)}</div></div></article>)}</div></section><PortfolioFooter /></main>;
}

export function EngagementsPage() {
  const categories = useMemo(() => ["All", ...Array.from(new Set(publicEngagements.flatMap((item) => item.categories)))], []);
  const [filter, setFilter] = useState("All");
  const visible = filter === "All" ? publicEngagements : publicEngagements.filter((item) => item.categories.includes(filter));
  return <main className="bg-white text-navy-950"><PortfolioHeader /><PageHero eyebrow="Selected engagements" title="Different requirements. One disciplined delivery approach." copy="This portfolio separates named client engagements, confidential engagements and configurable product capabilities. No product scenario is presented as client delivery without evidence." /><section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8"><div className="flex gap-2 overflow-x-auto pb-3">{categories.map((category) => <button key={category} onClick={() => setFilter(category)} className={`shrink-0 rounded-full px-4 py-2 text-sm ${filter === category ? "bg-navy-950 text-white" : "border border-slate-200 bg-white text-slate-600"}`}>{category}</button>)}</div><div className="mt-8 grid gap-5 lg:grid-cols-3">{visible.map((engagement) => <EngagementCard key={engagement.slug} engagement={engagement} />)}</div></section><PortfolioFooter /></main>;
}

export function CaseStudyPage({ engagement }: { engagement: PortfolioEngagement }) {
  return <main className="bg-white text-navy-950"><PortfolioHeader /><section className="border-b border-slate-200 bg-slate-50"><div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8"><Link href="/portfolio/engagements" className="text-sm text-slate-600">← All engagements</Link><div className="mt-8 grid gap-10 lg:grid-cols-[1fr_0.55fr]"><div><EvidencePill engagement={engagement} /><h1 className="mt-5 text-4xl font-semibold sm:text-5xl">{engagement.displayName}</h1><p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">{engagement.summary}</p></div><div className="border-l border-slate-200 pl-6"><div className="text-xs uppercase text-slate-500">Engagement status</div><div className="mt-2 font-semibold">{engagement.status}</div>{engagement.projects?.length ? <><div className="mt-6 text-xs uppercase text-slate-500">Projects</div><div className="mt-2 text-sm leading-7">{engagement.projects.join(" · ")}</div></> : null}</div></div></div></section><section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8"><div className="grid gap-12 lg:grid-cols-2"><div><div className="text-xs font-semibold uppercase tracking-wider text-gold-700">Business requirement</div><h2 className="mt-3 text-2xl font-semibold">What the engagement needed to solve</h2><p className="mt-4 leading-8 text-slate-600">{engagement.requirement}</p></div><ProductProofVisual /></div><div className="mt-16 grid gap-10 border-t border-slate-200 pt-10 lg:grid-cols-2"><div><h2 className="text-2xl font-semibold">Workflows delivered</h2><div className="mt-6 grid gap-3">{engagement.delivered.map((item) => <div key={item} className="flex gap-3 text-sm text-slate-700"><BadgeCheck size={18} className="shrink-0 text-gold-700" />{item}</div>)}</div></div><div><h2 className="text-2xl font-semibold">Operational value</h2><div className="mt-6 grid gap-3">{engagement.outcomes.map((item) => <div key={item} className="border-l-2 border-navy-300 pl-4 text-sm leading-6 text-slate-700">{item}</div>)}</div></div></div></section><PortfolioFooter /></main>;
}

function PageHero({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return <section className="bg-navy-950 text-white"><div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8"><div className="text-xs font-semibold uppercase tracking-wider text-gold-300">{eyebrow}</div><h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-tight sm:text-5xl">{title}</h1><p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">{copy}</p></div></section>;
}

function PortfolioHeading({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return <div className="max-w-3xl"><div className="text-xs font-semibold uppercase tracking-wider text-gold-700">{eyebrow}</div><h2 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">{title}</h2><p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">{copy}</p></div>;
}

function EvidencePill({ engagement }: { engagement: PortfolioEngagement }) {
  const style = engagement.evidence === "NAMED_ENGAGEMENT" ? "bg-emerald-50 text-emerald-800" : engagement.evidence === "CONFIDENTIAL_ENGAGEMENT" ? "bg-navy-50 text-navy-800" : "bg-slate-100 text-slate-700";
  return <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${style}`}><CircleDot size={13} /> {evidenceLabel(engagement.evidence)}</span>;
}

function EngagementCard({ engagement }: { engagement: PortfolioEngagement }) {
  const href = engagement.evidence === "PRODUCT_CAPABILITY" ? "/portfolio/solutions" : `/portfolio/case-studies/${engagement.slug}`;
  return <article className="flex min-h-[360px] flex-col rounded-md border border-slate-200 bg-white p-6 shadow-sm"><EvidencePill engagement={engagement} /><div className="mt-6 text-xs uppercase tracking-wider text-slate-500">{engagement.descriptor}</div><h3 className="mt-2 text-xl font-semibold">{engagement.displayName}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{engagement.summary}</p><div className="mt-5 flex flex-wrap gap-2">{engagement.categories.map((category) => <span key={category} className="rounded-full bg-slate-50 px-2.5 py-1 text-xs text-slate-600">{category}</span>)}</div><Link href={href} className="mt-auto inline-flex items-center gap-2 pt-7 text-sm font-semibold text-navy-700">View details <ArrowRight size={16} /></Link></article>;
}

function Journey() {
  return <div className="mt-10 overflow-x-auto pb-3"><div className="flex min-w-max items-center">{connectedJourney.map((stage, index) => <div key={stage} className="flex items-center"><div className={`w-28 border-t-2 pt-4 text-xs font-semibold ${index < 5 ? "border-navy-500 text-navy-800" : index < 9 ? "border-gold-500 text-gold-800" : "border-emerald-500 text-emerald-800"}`}>{stage}</div>{index < connectedJourney.length - 1 ? <ArrowRight size={15} className="-mt-4 mx-1 text-slate-400" /> : null}</div>)}</div></div>;
}

function PortfolioSystemVisual() {
  return <div className="absolute inset-0 border-l border-white/10 bg-slate-100 p-6 text-navy-950"><div className="flex h-full flex-col overflow-hidden rounded-md border border-slate-200 bg-white shadow-2xl"><div className="flex h-14 items-center justify-between border-b border-slate-200 px-5"><span className="font-semibold">Builder operations portfolio</span><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-800">Connected</span></div><div className="grid flex-1 grid-cols-[150px_1fr]"><div className="border-r border-slate-200 bg-slate-50 p-3">{["Command centre", "Projects", "CRM", "Ownership", "Construction", "Cost control"].map((item, index) => <div key={item} className={`mb-2 rounded px-3 py-2 text-xs ${index === 0 ? "bg-navy-950 text-white" : "text-slate-600"}`}>{item}</div>)}</div><div className="p-5"><div className="grid grid-cols-3 gap-3">{[["12", "Active projects"], ["68%", "Progress tracked"], ["₹", "Cost visibility"]].map(([value, label]) => <div key={label} className="border border-slate-200 p-3"><div className="text-lg font-semibold">{value}</div><div className="text-[10px] text-slate-500">{label}</div></div>)}</div><div className="mt-4 grid h-[420px] grid-cols-[1.2fr_0.8fr] gap-4"><div className="grid grid-cols-5 gap-2 bg-navy-950 p-5">{Array.from({ length: 25 }, (_, index) => <div key={index} className={`flex items-center justify-center border text-[9px] ${[6, 7, 12].includes(index) ? "border-gold-300 bg-gold-500/30 text-white" : "border-navy-300 bg-navy-500/20 text-slate-300"}`}>{index + 101}</div>)}</div><div className="space-y-3">{[[Users, "CRM + CLM", "Leads to booking"], [FileText, "Ownership + legal", "Property trust record"], [HardHat, "Construction", "Site to room progress"], [BarChart3, "Cost + BOQ", "Planned vs actual"]].map(([Icon, title, copy]) => { const IconComponent = Icon as typeof Users; return <div key={String(title)} className="border border-slate-200 p-4"><IconComponent size={18} className="text-navy-600" /><div className="mt-3 text-xs font-semibold">{String(title)}</div><div className="mt-1 text-[10px] text-slate-500">{String(copy)}</div></div>; })}</div></div></div></div></div></div>;
}

function ProductProofVisual() {
  return <div className="overflow-hidden rounded-md border border-slate-200 bg-navy-950 p-5 text-white"><div className="flex items-center justify-between border-b border-white/15 pb-4"><span className="text-sm font-semibold">Connected property workspace</span><ShieldCheck size={18} className="text-gold-300" /></div><div className="mt-5 grid grid-cols-3 gap-2">{[["Ownership", "Verified"], ["Documents", "Controlled"], ["History", "Traceable"]].map(([label, value]) => <div key={label} className="border border-white/15 p-3"><div className="text-[10px] text-slate-400">{label}</div><div className="mt-1 text-xs font-semibold">{value}</div></div>)}</div><div className="mt-4 grid grid-cols-[1fr_0.65fr] gap-3"><div className="grid grid-cols-4 gap-2 border border-white/15 p-4">{Array.from({ length: 16 }, (_, index) => <div key={index} className={`min-h-10 border ${index === 5 ? "border-gold-300 bg-gold-500/30" : "border-navy-300 bg-white/5"}`} />)}</div><div className="space-y-2">{[Map, FileText, Workflow, Layers3].map((Icon, index) => <div key={index} className="flex items-center gap-2 border border-white/15 p-3 text-xs text-slate-300"><Icon size={15} /> {["Project map", "Legal records", "Approvals", "Audit trail"][index]}</div>)}</div></div></div>;
}

"use client";

import { ArrowLeft, Download, Mail, MessageCircle, Printer } from "lucide-react";
import Link from "next/link";

export function VisitBriefActions({ leadId, visitId, salespersonEmail, salespersonPhone, briefUrl }: { leadId: string; visitId?: string; salespersonEmail?: string | null; salespersonPhone?: string | null; briefUrl: string }) {
  const query = visitId ? `?visitId=${encodeURIComponent(visitId)}` : "";
  const message = `Client visit brief: ${briefUrl}`;
  const phone = salespersonPhone?.replace(/\D/g, "");
  return <div className="no-print sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
    <Link className="btn-outline h-10 px-4" href={`/app/crm/leads/${leadId}`}><ArrowLeft size={16}/>Client opportunity</Link>
    <div className="flex gap-2">
      {phone ? <a className="btn-outline h-10 px-4" href={`https://wa.me/${phone.length === 10 ? `91${phone}` : phone}?text=${encodeURIComponent(message)}`} rel="noreferrer" target="_blank"><MessageCircle size={16}/>WhatsApp</a> : null}
      {salespersonEmail ? <a className="btn-outline h-10 px-4" href={`mailto:${salespersonEmail}?subject=${encodeURIComponent("Client visit brief")}&body=${encodeURIComponent(message)}`}><Mail size={16}/>Email</a> : null}
      <a className="btn-outline h-10 px-4" href={`/api/v1/crm/leads/${leadId}/visit-brief/pdf${query}`}><Download size={16}/>Download PDF</a>
      <button className="btn-primary h-10 px-4" onClick={() => window.frames[0]?.print()} type="button"><Printer size={16}/>Print visit sheet</button>
    </div>
  </div>;
}

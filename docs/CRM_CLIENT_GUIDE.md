# WIDESTATE CRM Client Guide

## Access

After the release is deployed, open the WIDESTATE login page, sign in, and select **Saldha Land Developers** when prompted. Open **CRM** from the left navigation.

Production deployment must run the migration and seed before the CRM accounts are used:

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
npm run db:seed
npm run build
```

Restart the WIDESTATE web process and the reminder worker after the build.

## Roles

- **Super Admin**: complete WIDESTATE access, including CRM, users, roles, projects, ownership, reports, and settings.
- **Builder Owner**: full firm and CRM management access.
- **CRM Manager**: all CRM leads, assignment, source/campaign reports, templates, and automation settings.
- **CRM Caller**: assigned leads, calls, follow-ups, visits, notes, and bookings.
- **CRM Salesperson**: assigned leads, site visits, follow-ups, feedback, and bookings.
- **CRM Reception**: new enquiries, assigned leads, calls, appointments, and follow-ups.

## Daily Workflow

1. Create a project opportunity from **CRM > New lead**. WIDESTATE stores the person once as a master contact. The same person may have a separate opportunity for each project, while a duplicate for the same project is blocked.
2. Open the lead and record every call with an outcome and next action.
3. Schedule follow-ups or a site visit. Due and overdue work appears on the CRM dashboard.
4. Record visit results and customer feedback.
5. Record a booking. For a selected plot, use **Start allotment** to open the existing ownership workflow with customer details prefilled.
6. Managers use **Reports** for funnel, source, team, and CSV reporting. CRM configuration is under **Settings**.

## Master Contacts and Project Opportunities

- Phone numbers and email identify one company-wide **Master Contact**.
- Requirements, assignment, status, visits, negotiations, follow-ups, bookings, campaigns, calls, notes, and tickets belong to one **Project Opportunity**.
- Every CRM transaction stores its project ID. Changing a project does not move old activity into another colony.
- CRM Managers, Builder Owners, and Super Admins can open **View full profile** to see the client's company-wide history grouped by project.
- Callers and salespeople see only opportunities assigned to them. They cannot use the global profile to bypass project access.

## Client Visit Sheet

1. Open a client opportunity and schedule the visit with its purpose, property/unit to show, assigned salesperson, and special instructions.
2. Use **Print visit sheet** to preview the professional A4 brief. Use **Download PDF** or **Print visit sheet** from the preview.
3. Use **Send to salesperson** for an in-app notification. The preview also offers WhatsApp and email handoff when the salesperson has those details.
4. The QR code opens the exact live CRM record after permission checks; the printed page does not expose another project's confidential sales history.
5. After the visit, record the customer response, properties shown, likes/dislikes, objections, revised requirement, booking probability, next action, and next follow-up. The next brief automatically uses the latest saved details.

## Current Communication Mode

WhatsApp, phone, and email use the device's installed apps and editable WIDESTATE templates. Follow-up and escalation notifications are internal to WIDESTATE. No paid external CRM, telephony, WhatsApp, SMS, or email API is required in this release.

Future integrations can be added without replacing the CRM records or workflow.

## Security

The seeded accounts are for acceptance testing and initial handoff. Before entering real customer data, the Super Admin should create named users or change every shared/demo password under **Settings > Users and roles**. Deactivate departed staff with a replacement user so their open leads and appointments are reassigned and the history remains intact.

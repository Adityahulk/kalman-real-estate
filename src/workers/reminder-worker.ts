import "@/server/load-env";
import { sendDailyTaskReminders, sendExpiryReminders } from "@/server/services/reminders";

// Standalone scheduled runner for time-based notifications that no user action can trigger:
//  • government-approval expiry / renewal reminders (Liaison)
//  • overdue engineering-task reminders (Engineering)
// Runs once at startup, then on a fixed interval. Kept as its own process so it can be scaled/scheduled
// independently of the request path and the BullMQ job workers.

const INTERVAL_MS = Number(process.env.REMINDER_INTERVAL_MS ?? 12 * 60 * 60 * 1000); // default: every 12h

async function tick() {
  try {
    const expiry = await sendExpiryReminders();
    const engineering = await sendDailyTaskReminders();
    console.log(
      `[reminder-worker] ${new Date().toISOString()} — expiry: ${expiry.documents} docs / ${expiry.notifications} notifs; engineering tasks: ${engineering.tasks} / ${engineering.notifications} notifs`,
    );
  } catch (error) {
    console.error("[reminder-worker] run failed:", error);
  }
}

void tick();
setInterval(() => void tick(), INTERVAL_MS);
console.log(`[reminder-worker] started; interval ${INTERVAL_MS}ms`);

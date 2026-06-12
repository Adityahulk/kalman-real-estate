import { Queue } from "bullmq";
import IORedis from "ioredis";

const connection = process.env.REDIS_URL
  ? new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null })
  : undefined;

function queue<T>(name: string) {
  return connection ? new Queue<T>(name, { connection: connection as never }) : null;
}

export type DocumentJob = { documentId: string; tenantId: string };
export type AiReportJob = { tenantId: string; projectId: string; reportType: string };

export const documentQueue = queue<DocumentJob>("document.generate");
export const aiQueue = queue<AiReportJob>("ai.report");

export async function enqueueDocumentGeneration(job: DocumentJob) {
  if (!documentQueue) return { queued: false, reason: "REDIS_URL not configured" };
  const result = await documentQueue.add("generate-document", job);
  return { queued: true, jobId: result.id };
}

export async function enqueueAiReport(job: AiReportJob) {
  if (!aiQueue) return { queued: false, reason: "REDIS_URL not configured" };
  const result = await aiQueue.add("generate-report", job);
  return { queued: true, jobId: result.id };
}

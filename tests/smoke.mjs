import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync } from "node:fs";

for (const file of [".env.local", ".env"]) {
  if (!existsSync(file)) continue;
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^"|"$/g, "");
  }
}

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const prisma = new PrismaClient();

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, init);
  const text = await response.text();
  const json = text && response.headers.get("content-type")?.includes("application/json") ? JSON.parse(text) : {};
  return { response, json, cookie: response.headers.get("set-cookie") };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const login = await request("/api/v1/auth/login", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: "owner@saldhaland.example", password: "Kalman@12345" }),
});
assert(login.response.status === 201, "builder login failed");
const cookie = login.cookie?.split(";")[0];
assert(cookie, "session cookie missing");

const me = await request("/api/v1/auth/me", { headers: { cookie } });
assert(me.json.data?.tenant?.name === "Saldha Land Developers", "tenant session failed");

const plot = await prisma.plot.findFirstOrThrow({ where: { code: "A-101" } });
const doc = await request("/api/v1/documents/generate", {
  method: "POST",
  headers: { "content-type": "application/json", cookie },
  body: JSON.stringify({
    type: "smoke_letter",
    recordType: "Plot",
    recordId: plot.id,
    data: { plotCode: plot.code },
  }),
});
assert(doc.response.status === 201, "document generation failed");
assert(doc.json.data?.document?.fileAssetId, "document PDF file missing");

const download = await fetch(`${baseUrl}/api/v1/files/${doc.json.data.document.fileAssetId}/download`, {
  headers: { cookie },
});
assert(download.status === 200, "document download failed");
assert(download.headers.get("content-type")?.includes("pdf"), "download is not a PDF");

const vendor = await request("/api/v1/finance/vendors", {
  method: "POST",
  headers: { "content-type": "application/json", cookie },
  body: JSON.stringify({ name: `Smoke Vendor ${Date.now()}`, type: "Material" }),
});
assert(vendor.response.status === 201, "vendor creation failed");

const notifications = await request("/api/v1/notifications", { headers: { cookie } });
assert(notifications.response.status === 200, "notification list failed");

await prisma.$disconnect();
console.log("Smoke tests passed");

import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { geminiAvailable } from "./gemini-vision";

export async function getCadDependencyHealth() {
  const gemini = { ok: geminiAvailable(), ...(geminiAvailable() ? {} : { error: "GEMINI_API_KEY is not configured" }) };
  const browserRuntime = await browserRuntimeHealth();

  return {
    pipeline: "mlightcad-browser-and-gemini-pdf",
    browserRuntime,
    gemini,
    supported: {
      dxf: browserRuntime.ok,
      dwg: browserRuntime.ok,
      vectorPdf: gemini.ok,
      mixedPdf: gemini.ok,
    },
    notes: {
      dxf: "Parsed and rendered in the authorized admin browser using MLightCAD.",
      dwg: "Parsed in the browser using MLightCAD and LibreDWG; DXF remains the compatibility fallback.",
      pdf: "Processed in the web application through Gemini vision after Node PDF rendering.",
    },
  };
}

async function browserRuntimeHealth() {
  const assets = [
    "mlightcad-runtime.js",
    "dxf-parser-worker.js",
    "libredwg-parser-worker.js",
    "mtext-renderer-worker.js",
  ];
  const missing: string[] = [];
  for (const asset of assets) {
    try {
      await access(resolve(process.cwd(), "public", "cad-runtime", asset));
    } catch {
      missing.push(asset);
    }
  }
  return missing.length
    ? { ok: false as const, error: `Missing browser runtime assets: ${missing.join(", ")}` }
    : { ok: true as const, version: "1.5.5", assets };
}

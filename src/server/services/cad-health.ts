import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import IORedis from "ioredis";
import { geminiAvailable } from "./gemini-vision";

const execFileAsync = promisify(execFile);

async function commandOk(command: string, args: string[], timeout = 5000) {
  try {
    await execFileAsync(command, args, { timeout });
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Command failed",
    };
  }
}

export async function getCadDependencyHealth() {
  const python = process.env.PYTHON_BIN ?? "python3";
  const ezdxf = await commandOk(python, ["-c", "import ezdxf"]);
  const pymupdf = await commandOk(python, ["-c", "import fitz"]);
  const shapely = await commandOk(python, ["-c", "import shapely"]);
  const gemini = { ok: geminiAvailable(), ...(geminiAvailable() ? {} : { error: "GEMINI_API_KEY is not configured" }) };
  const tesseract = await commandOk(process.env.TESSERACT_BIN ?? "tesseract", ["--version"]);
  const worker = await getWorkerHealth();
  const browserRuntime = await browserRuntimeHealth();

  return {
    pipeline: "mlightcad-browser-and-gemini-pdf",
    worker,
    browserRuntime,
    gemini,
    python: { command: python, ...(await commandOk(python, ["--version"])) },
    ezdxf,
    pymupdf,
    shapely,
    tesseract,
    supported: {
      dxf: browserRuntime.ok,
      dwg: browserRuntime.ok,
      vectorPdf: pymupdf.ok && gemini.ok,
      mixedPdf: pymupdf.ok && gemini.ok,
    },
    notes: {
      dxf: "Parsed and rendered in the authorized admin browser using MLightCAD.",
      dwg: "Parsed in the browser using MLightCAD and LibreDWG; DXF remains the compatibility fallback.",
      pdf: "Processed separately through the Gemini/PDF review pipeline.",
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

async function getWorkerHealth() {
  if (!process.env.REDIS_URL) return { ready: false, error: "REDIS_URL is not configured" };
  const redis = new IORedis(process.env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    connectTimeout: 3_000,
  });
  try {
    await redis.connect();
    const raw = await redis.get("kalman:cad-worker:health");
    if (!raw) return { ready: false, error: "Map worker heartbeat is not available" };
    return JSON.parse(raw) as Record<string, unknown>;
  } catch (error) {
    return { ready: false, error: error instanceof Error ? error.message : "Map worker health is unavailable" };
  } finally {
    redis.disconnect();
  }
}

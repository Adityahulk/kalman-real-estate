import { execFile } from "node:child_process";
import { writeFile, mkdir, rm } from "node:fs/promises";
import { join, basename } from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import type { CadExtractionResult } from "./cad-pdf";

const execFileAsync = promisify(execFile);

export async function inspectDxf(dxfBuffer: Buffer, originalName: string): Promise<CadExtractionResult> {
  return runDxfExtractor(dxfBuffer, originalName, "inspect", {});
}

export async function extractDxf(
  dxfBuffer: Buffer,
  originalName: string,
  analysis: Record<string, unknown>,
): Promise<CadExtractionResult> {
  return runDxfExtractor(dxfBuffer, originalName, "extract", { analysis });
}

async function runDxfExtractor(
  dxfBuffer: Buffer,
  originalName: string,
  mode: "inspect" | "extract",
  options: Record<string, unknown>,
): Promise<CadExtractionResult> {
  const dir = await mkWorkDir();
  try {
    const safeDxfName = safeName(originalName, ".dxf");
    const dxfPath = join(dir, safeDxfName);
    await writeFile(dxfPath, dxfBuffer);

    const optionsPath = join(dir, "options.json");
    await writeFile(optionsPath, JSON.stringify(options));

    const python = process.env.PYTHON_BIN ?? "python3";
    const script = join(process.cwd(), "src/workers/cad-python/extract_dxf_v2.py");
    const { stdout } = await execFileAsync(python, [script, dxfPath, mode, optionsPath], {
      timeout: 60_000,
      maxBuffer: 100 * 1024 * 1024,
      env: {
        ...process.env,
        OMP_NUM_THREADS: "1",
        OPENBLAS_NUM_THREADS: "1",
        MKL_NUM_THREADS: "1",
      },
    });

    const result = JSON.parse(stdout.trim()) as CadExtractionResult;
    if (!Array.isArray(result.layers) || !Array.isArray(result.entities)) {
      throw new Error("DXF extractor returned invalid result structure");
    }
    return result;
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function mkWorkDir() {
  const dir = join(tmpdir(), `kalman-cad-dxf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  await mkdir(dir, { recursive: true });
  return dir;
}

function safeName(name: string, ext: string) {
  const leaf = basename(name).replace(/[^a-zA-Z0-9._ -]/g, "-").trim() || `plan${ext}`;
  return leaf.toLowerCase().endsWith(ext) ? leaf : `${leaf}${ext}`;
}

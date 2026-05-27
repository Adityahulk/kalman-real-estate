import { access } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

async function commandOk(command: string, args: string[]) {
  try {
    await execFileAsync(command, args, { timeout: 5000 });
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
  const dxfParser = { ok: true as const, fallback: "dxf-parser JS fallback is bundled for basic DXF extraction" };
  const odaPath = process.env.ODA_CONVERTER_BIN;
  const oda = odaPath
    ? await access(odaPath).then(() => ({ ok: true as const })).catch((error) => ({
        ok: false as const,
        error: error instanceof Error ? error.message : "ODA converter not reachable",
      }))
    : { ok: false as const, error: "ODA_CONVERTER_BIN is not configured" };

  return {
    python: { command: python, ...(await commandOk(python, ["--version"])) },
    ezdxf,
    pymupdf,
    dxfParser,
    oda,
    supported: {
      dxf: ezdxf.ok || dxfParser.ok,
      dwg: oda.ok && ezdxf.ok,
      vectorPdf: pymupdf.ok,
    },
  };
}

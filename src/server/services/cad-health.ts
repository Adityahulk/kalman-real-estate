import { access } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

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
  const opencv = await commandOk(python, ["-c", "import cv2"]);
  const shapely = await commandOk(python, ["-c", "import shapely"]);
  const paddleocr = await commandOk(python, ["-c", "import paddleocr"], 30_000);
  const tesseract = await commandOk(process.env.TESSERACT_BIN ?? "tesseract", ["--version"]);
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
    opencv,
    shapely,
    paddleocr,
    tesseract,
    oda,
    supported: {
      dxf: ezdxf.ok && shapely.ok,
      dwg: oda.ok && ezdxf.ok,
      vectorPdf: pymupdf.ok && shapely.ok,
      mixedPdf: pymupdf.ok && opencv.ok && shapely.ok && (paddleocr.ok || tesseract.ok),
    },
  };
}

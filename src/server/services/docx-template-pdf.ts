import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import PizZip from "pizzip";

const execFileAsync = promisify(execFile);

export async function buildExactPdfFromDocx(input: {
  bytes: Buffer;
  replacements: Array<{ search: string; searchKey?: string; value: string }>;
}) {
  const renderedDocx = renderDocx(input.bytes, input.replacements);
  const converter = await findLibreOffice();
  if (!converter) {
    const error = new Error("Exact DOCX-to-PDF conversion requires LibreOffice. Install LibreOffice or configure LIBREOFFICE_PATH, then generate the PDF again.");
    error.name = "BadRequestError";
    throw error;
  }

  const directory = await mkdtemp(join(tmpdir(), "widestate-letter-"));
  const sourcePath = join(directory, "letter.docx");
  try {
    await writeFile(sourcePath, renderedDocx);
    await execFileAsync(converter, ["--headless", "--convert-to", "pdf", "--outdir", directory, sourcePath], { timeout: 120_000 });
    return await readFile(join(directory, "letter.pdf"));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function renderDocx(bytes: Buffer, replacements: Array<{ search: string; searchKey?: string; value: string }>) {
  const zip = new PizZip(bytes);
  const documentParts = Object.keys(zip.files).filter((name) => /^word\/(document|header\d+|footer\d+)\.xml$/.test(name));
  for (const name of documentParts) {
    const file = zip.file(name);
    if (!file) continue;
    let xml = file.asText();
    for (const replacement of replacements.filter((item) => item.search.trim())) {
      const replaced = replaceAcrossWordRuns(xml, replacement.search, replacement.value);
      const compactReplaced = replaced === xml
        ? replaceAcrossWordRunsByCompactText(xml, replacement.search, replacement.value)
        : replaced;
      xml = compactReplaced === xml && replacement.searchKey
        ? replaceAcrossWordRunsByNormalizedKey(xml, replacement.searchKey, replacement.value)
        : compactReplaced;
    }
    zip.file(name, xml);
  }
  return zip.generate({ type: "nodebuffer", compression: "DEFLATE" }) as Buffer;
}

function replaceAcrossWordRuns(xml: string, search: string, replacement: string) {
  return xml.replace(/<w:p\b[\s\S]*?<\/w:p>/g, (paragraph) => replaceInParagraph(paragraph, search, replacement));
}

function replaceAcrossWordRunsByNormalizedKey(xml: string, searchKey: string, replacement: string) {
  return xml.replace(/<w:p\b[\s\S]*?<\/w:p>/g, (paragraph) => replaceNormalizedInParagraph(paragraph, searchKey, replacement));
}

function replaceAcrossWordRunsByCompactText(xml: string, search: string, replacement: string) {
  return xml.replace(/<w:p\b[\s\S]*?<\/w:p>/g, (paragraph) => replaceCompactInParagraph(paragraph, search, replacement));
}

function replaceInParagraph(paragraph: string, search: string, replacement: string) {
  return replaceParagraphRange(paragraph, (combined) => {
    const start = combined.indexOf(search);
    return start < 0 ? null : { start, end: start + search.length };
  }, replacement);
}

function replaceNormalizedInParagraph(paragraph: string, searchKey: string, replacement: string) {
  return replaceParagraphRange(paragraph, (combined) => {
    const normalizedSearch = normalizeKey(searchKey);
    if (normalizedSearch.length < 4) return null;
    const normalized = normalizedTextWithOffsets(combined);
    const normalizedStart = normalized.text.indexOf(normalizedSearch);
    if (normalizedStart < 0) return null;
    return {
      start: normalized.offsets[normalizedStart],
      end: normalized.offsets[normalizedStart + normalizedSearch.length - 1] + 1,
    };
  }, replacement);
}

function replaceCompactInParagraph(paragraph: string, search: string, replacement: string) {
  return replaceParagraphRange(paragraph, (combined) => {
    const compactSearch = compactText(search);
    if (!compactSearch) return null;
    const compact = compactTextWithOffsets(combined);
    const compactStart = compact.text.indexOf(compactSearch);
    if (compactStart < 0) return null;
    return {
      start: compact.offsets[compactStart],
      end: compact.offsets[compactStart + compactSearch.length - 1] + 1,
    };
  }, replacement);
}

function replaceParagraphRange(paragraph: string, findRange: (combined: string) => { start: number; end: number } | null, replacement: string) {
  const nodePattern = /(<w:t\b[^>]*>)([\s\S]*?)(<\/w:t>)/g;
  const nodes = [...paragraph.matchAll(nodePattern)].map((match) => ({
    open: match[1],
    close: match[3],
    text: decodeXml(match[2]),
  }));
  if (!nodes.length) return paragraph;
  const combined = nodes.map((node) => node.text).join("");
  const range = findRange(combined);
  if (!range) return paragraph;

  const changed = nodes.map((node) => node.text);
  const starts: number[] = [];
  let cursor = 0;
  for (const node of nodes) {
    starts.push(cursor);
    cursor += node.text.length;
  }

  const first = starts.findIndex((start, index) => range.start >= start && range.start < start + nodes[index].text.length);
  let last = starts.findIndex((start, index) => range.end > start && range.end <= start + nodes[index].text.length);
  if (last < 0) last = nodes.length - 1;
  if (first < 0) return paragraph;
  const prefix = changed[first].slice(0, range.start - starts[first]);
  const suffix = changed[last].slice(range.end - starts[last]);
  changed[first] = `${prefix}${replacement}${first === last ? suffix : ""}`;
  for (let index = first + 1; index < last; index += 1) changed[index] = "";
  if (last !== first) changed[last] = suffix;

  let nodeIndex = 0;
  return paragraph.replace(nodePattern, (_match, open: string, _text: string, close: string) => `${open}${encodeXml(changed[nodeIndex++])}${close}`);
}

function normalizedTextWithOffsets(value: string) {
  let text = "";
  const offsets: number[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const normalized = value[index].toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!normalized) continue;
    text += normalized;
    offsets.push(index);
  }
  return { text, offsets };
}

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function compactTextWithOffsets(value: string) {
  let text = "";
  const offsets: number[] = [];
  for (let index = 0; index < value.length; index += 1) {
    if (/\s/.test(value[index])) continue;
    text += value[index];
    offsets.push(index);
  }
  return { text, offsets };
}

function compactText(value: string) {
  return value.replace(/\s/g, "");
}

async function findLibreOffice() {
  const candidates = [
    process.env.LIBREOFFICE_PATH,
    "/Applications/LibreOffice.app/Contents/MacOS/soffice",
    "/usr/bin/libreoffice",
    "/usr/local/bin/libreoffice",
    "/opt/homebrew/bin/libreoffice",
    "/usr/bin/soffice",
  ].filter(Boolean) as string[];
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next supported installation path.
    }
  }
  return null;
}

function decodeXml(value: string) {
  return value.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
}

function encodeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

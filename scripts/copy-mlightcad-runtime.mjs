import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = join(root, "public", "cad-runtime");
const pdfjsOutput = join(root, "public", "pdfjs");
const ocrOutput = join(root, "public", "ocr");

const assets = [
  ["node_modules/@mlightcad/data-model/dist/dxf-parser-worker.js", "dxf-parser-worker.js"],
  ["node_modules/@mlightcad/cad-simple-viewer/dist/libredwg-parser-worker.js", "libredwg-parser-worker.js"],
  ["node_modules/@mlightcad/cad-simple-viewer/dist/mtext-renderer-worker.js", "mtext-renderer-worker.js"],
];

await mkdir(output, { recursive: true });
await mkdir(join(output, "assets"), { recursive: true });
await mkdir(pdfjsOutput, { recursive: true });
await mkdir(join(ocrOutput, "core"), { recursive: true });
await copyFile(
  join(root, "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs"),
  join(pdfjsOutput, "pdf.worker.min.mjs"),
);
await copyFile(
  join(root, "node_modules", "tesseract.js", "dist", "worker.min.js"),
  join(ocrOutput, "worker.min.js"),
);
await copyFile(
  join(root, "node_modules", "@tesseract.js-data", "eng", "4.0.0", "eng.traineddata.gz"),
  join(ocrOutput, "eng.traineddata.gz"),
);
for (const file of await readdir(join(root, "node_modules", "tesseract.js-core"))) {
  if (file.startsWith("tesseract-core") && (file.endsWith(".js") || file.endsWith(".wasm"))) {
    await copyFile(join(root, "node_modules", "tesseract.js-core", file), join(ocrOutput, "core", file));
  }
}
for (const [source, target] of assets) {
  await copyFile(join(root, source), join(output, target));
  await copyFile(join(root, source), join(output, "assets", target));
}

await build({
  stdin: {
    contents: 'export * from "@mlightcad/cad-simple-viewer";',
    loader: "js",
    resolveDir: root,
    sourcefile: "mlightcad-browser-entry.js",
  },
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["es2022"],
  outfile: join(output, "mlightcad-runtime.js"),
  alias: {
    "three/examples/jsm/controls/OrbitControls": "three/examples/jsm/controls/OrbitControls.js",
    "three/examples/jsm/libs/stats.module": "three/examples/jsm/libs/stats.module.js",
  },
  sourcemap: false,
  minify: true,
  logLevel: "warning",
});

await build({
  entryPoints: [join(root, "scripts", "mlightcad-studio-entry.ts")],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["es2022"],
  outfile: join(output, "mlightcad-studio.js"),
  alias: {
    "three/examples/jsm/controls/OrbitControls": "three/examples/jsm/controls/OrbitControls.js",
    "three/examples/jsm/libs/stats.module": "three/examples/jsm/libs/stats.module.js",
  },
  sourcemap: false,
  minify: true,
  logLevel: "warning",
});

const packageVersions = {};
for (const packageName of [
  "@mlightcad/cad-simple-viewer",
  "@mlightcad/data-model",
  "@mlightcad/libredwg-converter",
]) {
  const packageJson = JSON.parse(
    await readFile(join(root, "node_modules", packageName, "package.json"), "utf8"),
  );
  packageVersions[packageName] = packageJson.version;
}

await writeFile(
  join(output, "manifest.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), packages: packageVersions }, null, 2),
);

await writeFile(
  join(output, "studio.html"),
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>WIDESTATE CAD Studio</title>
    <link rel="stylesheet" href="/cad-runtime/mlightcad-studio.css" />
    <style>html,body,#app{width:100%;height:100%;margin:0;overflow:hidden;background:#10151c}</style>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/cad-runtime/mlightcad-studio.js"></script>
  </body>
</html>`,
);

console.log(`MLightCAD runtime copied to ${output}`);

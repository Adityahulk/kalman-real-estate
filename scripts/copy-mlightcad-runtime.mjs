import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = join(root, "public", "cad-runtime");

const assets = [
  ["node_modules/@mlightcad/data-model/dist/dxf-parser-worker.js", "dxf-parser-worker.js"],
  ["node_modules/@mlightcad/cad-simple-viewer/dist/libredwg-parser-worker.js", "libredwg-parser-worker.js"],
  ["node_modules/@mlightcad/cad-simple-viewer/dist/mtext-renderer-worker.js", "mtext-renderer-worker.js"],
];

await mkdir(output, { recursive: true });
for (const [source, target] of assets) {
  await copyFile(join(root, source), join(output, target));
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

console.log(`MLightCAD runtime copied to ${output}`);

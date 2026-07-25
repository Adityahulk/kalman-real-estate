const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const path = require("node:path");

const execFileAsync = promisify(execFile);

/**
 * Electron Builder 25 skips macOS signing if no Developer ID is installed. That leaves the
 * modified Electron bundle with invalid nested signatures, which macOS reports as damaged or
 * unable to open. Make local Mac artifacts internally valid with an ad-hoc signature. A real
 * Developer ID signature (when configured in CI) runs afterwards and replaces this one.
 */
exports.default = async function adHocSign(context) {
  if (context.electronPlatformName !== "darwin") return;

  const productName = context.packager.appInfo.productFilename;
  const appPath = path.join(context.appOutDir, `${productName}.app`);
  await execFileAsync("codesign", ["--force", "--deep", "--sign", "-", appPath]);
};

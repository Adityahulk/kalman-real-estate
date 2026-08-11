import { existsSync, readFileSync } from "node:fs";

const configPath = "android/app/src/main/assets/capacitor.config.json";
const pluginsPath = "android/app/capacitor.build.gradle";

if (!existsSync(configPath) || !existsSync(pluginsPath)) {
  throw new Error("Android shell was not generated before verification.");
}

const config = JSON.parse(readFileSync(configPath, "utf8"));
const url = new URL(config.server?.url);

if (url.protocol !== "https:") {
  throw new Error("MOBILE_SERVER_URL must use HTTPS for the Android WebView.");
}
if (!config.server?.allowNavigation?.includes(url.hostname)) {
  throw new Error("The Android WebView must explicitly allow its hosted app origin.");
}

const plugins = readFileSync(pluginsPath, "utf8");
if (plugins.includes("capacitor-push-notifications")) {
  throw new Error(
    "Push Notifications requires a Firebase google-services.json configuration and must not be shipped unconfigured.",
  );
}

console.log(`Android shell verified for ${url.origin}`);

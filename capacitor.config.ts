import type { CapacitorConfig } from "@capacitor/cli";

// The native shell loads the live web app directly (server.url), so the WebView runs the exact
// same Next.js app that the desktop browser does — guaranteeing feature parity. All /api/v1 calls
// are therefore same-origin, so existing cookie auth and every fetch keep working unchanged.
//
// Set MOBILE_SERVER_URL at build time (e.g. https://app.kalman.estate). If unset we fall back to
// the production origin. `webDir` (native/www) is only the offline bootstrap that shows a loader
// until the remote app is reachable.
const serverUrl = process.env.MOBILE_SERVER_URL ?? "https://kalman.estate";
const { hostname } = new URL(serverUrl);

const config: CapacitorConfig = {
  appId: "estate.kalman.app",
  appName: "WIDESTATE OS",
  webDir: "native/www",
  server: {
    url: serverUrl,
    androidScheme: "https",
    // Origins the WebView is allowed to navigate to without kicking out to the system browser:
    // the app itself plus storage/share hosts it links to.
    allowNavigation: [hostname, "*.amazonaws.com", "*.s3.amazonaws.com"],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#0b1220",
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;

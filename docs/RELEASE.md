# Release & Signing Guide

The **Build Apps** workflow (`.github/workflows/build-apps.yml`) produces installable artifacts on
every `v*` tag or manual dispatch. It works with no secrets (debug/unsigned builds), and upgrades
to **signed, store-ready** builds automatically once you add the secrets below.

> Never commit keystores, certificates, `.p12`, provisioning profiles, or passwords. They live only
> in **GitHub → Settings → Secrets and variables → Actions**.

---

## Point the apps at your server (repo Variables)

Add these as **Variables** (not secrets) so the shells load your deployed web app:

| Variable | Example |
| --- | --- |
| `MOBILE_SERVER_URL` | `https://app.your-domain.com` |
| `DESKTOP_SERVER_URL` | `https://app.your-domain.com` |

Without them, builds default to `https://kalman.estate`.

---

## Android — signed APK + AAB (Play Store)

### 1. Create an upload keystore (once, on your machine)

```bash
keytool -genkey -v -keystore widestate-upload.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias widestate
```

Answer the prompts and pick a strong keystore + key password. **Keep `widestate-upload.jks`
safe and backed up** — losing it means you can't ship updates under the same app.

### 2. Base64-encode it for the secret

```bash
base64 -i widestate-upload.jks | pbcopy   # macOS (copies to clipboard)
# or: base64 -w0 widestate-upload.jks      # Linux
```

### 3. Add these Actions secrets

| Secret | Value |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | the base64 string from step 2 |
| `ANDROID_KEYSTORE_PASSWORD` | keystore password |
| `ANDROID_KEY_ALIAS` | `widestate` |
| `ANDROID_KEY_PASSWORD` | key password |

Re-run the workflow → the **`android-release-signed`** artifact contains a signed `.apk`
(sideload) and a signed `.aab` (upload to Play Console). The unsigned/debug APK is still produced
as `android-apk-debug`.

---

## iOS — signed .ipa (TestFlight / App Store)

Requires a **paid Apple Developer account**. The current workflow builds iOS **unsigned** (proves
the project compiles). To emit a signed `.ipa`, add these secrets and I can wire the export step:

| Secret | What it is |
| --- | --- |
| `APPLE_CERTIFICATE_P12` | base64 of your Apple Distribution cert (`.p12`) |
| `APPLE_CERTIFICATE_PASSWORD` | password for the `.p12` |
| `APPLE_PROVISIONING_PROFILE` | base64 of the App Store provisioning profile |
| `APPLE_TEAM_ID` | your 10-char team ID |
| `APPLE_API_KEY_ID` / `APPLE_API_ISSUER_ID` / `APPLE_API_KEY_P8` | App Store Connect API key (for upload) |

Ping me once these exist and I'll add the `apple-actions/import-codesign-certs` + `xcodebuild
-exportArchive` + TestFlight-upload steps.

---

## Desktop — code signing (optional)

Unsigned installers run locally but show OS security prompts elsewhere. To sign:

- **macOS:** add `CSC_LINK` (base64 Developer ID `.p12`) + `CSC_KEY_PASSWORD`, and for notarisation
  `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`. electron-builder picks these up
  automatically.
- **Windows:** add `CSC_LINK` (base64 Authenticode `.pfx`) + `CSC_KEY_PASSWORD`.

The desktop job already sets `CSC_IDENTITY_AUTO_DISCOVERY=false` for unsigned CI runs; once the
secrets exist, map them into that job's `env:` and remove that override.

---

## Cutting a release

```bash
git tag v0.1.0
git push origin v0.1.0
```

Then grab the artifacts from the workflow run's **Artifacts** section (or wire them into a GitHub
Release — say the word and I'll add a `softprops/action-gh-release` step).

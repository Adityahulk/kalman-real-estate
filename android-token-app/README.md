# Kalman Token App

Offline Flutter Android app for project tokens, plot draw, EOI forms, payment acknowledgements, and local exports.

## Setup

This repository contains the Flutter source and app code. On this macOS 12 machine, the Homebrew Flutter install is too new, so use the compatible local SDK installed during setup:

```sh
cd android-token-app
export JAVA_HOME=/Users/serverport/.codex/jdks/jdk-17.0.13+11/Contents/Home
export PATH="$JAVA_HOME/bin:/Users/serverport/.codex/flutter-sdks/flutter_3_24_5/bin:$PATH"
flutter pub get
dart run build_runner build --delete-conflicting-outputs
flutter analyze
flutter test
flutter build apk --debug
```

Debug and release APKs are generated under `build/app/outputs/flutter-apk/`.

The app is Android-focused and stores all data locally using Drift SQLite. It has no backend dependency.

## First Login

On first launch, create an admin PIN/password. After that, the same local password is required to open the app.

## Important Flows

- Create a project and generate plot records.
- Add buyers and tokens before launch.
- Mark project launched to enable plot/SCO and payment schedule fields in EOI.
- Run draw to assign active tokens to empty plots.
- Edit assignments later; every change writes plot history.
- Cancel a plot and redistribute token amount across the buyer's other plots.
- Add payments with drawn or uploaded signatures.
- Export JSON backup, CSV files, EOI PDF, and payment acknowledgement PDF.

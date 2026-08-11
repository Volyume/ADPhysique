# Campaign 7 — WS-5/WS-6: Android release build + 16 KB page size

Executed locally on 2026-08-11 against the Campaign 7 branch. No upload,
no signing with production keys, no Play interaction.

## Build contract (WS-5) — PASS

- Command: `./gradlew :app:assembleRelease` with a locally installed
  Android SDK (platform 35, build-tools 35.0.0), `expo prebuild`
  generated native projects (android/ and ios/ are gitignored — CNG).
- **Result: BUILD SUCCESSFUL** (3m 16s on a warm cache; 33m cold).
  Artefact: `android/app/build/outputs/apk/release/app-release.apk`,
  323 MB universal (all four ABIs — the production EAS profile builds
  an **app-bundle**, which splits per-ABI, so the real download is far
  smaller: arm64 native payload is 73 MB of the 323 MB).
- Native modules link: 40 `.so` per ABI, including Hermes, Reanimated,
  Skia, VisionCamera, TFLite/MLKit, expo-sqlite (SQLCipher via
  libcrypto), Nitro IAP, Sentry. No unresolved-symbol or prefab errors.
- JS bundle: Metro/Hermes bytecode built clean (`expo export` produced a
  13.8 MB `.hbc` independently).
- **Release flags verified in the built APK's binary manifest**
  (`aapt2 dump xmltree`):
  - `debuggable` — ABSENT (i.e. false) PASS
  - `testOnly` — ABSENT PASS
  - `allowBackup=false` PASS
  - `usesCleartextTraffic=false` PASS
  - `extractNativeLibs=false` PASS (also a 16 KB prerequisite)
  - `versionCode=30`, `versionName=1.2.0`, `package=app.volyume`
- **No dev-client/debug leakage**: zero `expo-dev-client`, devsupport or
  Flipper entries in the APK.

### Two build-environment findings (not shipping defects)

1. `lintVitalRelease` OOMs on the stock `org.gradle.jvmargs`
   (`-Xmx2048m -XX:MaxMetaspaceSize=512m`) in third-party library
   modules (react-native-android-widget, async-storage) — failure is
   literally `Metaspace`. Raised locally to
   `-Xmx4096m -XX:MaxMetaspaceSize=2048m` and the build completes. The
   canonical CI (GitHub Actions, build-android.yml) may already run
   with a larger heap; if it does not, this is a latent CI failure
   waiting for the next cold build. **Founder/CI action, recorded.**
2. The Sentry Gradle plugin fails the build when it cannot upload
   source maps (no auth token locally). Set
   `SENTRY_DISABLE_AUTO_UPLOAD=true` for local builds; CI has the
   token. Not a code defect.

## 16 KB page size (WS-6) — PASS

**Requirement** (official, verified 2026-08-11:
https://developer.android.com/guide/practices/page-sizes): apps
targeting Android 15+ delivered to devices with 16 KB pages must have
all shared libraries aligned to a 16 KB boundary *and* be packaged
uncompressed with 16 KB zip alignment. (The platform-requirements lane
records a discrepancy between the doc's stated 2027-02-01 enforcement
date and Google's earlier 2025-11-01 announcement; it does not change
this verdict — the artefact complies either way.)

**Method** — on the real release APK, not on source:
1. Extracted all 40 `arm64-v8a` libraries and read each ELF's LOAD
   segment alignment with `readelf -lW`.
2. Ran `zipalign -c -P 16 -v 4` over the whole APK.
3. Confirmed `extractNativeLibs=false` in the built manifest.

**Result: PASS. Zero offenders.** Every one of the 40 arm64-v8a
libraries reports `0x4000` (16 KB) LOAD alignment:

libNitroIap, libNitroModules, libNitroTflite, libVisionCamera,
libanimation-decoder-gif, libappmodules, libavif_android,
libbarhopper_v3, libc++_shared, libcrypto, libexpo-av,
libexpo-modules-core, libexpo-sqlite, libfbjni, libgesturehandler,
libgifimage, libhermes, libhermestooling, libimage_processing_util_jni,
libimagepipeline, libjsi, libmlkit_google_ocr_pipeline,
libnative-filters, libnative-imagetranscoder,
libreact_codegen_reactnativekeyboardcontroller,
libreact_codegen_rnscreens, libreact_codegen_rnsvg,
libreact_codegen_safeareacontext, libreactnative, libreanimated,
librnscreens, librnskia, libsentry-android, libsentry, libstatic-webp,
libsurface_util_jni, libtensorflowlite_gpu_jni, libtensorflowlite_jni,
libworklets, libxeno_native.

`zipalign -c -P 16` → **"Verification succesful"** (tool's own spelling).

**Near-miss recorded.** Two 4 KB-aligned libraries DO exist inside
`node_modules/expo-sqlite` — `libsql/arm64-v8a/libsql_experimental.so`
and `vec/arm64-v8a/vec.so` (both `0x1000`). They are **not packaged**:
expo-sqlite only includes them when `useLibSQL` /
`withSQLiteVecExtension` are set, and app.json sets neither (only
`useSQLCipher: true`). Confirmed absent from the built APK. **If either
option is ever enabled, the artefact FAILS 16 KB compliance** — worth a
note beside that plugin config.

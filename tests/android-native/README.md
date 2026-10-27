# Native HTTPS smoke checks

These checks exercise the installed native app, not a browser export. `NetworkSmokeTest.java` uses the application's actual OkHttp factory and checks the native Cronet provider, live authentication status, POST/UTF-8 validation, unauthorized-account rejection, and cancellation. It creates no live account. `check-login-ui.py` drives native text inputs and buttons, verifies the expected API validation reply through Expo fetch, then checks the successful connection status renders without crashing. It submits only invalid test data.

Build an emulator QA variant with the test source copied to `apps/mobile/android/app/src/androidTest/java/app/sparkyouth/mobile/NetworkSmokeTest.java`. From `apps/mobile/android`, use the documented release build environment and:

```sh
./gradlew assembleRelease assembleReleaseAndroidTest \
  --init-script ../../../tests/android-native/instrumentation.init.gradle \
  --max-workers=2 -PreactNativeArchitectures=x86_64 -Pexpo.useLegacyPackaging=true
```

Install the app and test APKs after the emulator's package service is ready. Run:

```sh
adb -s emulator-5554 shell am instrument -w -r \
  app.sparkyouth.mobile.test/androidx.test.runner.AndroidJUnitRunner
ANDROID_HOME=/workspace/android-sdk python3 tests/android-native/check-login-ui.py emulator-5554
```

The cloud executor has no KVM. API 24 runs with software emulation. An attempted API 36 Google APIs image repeatedly lost core system services before app installation; this is not a completed app compatibility test. A stable boot/package manager is required before interpreting app results.

The cloud executor also requires its official HTTP proxy. For QA, a localhost ADB reverse tunnel forwards to that proxy, and a temporary ignored `src/release` manifest/resource overlay trusts the environment-provided test CAs as application-local anchors. Adding these CAs as system roots incorrectly triggers Cronet's public-root leaf-validity policy. TLS verification remains enabled. This QA overlay must never be published.

For the downloadable ARM preview, regenerate the native tree from tracked configuration with Expo prebuild, preserve/restore the preview signing key, and build without QA resource overlays. Run `scripts/verify-android-release.py` on the final APK: it rejects test trust resources/manifest overrides, checks package/version/signing continuity, ARM ABIs, embedded bundle and all ARM64 ELF load alignments for 16 KB pages. APK verification is distinct from native emulator testing and from a login on the affected physical phone.

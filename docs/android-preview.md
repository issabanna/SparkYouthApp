# Android preview APK

The preview is a standalone release-mode JavaScript bundle signed with the generated Android debug key. It does not need Expo Go or Metro. This signing key is for testing; store distribution uses separate signing credentials.

Local requirements: JDK 17, Android SDK platform 36, build tools 36.0.0, NDK 27.1.12297006 and CMake 3.22.1. Set `JAVA_HOME` and `ANDROID_HOME` to the installed tools.

```sh
cd apps/mobile
npx expo prebuild --platform android --no-install
cd android
./gradlew assembleRelease --max-workers=4 \
  -PreactNativeArchitectures=arm64-v8a,armeabi-v7a \
  -Pexpo.useLegacyPackaging=true
```

The output is `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`. Generated native projects and APK files are ignored by default. Prebuild can update workspace package scripts; review those changes before committing.

The preview includes the Arabic app, optional participant fields for testing, and camp tent selection. Published public content and images can synchronize through the configured content service; version 0.1.4 connects registrations and profiles to authenticated shared accounts. Device installation and interaction should be tested separately from a successful build.

The existing EAS `preview` profile also produces an APK once an Expo account and project are connected.

## Current cloud build environment

This workspace has JDK 17 at `/workspace/jdk17`, Android SDK at `/workspace/android-sdk`, Android user files at `/workspace/android-user`, and Gradle cache at `/workspace/spark-gradle`. Use `JAVA_HOME`, `ANDROID_HOME`, `ANDROID_USER_HOME`, and `GRADLE_USER_HOME` respectively. For Java HTTPS requests, use the inherited proxy and the environment's CA trust store at `/etc/ssl/certs/java/cacerts`; do not disable certificate verification.

The initial Maven download denial was resolved by enabling `repo.reactnative.dev`. The local `assembleRelease` build completed successfully. APK verification confirmed its v2 signature, launcher activity, package `app.sparkyouth.mobile`, minimum Android API 24, both ARM architectures and embedded Hermes JavaScript bundle. The archive is non-debuggable and passes ZIP integrity validation. This is build/package validation, not a physical-device test.

The downloadable artifact is `apps/admin/public/downloads/spark-youth-preview-0.1.4.apk`; its companion JSON records the source commit, file size, SHA-256 checksum and testing limits. After deployment it is available at `https://sparkyouth.vercel.app/downloads/spark-youth-preview-0.1.4.apk`.

Version 0.1.1 replaces the yellow top banner with a compact white header. Version code 2 and the same preview signing key allow installation as an update to 0.1.0.

Version 0.1.2 bundles sample photos and the logo as native resources, adds image-error placeholders and retrieves published content through the Supabase-backed API. Version code 3 uses the same preview signing key. See `docs/image-publishing.md` for required server configuration.

Version 0.1.3 adds admin control of the welcome image and caches the immutable Supabase imports of the starter photos. Replacing an image in admin produces a new ID and updates the app through the published content endpoint. Version code 4 uses the existing preview signing certificate.

Version 0.1.4 (code 5) includes real email/password login with automatic confirmation for new accounts, the smaller account-details form, leader applications and portal, profile-photo editing, announcement swiping and consistent native dropdown styling. Admin assignments are now in a separate menu page. It uses the same preview signing certificate as 0.1.3 and contains an embedded Hermes bundle for both ARM ABIs.

The build, ZIP integrity, package metadata and signature have been verified; physical-device testing remains pending. Native bus camera scanning remains web-only in this APK; use Android Chrome for live QR scanning. The app still provides manual QR-content entry.

For this workspace's Gradle build, also set `EXPO_NO_TELEMETRY=1` and `EXPO_OFFLINE=1` to avoid Expo attempting to write telemetry outside the writable workspace. Use `--offline` only when all required Gradle dependencies are already cached.

Version 0.1.5 (code 6) switches authenticated native API requests to `expo/fetch`, which preserves Android transport errors that React Native's global fetch reduced to `Network request failed`. The HTTPS API address and certificate verification stay the same. Login errors now distinguish DNS, TLS, timeout, invalid server response and HTTP authentication rejection. A native login-screen connection check calls the public authentication status endpoint without sending credentials. Requests are not automatically retried, to avoid repeating registration/payment writes. This change addresses the reported APK-only failure; its root cause and successful login on the affected physical device remain unconfirmed.

Version 0.1.6 (code 7) fixes an Android crash when rendering status messages. React Native 0.81's Android `AccessibilityRole.fromValue` rejects `accessibilityRole="status"`; the supported `role="status"` prop uses the separate Android Role enum. All affected messages (connection check, account password/photo, evaluation and upload check) now use the supported role and a polite live region. A regression check validates literal roles against the installed native enums. The credential-free connection check can display the underlying native exception (bounded to 1000 characters); login and authenticated request errors do not expose it. The original APK connection failure is still unconfirmed on-device.

Version 0.1.7 (code 8) responds to the on-device diagnostic `java.net.SocketException: Connection reset`. A tracked Expo config plugin installs an OkHttp factory before React Native initializes, using HTTPS over HTTP/1.1, retaining the platform trust store and hostname verification. Both React Native and Expo fetch obtain clients through this factory. Connection/read/write timeouts are bounded and automatic connection retries are disabled so failed registration/payment writes are not replayed. The live authentication endpoint responded over HTTP/1.1 in a server-side check. Connection resets are now classified as `E_RESET`. HTTP/2 incompatibility is a hypothesis, not a proven root cause; success on the affected phone is pending.

Version 0.1.8 (code 9) keeps native React Native screens and switches the native OkHttp factory to Google's Cronet adapter 0.1.2 with bundled Cronet 500.1.0. ACCESS_NETWORK_STATE is included, as required by that native stack. Both ARM ABIs are packaged, and all ARM64 ELF load alignments satisfy 16 KB page requirements. API 24 native instrumentation (5 checks), actual native login-form validation and connection-check success rendering passed in an emulator. The cloud proxy was trusted only in a separate QA resource overlay; the clean downloadable preview contains no such trust override. API 36 emulator startup instability prevented app-runtime verification there. Subsequent affected-phone testing still reported ERR_CONNECTION_RESET, so 0.1.8 is not a confirmed fix. See docs/native-network-recovery.md.

Version 0.1.9 (code 10) removes the large home heading “مغامرتنا تجمعنا” and updates the build label. It retains the native Cronet transport and the existing preview signing key. This UI-only update does not resolve the affected phone's connection reset. Its package/signature/ABI checks are separate from the native emulator checks recorded for 0.1.8.

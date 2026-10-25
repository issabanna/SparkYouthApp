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

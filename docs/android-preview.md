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

The preview includes the Arabic app, optional participant fields for testing, and camp tent selection. Native content and registrations are prototype state, not synchronized with the web admin or a backend. Device installation and interaction should be tested separately from a successful build.

The existing EAS `preview` profile also produces an APK once an Expo account and project are connected.

## Current cloud build environment

This workspace has JDK 17 at `/workspace/jdk17`, Android SDK at `/workspace/android-sdk`, Android user files at `/workspace/android-user`, and Gradle cache at `/workspace/spark-gradle`. Use `JAVA_HOME`, `ANDROID_HOME`, `ANDROID_USER_HOME`, and `GRADLE_USER_HOME` respectively. For Java HTTPS requests, use the inherited proxy and the environment's CA trust store at `/etc/ssl/certs/java/cacerts`; do not disable certificate verification.

The initial Maven download denial was resolved by enabling `repo.reactnative.dev`. The local `assembleRelease` build completed successfully. APK verification confirmed its v2 signature, launcher activity, package `app.sparkyouth.mobile`, minimum Android API 24, both ARM architectures and embedded Hermes JavaScript bundle. The archive is non-debuggable and passes ZIP integrity validation. This is build/package validation, not a physical-device test.

The downloadable artifact is `apps/admin/public/downloads/spark-youth-preview-0.1.1.apk`; its companion JSON records the source commit, file size, SHA-256 checksum and testing limits. After deployment it is available at `https://sparkyouth.vercel.app/downloads/spark-youth-preview-0.1.1.apk`.

Version 0.1.1 replaces the yellow top banner with a compact white header. Version code 2 and the same preview signing key allow installation as an update to 0.1.0.

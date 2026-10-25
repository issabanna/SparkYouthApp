# Native beta distribution

Standalone Android preview builds are available; see docs/android-preview.md. Store uploads have not been performed.

## Account and identity prerequisites

- Confirm whether these builds replace existing store apps. Preserve their exact iOS bundle ID, Android package name, store records and signing identities. The Android package currently in app.json is provisional; iOS bundleIdentifier is deliberately unset until confirmed.
- Link the project to the intended Expo account and EAS project. Use an authenticated EAS CLI session and run project initialization only after ownership is confirmed.
- Apple: active Apple Developer membership, App Store Connect app, distribution signing and provisioning, and authorized upload access. TestFlight external testers can require Apple beta review.
- Google: Play Console app, correct signing/upload credentials and authorized service account configured securely. Initial app setup/upload may require Play Console actions before automated submissions work.
- Store credential files belong in the build provider secure credential store, never in Git or chat.

## Commands after prerequisites are configured

From /workspace/SparkYouthApp/apps/mobile with an authenticated EAS CLI:

1. `eas build --platform ios --profile production`
2. `eas submit --platform ios --profile production` (select the intended build and App Store Connect app)
3. `eas build --platform android --profile production`
4. `eas submit --platform android --profile production` (internal track, draft release)
5. Configure TestFlight testers and publish the Google internal testing draft to the intended testers in the store consoles. Upload alone does not distribute to testers.

For Android APK sharing without Play Console: `eas build --platform android --profile preview`. iOS internal distribution requires registered device provisioning; TestFlight is preferred for this request.

The app uses real Supabase authentication and a private shared registration backend. Learning progress remains a local preview, and bus camera scanning currently uses the web version. Browser preview is at /app/ on the web deployment; it does not validate native behavior. Test actual builds before distributing them.

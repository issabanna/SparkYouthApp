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

0.1.5 / Android version code 6: native authenticated requests use Expo fetch with classified connection errors and a credential-free connection-check button on the login screen. Same preview signing key; installs over 0.1.4. Physical-device login verification is pending; do not treat successful packaging as proof that the reported connection failure is resolved.

0.1.6 / code 7: fix Android status-message accessibility crash, including connection-check results. Preserve status semantics with the supported role prop and polite announcements. Show native exception details only for the public credential-free status check. Original login connection failure still needs physical-device verification.

0.1.7 / code 8: Android HTTP/1.1 compatibility build for the reported `SocketException: Connection reset`. Platform TLS checks remain enabled. Tracked Expo plugin preserves client configuration across native regeneration. Failed writes are not automatically replayed. Diagnostic screen includes build/protocol and distinguishes E_RESET. Physical-device verification pending.

0.1.8 / code 9: native Cronet networking replaces the reset-prone native transport; no WebView shell. Native API 24 tests and native login/connection-check UI passed. Normal network-state permission added. Clean ARM APK checked for existing signing key and 16 KB page support. No test CA is included. Android 16 emulator app testing was blocked by OS startup failures; physical-device confirmation is pending. Remains a preview signed with the existing testing certificate.

Affected-phone follow-up: 0.1.8 still reports Cronet ERR_CONNECTION_RESET on the public status check. Emulator passes do not establish that the original connection failure is resolved. A credential-free Chrome protocol/API check is available at /native-network-check.html.

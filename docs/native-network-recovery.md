# Native Android connection recovery

## Confirmed findings

The affected phone can authenticate in Android Chrome, but native release 0.1.7 fails even on the credential-free `/api/auth` GET. The diagnostic is `java.net.SocketException: Connection reset`. Both React Native fetch and Expo fetch encountered the reset. Forcing HTTP/1.1 did not resolve it. This does not identify the resetting component or establish a TLS/certificate, DNS or HTTP/2 cause.

The separate status-message crash was traced to Android rejecting `accessibilityRole="status"` and corrected with the supported `role="status"` prop in 0.1.6. This fix passed the source-contract regression check against installed Android native role enums; affected-phone confirmation showed the result rendered successfully.

The attempted browser-shell approach was rejected by the user. It was discarded without committing or publishing. The current native activity is ReactActivity, the application is MainApplication, and the shipped build remains native 0.1.7 (code 8).

## Next native approach

Evaluate Google's maintained Cronet Transport for OkHttp with an embedded Cronet provider, retaining React Native UI and the authenticated API contract. A bundled provider is needed to support devices without Google Play Services; avoid relying solely on Android 14's platform HttpEngine. Pin a currently supported compatible Cronet version after reading official Maven metadata and checking minimum SDK/ABI requirements.

The official integration reference is https://github.com/google/cronet-transport-for-okhttp at reviewed commit `84a5424e04b47a6f257db032b6a7c2ce6183080f`. Its sample uses `com.google.net.cronet:cronet-okhttp:0.1.1` and minimum SDK 24, matching Spark's existing Android 7.0 minimum. The application interceptor must be last; it bypasses OkHttp core/network interceptors, caches, cookies, authentication and retries, and cancellation has propagation limitations. Review these implications against Expo fetch, public-content requests, image fetching and bearer-token APIs before adopting it. Do not write a custom TLS trust manager or bypass certificate validation.

## Build prerequisite

The running environment explicitly denied `dl.google.com` and `repo.maven.apache.org`. A saved environment network draft adds those two destinations while preserving existing allowed domains. The environment tool returned `requires_publish: true`; saving the draft does not apply it. After the user saves/publishes the settings, retry downloads through the inherited proxy with certificate verification enabled. Google hosts Android SDK/emulator downloads as well as Google Maven dependencies.

## Acceptance before another user build

- Restore/reuse the current native activity and preserve the preview signing key.
- Resolve, pin and compile the maintained transport and provider, with the supported SDK and ARM ABI range unchanged.
- Exercise real native request/response handling, authentication errors, refresh, sign-out, timeout/cancellation and upload semantics across representative supported Android versions, including the oldest supported API. Browser tests alone do not exercise the native transport.
- Verify the signed artifact's version, launcher, permissions and native library ABIs, and verify downloaded published bytes.
- Keep successful build/emulator checks distinct from successful login on the originally affected physical device. Do not call the connection failure resolved or the APK ready for public release while those outcomes remain unverified.

No compatible Cronet replacement has been compiled or tested yet. No replacement APK was published for this proposed approach.

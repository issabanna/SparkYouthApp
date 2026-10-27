# Native Android connection recovery

The affected phone authenticates in Android Chrome, but native 0.1.7 fails even on the public `/api/auth` GET with `java.net.SocketException: Connection reset`. React Native fetch, Expo fetch and an HTTP/1.1-only OkHttp configuration encountered the reset. The resetting component was not identified; HTTP/2 was not established as the cause.

The user requires native screens across the supported Android range. The attempted browser shell was discarded without publishing. Version 0.1.8 remains React Native with an embedded Hermes bundle and ReactActivity.

## Implemented transport

A tracked Expo plugin installs Google's Cronet OkHttp adapter `0.1.2` with bundled Cronet `500.1.0` (native engine `155.0.8059.16`) before React Native initializes. Both dependencies were pinned from Google's Maven metadata. The bundled provider supports API 24+, works without Google Play Services and includes ARM32/ARM64 libraries. Requests use the maintained native transport rather than WebView or an Android 14-only API.

The factory is shared by native networking clients. Its interceptor is initialized lazily on request threads, has bounded call/read/write timeouts, rejects insecure release URLs and redirects, retains certificate verification and does not add application-level mutation retries. Native initialization failures are converted to request errors. ACCESS_NETWORK_STATE is declared as a normal permission required by Cronet. No credentials or service keys were added to the APK.

The adapter bypasses OkHttp core/network interceptors, cookies and cache. Spark's native authenticated APIs use bearer headers; admin browser-cookie authentication is unchanged. API URLs are final HTTPS endpoints. Development HTTP requests use ordinary OkHttp only in debug builds. Cronet-style reset/certificate/timeout errors are mapped to the existing diagnostic categories. Detailed errors remain limited to the credential-free public connection check.

The login form's ScrollView now lets buttons handle taps while an input is focused, avoiding a swallowed first tap when the keyboard closes. The prior Android status-message crash remains fixed with the supported role prop.

## Evidence and limits

- API 24 emulator: five native instrumentation checks passed against the live API (native provider, authentication GET, login POST/UTF-8 validation, unauthorized-account rejection and cancellation).
- API 24 native UI: the real native login inputs submitted through Expo fetch and rendered the expected Arabic API validation message. The connection-check button rendered its successful status without crashing. These checks created no live account and did not use the user's password.
- Real signup/login, automatic confirmation, refresh, stable account ownership, password changes and logout passed the existing local Supabase fixture/browser regression suite. This does not equal a successful live-user login on the affected phone.
- Clean ARM release: package/version/signature, embedded bundle, permissions, ARM32/ARM64 Cronet libraries and 16 KB ELF alignment for every ARM64 library verified. The final production-style preview excludes all emulator proxy trust fixtures.
- API 36 emulator: its first boot/system services repeatedly failed before the app could install. No Android 16 app-runtime success is claimed. The build targets API 36; target SDK and static packaging checks are distinct from runtime testing.
- The original phone's successful login remains pending. This is a signed preview for device testing, not a declaration that every Android device or the full app is ready for store release.

See `tests/android-native/README.md` for the native checks and the distinction between the temporary proxy QA build and the downloadable preview.

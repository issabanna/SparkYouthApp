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
- Subsequent affected-phone testing of 0.1.8 still failed with `net::ERR_CONNECTION_RESET` (error code 8, internal code -101), including on the public status GET. The Cronet change did not resolve that phone's connection. Direct same-phone Chrome API/protocol comparison is the next required evidence. `native-network-check.html` performs credential-free browser GET/POST probes and reports negotiated protocols; it does not replace the native app.
- The original phone's successful login remains pending. This is a signed preview for device testing, not a declaration that every Android device or the full app is ready for store release.

See `tests/android-native/README.md` for the native checks and the distinction between the temporary proxy QA build and the downloadable preview.

## Browser follow-up

The affected phone subsequently loaded `/api/auth` as a top-level browser navigation and received `configured: true`. Regular Chrome also showed connection resets on other attempts. The first browser diagnostic loaded its document over `h2`, but both credential-free API fetches failed with `TypeError: Failed to fetch`. This is not an APK-only reproduction. Protocol h2 for the document does not establish that an API request reached the function.

Diagnostic version 2 compares static-file access, the unchanged auth URL without a query, anonymous auth GET/POST, and normal same-origin browser-session GET/POST. It reports status, response type and Vercel mitigation header when a response is available. No email/password or cookie values are collected. A browser-security cookie gate is a hypothesis to test, not a confirmed cause. The auth route itself does not require browser cookies. No Vercel management session/CLI credential is available in the current workspace to inspect edge-security settings directly.


## Intermittent failures reported after protection comparison

The user reported successful native access with Vercel Deployment Protection disabled, then failure after re-enabling it. Screenshots confirmed Standard Protection, a Current Production deployment, Bot Protection off and no custom firewall rules. Vercel rejected a production-domain exception. The user subsequently clarified that repeated attempts sometimes succeed, so a consistent protection gate and the exact resetting component remain unproven. No hosting security changes were made by the agent.

Read-only API transport failures (reset, DNS or generic network errors) now receive at most two automatic retries with short exponential backoff and jitter. All attempts share the original 30-second deadline. HTTP responses, certificate errors, timeouts and mutations are not automatically retried. Leader/account status failures retain existing loaded data, and a missing status presents a reload action instead of labeling the user unapproved. Tests cover recovery, bounded attempts, deadline during backoff, TLS rejection and no mutation retries. The web build passes; affected-phone verification of this change requires a new APK and remains pending.


## Startup recovery and current browser evidence

On the latest affected-phone report, regular Chrome could open/sign in over both Wi-Fi and mobile data, while Incognito showed a Vercel sign-in page and the installed native app failed during saved-session restoration. This establishes that the tested public URL presented a browser-only deployment authentication gate; the current Vercel Authentication scope must be checked. No new native networking experiment was made, and no bypass secret is embedded in the app.

Startup hardening (not an underlying reset fix): an authenticated `GET /api/auth?bootstrap=1` now returns the verified user's account with the session result. Startup uses that one client request instead of separate auth/account reads. Authentication and server ownership checks remain mandatory; a local cache is not used to grant access. A recovery card preserves the saved session for retry, offers a credential-free public status check, and lets the user explicitly discard the local session to return to login without requiring a successful logout request. Attempt generations prevent stale startup results from changing a newer session, and a late refresh cannot overwrite an explicitly cleared session. A local browser regression reproduces exhausted connection failures, confirms no account tabs are exposed, exercises recovery, checks that no second account GET occurs after bootstrap, and confirms local return-to-login. This source change is not included in the already-published 0.1.11 APK; a hosting protection correction can be tested with that existing APK before any new release.

# Real user accounts

The app uses Supabase Auth email/password sign-up and login. There is no anonymous/demo login. The old anonymous session endpoint returns 401; saved demo profile objects and 64-character bearer tokens no longer grant access. Existing private demo records remain available to admin, but are not automatically transferred or granted to newly created users.

The server uses SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY already configured in Vercel. No new SQL or public browser service key is required. The service key stays on the server. Supabase handles password hashing, password policy, email confirmation and authentication rate limits. The app requires at least eight characters for new passwords. Each protected user request verifies its access JWT through Supabase getUser; the database owner hash is derived from the authenticated user UUID, so the same login sees the same records on different devices.

## Supabase dashboard settings

In Authentication → Providers → Email, enable email sign-ups. Keep Confirm email enabled if email verification is wanted.

In Authentication → URL Configuration set:

- Site URL: `https://sparkyouth.vercel.app/app`
- Redirect URLs: `https://sparkyouth.vercel.app/app`

Confirmation links must be allowed to return to the app. The app verifies callback access tokens on the server before saving the session and immediately removes tokens from the URL fragment. If confirmation is enabled, sign-up asks the user to check their email and then sign in. SMTP/email delivery and Supabase email limits are managed in Supabase, not by the app. Do not disable confirmation to work around a broken redirect.

## Sessions and profile

Email/password comes first; basic account information is collected once after authenticated sign-up. The leader form continues to preview that saved profile. Account photos, applications, registrations and bus permissions use the authenticated owner's stable UUID mapping. The user can change their password in حسابي using their current password, and log out through the same menu.

Session tokens are stored in localStorage on web and the app's private FileSystem document directory on native. Expired sessions refresh through the server; failed/invalid refresh returns the user to login. Web logout clears authentication and the current profile view/cache. Local learning progress remains a separate preview feature, not a shared learning database. The existing APK must be rebuilt to include the new login screens.

Password reset by email is not implemented in this change; users who know their current password can change it in the account screen.

Integration tests use real Next routes and the installed Supabase client against a mock Auth/PostgREST server. They do not send real signup emails or create test users in the live project.

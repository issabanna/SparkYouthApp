# Shared registrations and payment receipts

Run `supabase/002_registrations_and_receipts.sql` in the existing Supabase SQL Editor. It creates private registration tables and server-only functions for atomic, versioned updates. Existing `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `ADMIN_PASSWORD` in Vercel are reused; no new database credential is needed. Deploy the code, run the migration, then refresh admin and `/app`.

Configure each activity's **تعليمات قبل التسجيل**, **تعليمات بعد التسجيل** (payment directions), and **تعليمات بعد الموافقة**. Publish content as usual. The last text is excluded from `/api/content`; an owner sees it only after their registration is approved.

When **طلب الدفع ورفع وصل قبل الموافقة** is enabled, submissions show **بانتظار الدفع**. Uploading a receipt shows **الوصل قيد المراجعة**. Admin **قبول الوصل واعتماد الطلب** accepts payment evidence and approves the application in one atomic update. **طلب تصحيح الوصل** returns it to waiting for payment and allows re-upload. Disabling payment collection leaves applications awaiting admin approval. Waiting-list applications never reserve a numbered tent; allocate a place before requesting payment.

Receipts and participant documents are stored in private registration JSON, never in the public-facing media bucket. Receipt images are served only through an authenticated admin endpoint with no-store caching. Database RPCs are restricted to the service role. A per-activity revision and database lock prevent simultaneous updates from overfilling a tent or overwriting receipt decisions. The server validates submissions against published settings.

This is still a preview login: ownership uses an unguessable device session token stored in browser storage, or the app's private native document directory. Owners can return from the same browser/device after closing the app. Clearing browser/app data loses that session; signing in on another device does not restore it. Real account authentication and recovery are a separate feature. Previous browser-only registrations are not automatically imported because their ownership and image data cannot be verified by the shared backend. Native users need a rebuilt APK for these changes.

If Supabase is configured but the registration migration is absent, the app shows a setup/unavailable error and blocks shared submission; it does not pretend a local-only request reached the dashboard. Local development without Supabase retains the explicitly labelled local preview.

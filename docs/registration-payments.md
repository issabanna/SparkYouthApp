# Authentication update

Real Supabase email/password accounts now replace the older device-session mechanism described below. See [current account setup](user-accounts.md). Historical device-owned records are not automatically assigned to new accounts.

# Shared registrations and payment receipts

Run `supabase/002_registrations_and_receipts.sql` in the existing Supabase SQL Editor. It creates private registration tables and server-only functions for atomic, versioned updates. Existing `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `ADMIN_PASSWORD` in Vercel are reused; no new database credential is needed. Deploy the code, run the migration, then refresh admin and `/app`.

Configure each activity's **تعليمات قبل التسجيل**, **تعليمات بعد التسجيل** (payment directions), and **تعليمات بعد الموافقة**. Publish content as usual. The last text is excluded from `/api/content`; an owner sees it only after their registration is approved.

When **طلب الدفع ورفع وصل قبل الموافقة** is enabled, submissions show **بانتظار الدفع**. Uploading a receipt shows **الوصل قيد المراجعة**. Admin **قبول الوصل واعتماد الطلب** accepts payment evidence and approves the application in one atomic update. **طلب تصحيح الوصل** returns it to waiting for payment and allows re-upload. Disabling payment collection leaves applications awaiting admin approval. Waiting-list applications never reserve a numbered tent; allocate a place before requesting payment.

Receipts and participant documents are stored in private registration JSON, never in the public-facing media bucket. Receipt images are served only through an authenticated admin endpoint with no-store caching. Database RPCs are restricted to the service role. A per-activity revision and database lock prevent simultaneous updates from overfilling a tent or overwriting receipt decisions. The server validates submissions against published settings.

This is still a preview login: ownership uses an unguessable device session token stored in browser storage, or the app's private native document directory. Owners can return from the same browser/device after closing the app. Clearing browser/app data loses that session; signing in on another device does not restore it. Real account authentication and recovery are a separate feature. Previous browser-only registrations are not automatically imported because their ownership and image data cannot be verified by the shared backend. Native users need a rebuilt APK for these changes.

If Supabase is configured but the registration migration is absent, the app shows a setup/unavailable error and blocks shared submission; it does not pretend a local-only request reached the dashboard. Local development without Supabase retains the explicitly labelled local preview.

## Approvals without a receipt and audit history

**تأكيد الطلب بدون وصل** opens a required justification box. **حفظ السبب وتأكيد الطلب** approves only after the server validates a 3–1000 character reason and the existing capacity/tent rules. The override stores a `paymentWaiver`; it does not pretend a receipt was uploaded or accepted. Normal status changes cannot bypass this explicit route.

Each registration's **سجل إجراءات الطلب** shows successful submissions, receipt uploads/re-uploads, receipt rejection or acceptance with approval, seat allocation/payment requests, approval, rejection, cancellation, and approvals without a receipt. Events are appended on the server in the same atomic update as the registration. Each stores time, actor, before/after statuses and tent, and the override reason when applicable. History begins when this feature is deployed; older actions are not fabricated retroactively. Audit logs and waiver notes are returned only to authenticated admins, not to the owner or public content API.

The current shared admin password identifies an authenticated admin **session**, not an individual staff member. Times display in Asia/Amman. No additional SQL migration is required: the audit trail is stored inside the existing private registration JSON.

## Compact admin review

The registration page shows only camper name, camp/activity, and workflow status, with name/reference search, camp/status filters and 25 rows per page. Opening a row loads its private detail record and images into a modal. Use **تعديل بيانات الطلب والخيمة** to amend personal/contact/guardian/school/medical fields and move active registrations to an eligible tent, including already approved registrations. Save or cancel edits before making an approval/payment decision.

Admin edits use a strict field whitelist, expected prior values, per-activity atomic commits, DOB/grade validation, duplicate detection and gender/capacity checks. They preserve ownership, payment/receipt decisions and existing documents. Audit events store the changed fields' before/after values. Waiting-list place allocation continues through the explicit seat-allocation action. No new SQL migration is required.

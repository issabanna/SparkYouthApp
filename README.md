# Spark Youth

Arabic-first replacement foundation: Expo mobile app (Android/iOS) and Next.js web administration. UI copy is prepared for future English localization; mobile strings live in packages/shared. Published content and images can use Supabase with password-protected admin publishing. Registration and receipt records use private Supabase storage after migration 002; camper sign-in, leader approvals and attendance remain prototypes. No Adalo data has been migrated.

## Development

Use the existing checkout; a separate worktree is unnecessary.

- Node.js 24 and npm 11 were used for setup.
- `npm ci` installs locked dependencies.
- `npm run admin` starts the Arabic admin interface on port 3000.
- `npm run mobile` starts Expo. Use Expo Go or a development build on a physical device. iOS native builds require macOS/Xcode or a configured remote build service.
- `npm run build` validates the admin production build.

## Next implementation milestones

1. Database and authenticated Youth / Leader / Admin permissions enforced by the backend.
2. Run the shared registration migration and replace device-session ownership with authenticated camper accounts and recovery.
3. Per-admin accounts and server-side audit records for program and registration management.
4. Shared learning comments, notifications and QR/bus attendance.
5. Adalo migration planning, privacy/guardian requirements, device testing and store delivery.

No existing data is imported. Capacity policy, consent requirements, branding assets and data migration still need final product decisions. Never store plaintext passwords in the Users table.

## Mobile browser review

`npm run build` exports the Expo mobile UI to the admin public/app directory before building Next.js. Visit `/app/` on the deployed site to review the mobile prototype. This is the same React Native screen rendered for web, not a native device test. Camper sign-in remains a demo; shared public content and images load when Supabase is configured.

## Camping community preview

The wall has been removed. The mobile preview now starts with a clearly marked demo sign-in, then shows announcement slides, activities, galleries, learning journeys, reflection/completion, comments and personal completion counts with clearly labelled example leaderboards. Camper and pending-leader demos cannot see leader-only journeys; the approved-leader demo can. These are client-side preview rules, not backend authorization.

The admin can add, edit, reorder, publish and remove content and moderate local comments. The overview accepts an original PNG/JPEG/WebP logo under 500 kB on a white background. Seed camp illustrations are placeholders, not real camp photographs. Activity dates intentionally remain unset pending actual scheduling.

With Supabase configured, admin content is privately stored and published through the server; localStorage is the unconfigured preview fallback. Shared registrations and receipts require [migration 002](supabase/002_registrations_and_receipts.sql). See [payment setup and the device-session limitations](docs/registration-payments.md). Progress/sign-in are still previews; there is no authenticated account recovery or cross-device member access.

### Browser regression check

After `npm run build`, start the production server on port 3004 with `npm run start --workspace @spark/admin -- --port 3004`. Run `npx playwright install chromium` once, then `npm run test:preview`. If Chromium is already installed, set `CHROMIUM_PATH` to its executable. Set `SPARK_TEST_URL` to test another origin. Tests cover sign-in gating, announcement navigation, gallery viewing, audience rules, reflection persistence, comments, deduplicated completion, and admin edits reaching the app preview.

## Visual identity

Mobile uses bundled Tajawal Arabic fonts, Ionicons navigation, Spark yellow/black/white, a fixed floating tab bar and progress rings. Fonts/icons are included in the web export rather than fetched from a third-party CDN. `public/media/camp.png` and `trail.png` are generated sample photographs, not photographs of actual Spark campers. `spark-logo.png` is a reference-based preview reconstruction of the logo supplied in chat; the original PNG/SVG is needed for exact official branding. It is embedded by default on mobile and admin; a locally uploaded logo still takes priority.

## Camps, trips and event registrations

The five mobile tabs are Home, Activities, Learn, Ranking and Account. Learning is labelled «تعلّم» with «مسارات التعلّم» inside the section. Activities have camp/trip/event filters plus My registrations. Admin manages activity type, age limits, capacity, external confirmed places, availability, waitlists and participation instructions.

Registration collects camper details, optional meal/transport requests, review and consent. Standard camp requests become Pending while capacity is available; a camp waiting list must be explicitly opened by admin. Non-camp requests become Pending when capacity is available, otherwise Waiting if enabled. Pending does not reserve a place; admin approval consumes capacity. Duplicate active requests for the same participant are blocked; accounts can submit separate requests for multiple campers, and only Pending/Waiting requests can be cancelled. Leader applications are handled by a separate leaders workflow, not this registration form. No email, payment, real booking or check-in is performed.

Registrations are local preview records under `spark-event-registrations-v1`. Demo ownership uses the entered demo name, not an authenticated identity. Do not enter actual sensitive participant data. Browser-local validation is not transactional backend protection; secure authentication, persistent shared storage and server-side approval/capacity rules remain required. Native preview records currently remain in memory.

A versioned migration preserves previously edited content and adds the sample camp/trip once to older preview data. Deleted samples do not reappear after migration.

Run `node tests/registration-rules.cjs` for registration rules and migration checks. With the server running, `CHROMIUM_PATH=/usr/bin/chromium SPARK_TEST_URL=http://localhost:3008 npm run test:registrations` exercises registration, admin approval, waitlists and cancellation in Chromium.

## Camp configuration and tent allocation

Admin can configure the activity date, fees/currency, instructions before registration, payment instructions after submission, approved-only instructions, inclusive date-of-birth limits and waiting-list availability. City/school/shirt choices are shared; collection switches are per activity. A camp's grade dropdown is its grade eligibility list. No payment is charged by the app; campers upload receipts for admin review.

Optional tent selection applies only to camps: male tents 0–6, female tents 7–13; each defaults to 10 places. Admin can adjust each tent's capacity while registration is open. Pending and Confirmed reserve tent places. Cancelled, Rejected and Waiting do not. Capacity cannot be reduced below occupied places. Overall camp capacity is a separate ceiling. Applicants outside the configured male/female tent groups are directed to contact admin for accommodation rather than assigned an incompatible tent.

Camp registration modes are Standard, Waiting list only, and Closed. A separate inactive display switch disables catalog actions; unpublished activities are hidden. Closed/inactive displays «غير فعّال», without implying the activity is coming soon. In Waiting-list-only mode, numbered tents are hidden and a single «قائمة الانتظار» choice is shown. All requests stay Waiting, even if space becomes available; they have no assigned tent and reserve no place. Admin must explicitly select a gender-appropriate tent with capacity and confirm. Standard camp registration does not automatically turn on a waiting list when full. Existing non-camp activity waitlists keep their previous behavior.

An older `preparing` display setting is recognized as inactive. Legacy app-version registration flags are not carried over: enforcing installed-app updates needs a remotely shared minimum-version policy and actual store URLs, which are not connected in this browser-local prototype.

`npm run test:tents` runs reservation rules plus a browser flow. Set CHROMIUM_PATH and SPARK_TEST_URL as with the other preview tests. It covers tent 0, gender changes, DOB validation, live capacities, virtual waiting-only registration and staff tent assignment.

Requested Facebook photos from https://www.facebook.com/GileadCamp have not been imported: the execution proxy blocked the request. Network additions for facebook.com and www.facebook.com were saved to the environment draft, but saving does not apply them. Existing app images remain clearly identified sample assets until original photos are provided or access is enabled.

## Multiple camper registrations

One demo account can submit and manage multiple independent participants for the same camp/event. Each request records the submitter, camper name/details, consent, status and individual tent selection. Shared contact email/phone do not block siblings or friends. Active duplicates within the account are checked by normalized participant name plus DOB when both requests provide one, otherwise name/age/gender; this is a preview heuristic, not verified identity. Fields will be adjusted to the supplied legacy registration form.

The exact Facebook album URL https://www.facebook.com/media/set/?set=a.10153833663906742&type=3 became reachable, but its initial HTML did not expose album photo files. The automated browser encountered a CA trust error; TLS verification was not disabled. No actual Facebook photos have been imported. Original JPG/PNG files or a ZIP are still needed to add the real photographs reliably.

## Legacy camp form and branded templates

See [the field-by-field comparison](docs/registration-comparison.md) for the fields and workflow adapted from the supplied screenshots. New camps collect camper/guardian/school/medical details, ID images and separate payment receipts per camper; paid requests require accepted receipts before confirmation. One account can manage several campers. Confirmed requests have a clearly marked QR preview.

Six editable Spark camp templates use school-grade groups and birth-year restrictions from the reference branding. They start inactive with no dates; the past 2026 poster dates are not reused as upcoming events. Content version 3 preserves existing edits and adds templates once. Real Facebook photos still have not been imported; original image files remain needed.

Run `npm run test:family` for the complete multi-camper/receipt browser workflow (set CHROMIUM_PATH and SPARK_TEST_URL), and `npm run test:branding` for eligibility/template migration checks. Native photo selection uses Expo Image Picker; camera and microphone permissions are disabled because the flow only selects existing images. The Android APK uses a preview signing key; store distribution still needs production signing/accounts and device QA.

## Camp poster redesign and familiar names

Camp cards now use taller framed color bands, larger circular photos, oversized outlined category names and a compact information footer. Home uses a compact version of the same poster. Familiar categories replace invented seed names: «مخيم الأطفال», «مخيم الشبيبة» and «المخيم الرياضي», with school grades displayed separately. Content version 4 renames only exact old seed titles and announcement wording; custom admin names, capacity, images, registrations and prior deletions remain intact. Existing saved registration lists display the current camp title while keeping original record snapshots.

## Images and publishing

See [image publishing setup](docs/image-publishing.md) and run [the Supabase SQL setup](supabase/001_content_and_images.sql) in the chosen project. Admins can upload content photos from their device; configured Supabase storage publishes them to the app. Sample photos are bundled into the native APK. See [Android preview builds](docs/android-preview.md) for APK verification and download metadata.

When server-side Supabase settings are configured, `npm run build` also imports the initial sample images into the private bucket and connects their references to admin content. This importer preserves custom uploads/settings and skips already migrated content; see `docs/image-publishing.md`.

## Shared payment workflow

Run [002_registrations_and_receipts.sql](supabase/002_registrations_and_receipts.sql) and follow [registration payment setup](docs/registration-payments.md). The workflow is waiting for payment → receipt review → approval. Admin acceptance of a receipt also approves the request; rejection lets the camper re-upload. Approval instructions are excluded from public content and returned only for approved owner registrations. Returning requests use the same browser/device session for now.

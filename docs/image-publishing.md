# Images and shared content

The mobile sample camp, trail, team and logo images are bundled as native resources. They do not require a website download. `MediaImage` centralizes image resolution for native resources, uploaded data images and HTTPS/API images, and displays an explicit placeholder on failure.

Admin upload controls cover activity images, announcements, learning images, galleries (multiple files with removal), and the logo. Photos up to 10 MB are resized in the browser without cropping and compressed before upload. PNG/JPEG/WebP are accepted; SVG is not accepted. Content photos are public-facing material, not identity or medical documents.

## Supabase and Vercel setup

1. Create/select the Supabase project for Spark Youth. Run `supabase/001_content_and_images.sql` in its SQL editor. It creates `spark_content` with row-level security and a private `spark-content-media` bucket. No anonymous/authenticated read policies are added.
2. Add `SUPABASE_URL` (Project URL) and `SUPABASE_SERVICE_ROLE_KEY` (server-side service-role/secret key) to the Vercel project's environment variables. Never use a `NEXT_PUBLIC_` variable for the service-role key.
3. Retain a strong, unique `ADMIN_PASSWORD` of at least 16 characters in Vercel. Use a password manager to generate it. Do not put secrets in source, chat or client-side variables.
4. Redeploy after changing environment variables.
5. Open the admin site and sign in. Upload photos and save each item, then select **نشر التغييرات للتطبيق**.
6. Reopen/foreground the updated mobile app to retrieve the published content.

Admin requests use a signed, expiring HttpOnly/SameSite cookie (Secure over HTTPS), and write requests check their origin. Supabase service-role credentials stay server-side. The original admin snapshot, including drafts and leader-only learning, lives in private storage; the public content endpoint excludes drafts, leader-only learning and comments. The image proxy accepts only generated image IDs, not arbitrary storage keys. Content image uploads are checked by size and magic bytes. Unknown or malformed image requests cannot retrieve the private content snapshot.

Without storage configuration the website continues its explicitly labeled, browser-only preview. Configured storage with missing/invalid admin credentials fails closed. Initial connection to an empty store preserves existing local preview edits for the first publish. Remote admin drafts are kept in memory, not written to browser storage, and only a successful publish confirms shared persistence.

Image content endpoints do not implement real camper authentication, registration synchronization, or approved-leader content delivery. These remain separate backend work. Native image bundling/package verification is not a physical-device test.

## Storage adapter and remaining backend work

The app uses stable `/api/media/<id>` paths and `/api/content`, while `apps/admin/lib/content-store.js` owns Supabase-specific table/storage operations. Changing storage later can preserve these paths by copying files with their IDs and replacing that adapter. Private content and permissions must be migrated and verified explicitly.

This update uses Supabase Database and Storage. Admin access currently uses the preview's shared password and signed session. Connecting real camper accounts through Supabase Auth, approved-leader permissions, registrations, transactional tent reservations and shared comments are separate tasks. Local preview comments are preserved while published content refreshes.

## Verification

- `node tests/media-rules.cjs`: source resolution, cookie integrity, origin checks, public/private filtering and image signatures.
- `node tests/media-upload-preview.cjs`: browser-only uploads in each new section, gallery removal, preview rendering and denial of anonymous writes.
- `node tests/media-publishing-preview.cjs`: browser/app shared publishing contract using deterministic storage responses. This does not validate a real Supabase upload.
- `npm run build`: mobile web export and production admin/API build.
- Android `assembleRelease`, signature verification and resource inspection confirm sample photos and the logo are packaged into the APK. Actual Supabase connectivity and a user's authenticated upload must be checked on the deployment with its configured credentials.

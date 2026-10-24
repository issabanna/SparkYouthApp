# Spark Youth

Arabic-first replacement foundation: Expo mobile app (Android/iOS) and Next.js web administration. UI copy is prepared for future English localization; mobile strings live in packages/shared. Current screens are explicitly prototypes with no authentication, backend, live records, or migration. Do not deploy the admin publicly before implementing authorization.

## Development

Use the existing checkout; a separate worktree is unnecessary.

- Node.js 24 and npm 11 were used for setup.
- `npm ci` installs locked dependencies.
- `npm run admin` starts the Arabic admin interface on port 3000.
- `npm run mobile` starts Expo. Use Expo Go or a development build on a physical device. iOS native builds require macOS/Xcode or a configured remote build service.
- `npm run build` validates the admin production build.

## Next implementation milestones

1. Database and authenticated Youth / Leader / Admin permissions enforced by the backend.
2. Arabic registration wizard with validation, consent, transactional capacity allocation on approval, duplicate prevention and waitlist policy.
3. Admin program and registration management with audit records.
4. Learning, moderated wall, notifications and QR/bus attendance.
5. Adalo migration planning, privacy/guardian requirements, device testing and store delivery.

No existing data is imported. Capacity policy, consent requirements, branding assets and data migration still need final product decisions. Never store plaintext passwords in the Users table.

## Mobile browser review

`npm run build` exports the Expo mobile UI to the admin public/app directory before building Next.js. Visit `/app/` on the deployed site to review the mobile prototype. This is the same React Native screen rendered for web, not a native device test. No login or live backend is connected.

## Camping community preview

The wall has been removed. The mobile preview now starts with a clearly marked demo sign-in, then shows announcement slides, activities, galleries, learning journeys, reflection/completion, comments and personal completion counts with clearly labelled example leaderboards. Camper and pending-leader demos cannot see leader-only journeys; the approved-leader demo can. These are client-side preview rules, not backend authorization.

The admin can add, edit, reorder, publish and remove content and moderate local comments. The overview accepts an original PNG/JPEG/WebP logo under 500 kB on a white background. Seed camp illustrations are placeholders, not real camp photographs. Activity dates intentionally remain unset pending actual scheduling.

Content is persisted in browser localStorage under `spark-camp-content-v1`; progress is under `spark-camp-profile-v1`. Admin and `/app` must use the same origin/browser to share content. Native builds currently use sample content in memory and do not persist or synchronize progress. No real passwords, account approval, multiuser rankings or cross-device synchronization are implemented. Do not treat this prototype as secure member access. A shared backend and authenticated roles are required before real camper data is used.

### Browser regression check

After `npm run build`, start the production server on port 3004 with `npm run start --workspace @spark/admin -- --port 3004`. Run `npx playwright install chromium` once, then `npm run test:preview`. If Chromium is already installed, set `CHROMIUM_PATH` to its executable. Set `SPARK_TEST_URL` to test another origin. Tests cover sign-in gating, announcement navigation, gallery viewing, audience rules, reflection persistence, comments, deduplicated completion, and admin edits reaching the app preview.

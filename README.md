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

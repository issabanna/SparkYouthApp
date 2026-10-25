# Accounts, leader applications, evaluations and bus check-in

All participants use the same account entry screen. Basic account details are saved once in a private record; leader applications reuse a server-side snapshot and collect only the additional leader questions. The client cannot choose or submit an approved role. Admin approves/rejects applications and assigns each leader to activities, a role, team group and (for Leaders) a tent.

Account access now uses Supabase Auth email/password and verified access tokens. See [real user setup](user-accounts.md) for email verification URLs, sessions and the separation from legacy demo records. National IDs entered by users are not verified identity.

No additional SQL is required after migration 002. The existing private CAS-backed registration record store also stores records under reserved activity namespaces: `__accounts__`, `__leader_applications__`, and `__evaluations__:<activity>`. Their custom states exclude them from tent occupancy, and camper registration lists explicitly exclude reserved namespaces. Private endpoints use bearer ownership or the authenticated admin cookie; the service role key remains server-side.

## Per-activity permissions

- Manager: all three evaluation sections, all eligible subjects in that activity.
- Support Team Head: Support Team members in the same team group.
- Team Head: Leaders in the same team group.
- Leader: active campers assigned to the leader's tent in that activity.
- Support Team / Office: team and links, no evaluation access.

All approved assigned leaders see the camp team, general links and activity-specific links. No leader can self-register for an activity. Person profiles are fetched only after the server rechecks the viewer's assignment and subject scope. Profiles include a personal account photo when available, never an ID-document photo. History is limited to activities also assigned to the viewer. Camp team projections omit phone numbers, national IDs and private application details.

Admin reviews applications in طلبات المرشدين and manages approved leaders’ camp roles, teams and tents in the separate تكليفات المرشدين menu page. Admin manages general links, contact text and privacy text in general parameters; activity links, team banner and camp description are edited on the activity. Publish content changes as usual. Role assignments and approvals take effect directly, with the mobile account view refreshing every 30 seconds or on return to the foreground.

## Evaluations and reports

Support and Leader rubrics use Exceptional / Good / Need improvement / Poor. Camper forms also include the supplied yes/no questions and a conditional church-name field. Notes are optional. All answer values and subject permissions are validated server-side. Evaluators can read/edit their own evaluation; admin reports can inspect all evaluations. Concurrent edits require the previous update timestamp, and successful edits preserve an audit trail.

Each evaluation stores the camp ID, title and year, evaluation year, evaluator, camp role, subject-name and normalized-national-ID snapshot, question and scale snapshots. The camp year uses the activity date, falling back to the current year in Asia/Amman. The evaluation key includes camp year, so reusing a camp in a later year does not overwrite its previous year's evaluation. Different evaluations of the same normalized national ID can be filtered across years/camps in admin reports. Records without national IDs remain unlinked. This is a basic searchable history, not a statistical scoring or identity-verification system.

## Bus admins

Bus permissions are assigned to any saved account in the separate admin menu, independently of leader approval. Only assigned activities and a Bus App button are exposed. The server verifies activity permissions for totals, QR lookups and boarding mutations. The QR contains registration/activity IDs only; camper names/status are resolved server-side. Only Confirmed registrations may board. Boarding is atomic, audited and idempotent. Totals count non-cancelled/non-rejected registrations; pending is registered minus boarded.

Live camera scanning currently uses the browser BarcodeDetector API on supported HTTPS browsers (for example Chrome on Android), with a manual QR-content fallback. Native camera scanning is not included in the existing APK. Test camera permission, lens behavior and QR detection on physical devices before camp use; browser tests mock the camera and detector.

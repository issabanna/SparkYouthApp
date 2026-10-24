# Comparison with supplied Adalo registration screens

The screenshots supplied in chat are the field and workflow reference, not a requirement to copy the old visual layout. Camp registration uses the current Arabic Spark design and four grouped steps. Event/trip forms stay simpler.

| Existing app field or behavior | New camp implementation |
| --- | --- |
| Camper birth date | Required; age calculated at camp start if known, otherwise today; inclusive admin DOB limits enforced. |
| National ID | Added; admin can require/disable it. Treated as a string so leading zeroes are preserved. No claim of government verification. |
| Three-part Arabic name | Added as a required full-name field; underlying first/last fields derive from it. |
| Full English name | Added as required. |
| Camper phone | Preserved; a shared parent/friend number is permitted across different campers. |
| Camper grade and gender | Added grade choices and preserved gender. Camp-specific allowed grades can be configured. |
| Guardian name | Added as required. |
| Guardian phone and whose phone | Added phone plus Father/Mother/Guardian/Relative/Other selection. |
| City, school, T-shirt size | Added; admins can maintain dropdown choices. Empty city/school option lists allow free entry. |
| Medical recommendations and allergies | Added; users explicitly enter “لا يوجد” if none. Admin can disable collection. |
| ID image in both gender branches | One shared upload step for all camp genders; admin can make it required. |
| Tent choice | Optional per camp; male 0–6, female 7–13, default 10 places each. Per-tent capacity editable live. Pending/Confirmed hold places. |
| Tent confirmation and review | A review step shows participant, guardian, medical, fee and tent data before consent/submission. Campers cannot edit a submitted tent directly; pending/waiting requests can be cancelled. |
| Register more than one camper | Each account can submit multiple independent campers. “تسجيل مشارك جديد” resets camper fields rather than overwriting the previous request. |
| Duplicate registrations | A provided national ID identifies the camper across demo accounts. Otherwise name/DOB (or name/age/gender) is the account-local preview fallback. Contact phone/email are not camper identity. |
| Waiting-list acknowledgement | Explicit admin mode shows one virtual “قائمة الانتظار” choice, hides all numbered tents, and reserves no place. No payment receipt is requested while Waiting. |
| Waiting list to available place | Admin assigns a compatible available tent. For a paid camp this promotes to Pending to request payment; it does not falsely confirm an unpaid camper. |
| Submission, fees and after-registration instructions | Preserved per camper; fees/currency are snapshotted on submission. No transfer or bank API action occurs. |
| Receipt image and reference number | Added per Pending request. Owners can replace a receipt until confirmation; replacement returns to review. |
| Admin receipt verification | Accept or request correction; a paid new-form request requires an accepted receipt before confirmation unless admin disabled the requirement. |
| Confirmed and pending registration groups | Separate list headings; every camper shows an independent name, status, tent and payment state. |
| Cancellation confirmation | Preserved; only Pending/Waiting can be cancelled, releasing reserved tent capacity. |
| Confirmed QR screen | Added QR preview with opaque registration/activity IDs, name and instructions; it excludes national ID and medical data. |
| Legacy 48-hour confirmation message | Not hard-coded as an operational promise. Admin can set appropriate after-registration instructions. |

## Camp names, grade groups and branding

Editable reference-inspired templates use Spark branding: purple Kids (grades 3–5) and Explorers (6–7), burgundy Youth (8–9), Challenge (10–11), Leaders (12+), and green Sport (9–12+). The reference birth-year ranges 2008–2009 and 2008–2012 are configured separately from grades. Grades are not interpreted as ages. These templates are inactive and have no dates: the pictured 2026 dates are historical and are not advertised as current bookings. A versioned migration adds templates once and preserves existing edits and deletions.

## Preview boundaries

This remains a browser-local prototype, without real authentication or private server storage. Use fictional ID, guardian, medical and receipt information only. Image uploads are limited to 500 kB to fit local storage; a full store can reject a save without replacing existing records. Native previews keep records in memory. Actual multiuser uniqueness, transactional reservations, protected documents, encryption/access control, retention rules, bank verification and signed/checkable QR tickets need the backend. Native binaries and physical-device behavior have not been tested.

Existing previews retain their old records. New detailed submissions carry campFormVersion=2; older records are not retroactively forced through newly added payment/document requirements.

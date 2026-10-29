# Personal Bible

Open **الكتاب المقدس** directly from the main bottom navigation, or **كتابي المقدس** from Account or Learning. Ranking/achievements are now an expandable section inside Account. The native React Native and web readers use the same account API. The first release offers Arabic Smith–Van Dyke (1865) and English ASV (1901), each with 66 books, chapter selection, adjustable text, and an explicit **حفظ موضع القراءة** action that persists the position/font size across devices. Text is hosted by Spark as per-book JSON, fetched on demand with up to four books cached in memory. Full offline reading is not included.

Tap a verse to write a note. Notes are private by default. Sharing is per note and requires enabling a labeled switch and saving; the screen states that all signed-in Spark users can see the reflection and the account's first/last name. Shared notes retain their source translation. Private notes, reading positions, email, account ID and owner hash are never returned by the shared endpoint. Other accounts cannot edit or delete notes. The shared view shows up to 50 chapter-matching notes drawn from the 100 most recently updated matching libraries. It has a manual refresh; content already downloaded by someone else cannot be revoked from their device. Replies are not included.

Edit, delete or make a shared note private from **ملاحظاتي**. Deletion requires a separate confirmation. A saved note can open its original chapter/translation. A note library supports up to 300 notes of 3000 characters each, with a 1.5 MB total serialized-note limit. A revision conflict preserves the open draft and offers a library refresh. A failed save does not dismiss the draft. Library read errors do not allow a write with a guessed revision.

## Storage and access

`/api/bible` uses the existing verified Supabase user JWT and the existing server-only `spark_registrations` storage/RPCs (migration 002). No new SQL migration or API key is needed. Each library has `recordType: bibleLibrary`, its own `__bible__:<owner hash>` activity/revision partition, and one owner's notes/progress. These internal records are excluded from normal camp registration lists. Notes use compare-and-swap revisions; existing registration commits provide atomic retry protection. Reading progress does not increment the notes revision or replace notes.

All note endpoints require a real, non-anonymous account. The author comes from server-side account details, never a client-supplied identity. Shared retrieval filters for explicit shared notes and returns only a fixed public projection. Public-domain Bible JSON itself is public and contains no user data. Keys remain server-side. Read transport retries follow the bounded app policy; mutation writes are not automatically retried.

## Text sources

See `apps/admin/public/bible/NOTICE.txt` for pinned repository commits and notices. The Arabic source identifies the 1865 translation; the ASV source metadata explicitly marks Public Domain. No modern proprietary translation is included. Text is normalized to per-book JSON without paraphrase. Both datasets retain 31,102 numbered verse slots. Sixteen ASV verse slots have no text in the source edition (including John 5:4); the reader labels them explicitly instead of inserting text from another translation. Historical exports can contain transcription issues.

## Verification

`node tests/bible-rules.cjs` validates both complete datasets, every reference, known empty ASV slots, input bounds, default privacy and public projection. `node tests/bible-server.cjs` uses a local Supabase/auth fixture with the real server routes and Chromium: ownership isolation, shared/unshared visibility, unauthorized mutations, revision conflicts, progress, cross-login persistence, private author data exclusion and Arabic/English UI reading/note saving. This creates no production user data. Android role regression checks and the full web build also run. Native physical-device verification remains pending.

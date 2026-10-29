import auth from '../../../lib/user-auth.cjs';
import service from '../../../lib/content-service.cjs';
import bible from '../../../../../packages/shared/bible';
import {reply} from '../../../lib/registration-service';
import {listRegistrations} from '../../../lib/registration-store';
import leaders from '../../../../../packages/shared/leaders';
import {readLibrary, privateLibrary, publicChapterNotes, updateLibrary} from '../../../lib/bible-store';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request) {
  const user = await auth.userForRequest(request);
  if (!user) return reply({error: 'سجّل الدخول لفتح ملاحظات الكتاب المقدس.'}, 401);
  try {
    const owner = auth.ownerForUser(user), params = new URL(request.url).searchParams;
    const library = await readLibrary(owner);
    if (params.get('view') === 'shared') {
      const ref = bible.reference({translation: params.get('translation'), book: Number(params.get('book')), chapter: Number(params.get('chapter'))});
      return reply({notes: await publicChapterNotes(ref, library?.id)});
    }
    return reply(privateLibrary(library));
  } catch (error) {
    return reply({error: error.code ? 'تعذّر تحميل الملاحظات الآن. حاول مجددًا.' : error.message || 'تعذّر تحميل الملاحظات.'}, error.code ? 503 : 400);
  }
}
export async function POST(request) {
  const user = await auth.userForRequest(request);
  if (!user || !service.sameOrigin(request)) return reply({error: 'جلسة الحساب مطلوبة.'}, 401);
  try {
    const raw = await request.text();
    if (raw.length > 16000) return reply({error: 'الملاحظة طويلة جدًا.'}, 413);
    const body = JSON.parse(raw), owner = auth.ownerForUser(user);
    let author = 'مستخدم سبارك';
    if (body.action === 'save') {
      const account = (await listRegistrations(owner)).find(r => r.activityId === leaders.accountActivityId);
      author = [account?.details?.englishFirstName, account?.details?.englishLastName].filter(Boolean).join(' ') || author;
    }
    return reply(privateLibrary(await updateLibrary(owner, body, author)));
  } catch (error) {
    return reply({error: error.code ? 'تعذّر حفظ الملاحظات الآن. حاول مجددًا.' : error.message || 'تعذّر حفظ الملاحظة.'}, error.status || (error.code ? 503 : 400));
  }
}

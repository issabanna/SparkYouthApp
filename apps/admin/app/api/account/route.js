import { randomUUID } from 'node:crypto';
import leaders from '../../../../../packages/shared/leaders';
import auth from '../../../lib/user-auth.cjs';
import service from '../../../lib/content-service.cjs';
import checker from '../../../lib/registration-image-check.cjs';
import { ownerHash, reply, unavailable } from '../../../lib/registration-service';
import { listRegistrations, getRegistration, mutateRegistration } from '../../../lib/registration-store';
import {readAccount} from '../../../lib/account-store';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request) {
  const owner = await ownerHash(request);
  if (!owner) return reply({
    error: 'جلسة الحساب مطلوبة.'
  }, 401);
  try {
    const account = await readAccount(owner);
    return reply({
      account
    });
  } catch {
    return unavailable();
  }
}
export async function POST(request) {
  const owner = await ownerHash(request);
  if (!owner || !service.sameOrigin(request)) return reply({
    error: 'جلسة الحساب مطلوبة.'
  }, 401);
  try {
    const text = await request.text();
    if (text.length > 750000) return reply({
      error: 'حجم الصورة كبير جدًا.'
    }, 413);
    const body = JSON.parse(text),
      details = leaders.validateAccountDetails(body.details);
    if (body.photo) checker.parseImage(body.photo);
    const account = await mutateRegistration(leaders.accountActivityId, owner, async () => {
      const existing = (await listRegistrations(owner)).find(r => r.activityId === leaders.accountActivityId);
      const current = existing ? (await getRegistration(existing.id)).record : null;
      return {
        ...current,
        id: current?.id || randomUUID(),
        activityId: leaders.accountActivityId,
        recordType: 'account',
        authUserId:(await auth.userForRequest(request)).id,
        status: 'AccountActive',
        details:{...current?.details,...details},
        photo: body.photo === undefined ? current?.photo || '' : body.photo,
        updatedAt: new Date().toISOString()
      };
    });
    const {
      auditLog,
      ...safe
    } = account;
    return reply({
      account: safe
    });
  } catch (e) {
    return e.code ? unavailable() : reply({
      error: e.message || 'تعذّر حفظ الحساب.'
    }, 400);
  }
}

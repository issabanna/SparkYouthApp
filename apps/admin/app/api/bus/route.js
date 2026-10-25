import { createHash } from 'node:crypto';
import shared from '../../../../../packages/shared';
import leaders from '../../../../../packages/shared/leaders';
import service from '../../../lib/content-service.cjs';
import { ownerHash, reply, registrationContent, unavailable } from '../../../lib/registration-service';
import { listRegistrations, getRegistration, mutateRegistration } from '../../../lib/registration-store';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
async function access(request, activity) {
  const owner = await ownerHash(request);
  if (!owner) return null;
  const records = await listRegistrations(owner),
    staff = records.find(r => r.activityId === leaders.accountActivityId);
  return staff?.busActivities?.includes(activity) ? {
    owner,
    staff
  } : null;
}
const summary = records => {
  const active = records.filter(r => !['Cancelled', 'Rejected'].includes(r.status));
  const boarded = active.filter(r => r.status === 'Confirmed' && r.busBoarding).length;
  return {
    registered: active.length,
    boarded,
    pending: active.length - boarded
  };
};
const camper = r => ({
  id: r.id,
  name: r.details.arabicFullName || r.details.englishFullName || [r.details.firstName, r.details.lastName].filter(Boolean).join(' '),
  status: r.status,
  statusLabel: shared.registrationStatusLabel(r),
  boarded: !!r.busBoarding,
  boardedAt: r.busBoarding?.at || null,
  canBoard: r.status === 'Confirmed' && !r.busBoarding
});
export async function GET(request) {
  try {
    const activity = new URL(request.url).searchParams.get('activity');
    if (!(await access(request, activity))) return reply({
      error: 'لا توجد صلاحية لإدارة حافلات هذا النشاط.'
    }, 403);
    return reply({
      totals: summary((await listRegistrations()).filter(r => r.activityId === activity))
    });
  } catch {
    return unavailable();
  }
}
export async function POST(request) {
  if (!service.sameOrigin(request)) return reply({
    error: 'طلب غير مسموح.'
  }, 403);
  try {
    const text = await request.text();
    if (text.length > 4000) return reply({
      error: 'رمز غير صحيح.'
    }, 400);
    const body = JSON.parse(text),
      staff = await access(request, body.activityId);
    if (!staff) return reply({
      error: 'لا توجد صلاحية لإدارة حافلات هذا النشاط.'
    }, 403);
    let row;
    if (body.action === 'scan') {
      let code;
      try {
        code = JSON.parse(body.code);
      } catch {}
      if (!code || !['spark-preview', 'spark-registration'].includes(code.type) || code.activity !== body.activityId || typeof code.registration !== 'string') throw Error('رمز QR غير صحيح أو تابع لنشاط آخر.');
      row = await getRegistration(code.registration);
    } else if (body.action === 'board' && typeof body.id === 'string') row = await getRegistration(body.id);else throw Error('إجراء غير صحيح.');
    if (!row || row.record.activityId !== body.activityId) throw Error('التسجيل غير موجود في هذا النشاط.');
    let record = row.record;
    if (body.action === 'board') record = await mutateRegistration(body.activityId, row.owner_hash, async () => {
      // Recheck assignment during the atomic registration mutation.
      if (!(await access(request, body.activityId))) throw Error('ألغيت صلاحية الحافلة.');
      const current = (await getRegistration(body.id)).record;
      if (current.status !== 'Confirmed') throw Error('يسمح بالصعود للتسجيلات المعتمدة فقط.');
      if (current.busBoarding) return current;
      const actor = {
        type: 'busAdmin',
        session: createHash('sha256').update(staff.owner).digest('hex').slice(0, 12)
      };
      return shared.appendRegistrationAction({
        ...current,
        busBoarding: {
          at: new Date().toISOString(),
          actor
        }
      }, {
        action: 'bus_boarded',
        actor,
        before: current
      });
    });
    return reply({
      camper: camper(record),
      totals: summary((await listRegistrations()).filter(r => r.activityId === body.activityId))
    });
  } catch (e) {
    return e.code ? unavailable() : reply({
      error: e.message || 'تعذّر التحقق من التسجيل.'
    }, 409);
  }
}

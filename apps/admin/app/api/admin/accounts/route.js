import leaders from '../../../../../../packages/shared/leaders';
import service from '../../../../lib/content-service.cjs';
import { reply, registrationContent, unavailable } from '../../../../lib/registration-service';
import { listRegistrations, getRegistration, mutateRegistration } from '../../../../lib/registration-store';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request) {
  if (!service.authenticated(request)) return reply({
    error: 'تسجيل دخول الإدارة مطلوب.'
  }, 401);
  try {
    return reply({
      accounts: (await listRegistrations()).filter(r => r.activityId === leaders.accountActivityId).map(r => ({
        id: r.id,
        name: [r.details.englishFirstName, r.details.englishFatherName, r.details.englishLastName].join(' '),
        busActivities: r.busActivities || []
      }))
    });
  } catch {
    return unavailable();
  }
}
export async function POST(request) {
  const actor = service.adminSessionActor(request);
  if (!actor || !service.sameOrigin(request)) return reply({
    error: 'تسجيل دخول الإدارة مطلوب.'
  }, 401);
  try {
    const body = await request.json(),
      row = await getRegistration(body.id),
      content = await registrationContent();
    if (row?.record.activityId !== leaders.accountActivityId) return reply({
      error: 'الحساب غير موجود.'
    }, 404);
    if (!Array.isArray(body.busActivities) || body.busActivities.length > 100 || body.busActivities.some(id => !content.activities.some(a => a.id === id))) throw Error('اختر أنشطة صحيحة.');
    const account = await mutateRegistration(leaders.accountActivityId, row.owner_hash, async () => {
      const current = (await getRegistration(body.id)).record;
      if (JSON.stringify(current.busActivities || []) !== body.expected) throw Error('تغيرت الصلاحيات. أعد تحميل الحساب.');
      return {
        ...current,
        busActivities: [...new Set(body.busActivities)],
        auditLog: [...(current.auditLog || []), {
          at: new Date().toISOString(),
          action: 'bus_permissions_updated',
          actor,
          before: current.busActivities || [],
          after: body.busActivities
        }]
      };
    });
    return reply({
      account: {
        id: account.id,
        busActivities: account.busActivities
      }
    });
  } catch (e) {
    return e.code ? unavailable() : reply({
      error: e.message
    }, 409);
  }
}

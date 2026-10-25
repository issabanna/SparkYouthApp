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
    const id = new URL(request.url).searchParams.get('id');
    if (id) {
      const row = await getRegistration(id);
      return row?.record.activityId === leaders.leaderActivityId ? reply({
        application: row.record
      }) : reply({
        error: 'الطلب غير موجود.'
      }, 404);
    }
    return reply({
      applications: (await listRegistrations()).filter(r => r.activityId === leaders.leaderActivityId).map(({
        photo,
        ...r
      }) => r)
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
      row = await getRegistration(body.id);
    if (row?.record.activityId !== leaders.leaderActivityId) return reply({
      error: 'الطلب غير موجود.'
    }, 404);
    const content = await registrationContent();
    const application = await mutateRegistration(leaders.leaderActivityId, row.owner_hash, async () => {
      const current = (await getRegistration(body.id)).record;
      if (body.expected !== JSON.stringify({
        status: current.status,
        assignments: current.assignments || [],
        busActivities: current.busActivities || []
      })) throw Error('تغيّر الطلب. أعد فتحه قبل الحفظ.');
      let changes;
      if (body.action === 'status' && ['LeaderApproved', 'LeaderRejected', 'LeaderPending'].includes(body.status)) changes = {
        status: body.status
      };else if (body.action === 'assign') {
        if (current.status !== 'LeaderApproved') throw Error('اعتمد المرشد أولًا.');
        if (!Array.isArray(body.assignments) || body.assignments.length > 100) throw Error('تكليفات غير صحيحة.');
        const ids = new Set();
        changes = {
          assignments: body.assignments.map(a => {
            if (!content.activities.some(e => e.id === a.activityId) || ids.has(a.activityId) || !Object.hasOwn(leaders.campRoles, a.roleId) || typeof a.teamGroup !== 'string' || !a.teamGroup.trim() || a.teamGroup.length > 100 || a.tentNumber != null && (!Number.isInteger(a.tentNumber) || a.tentNumber < 0 || a.tentNumber > 13)) throw Error('تحقق من الأنشطة والتكليفات.');
            ids.add(a.activityId);
            return {
              activityId: a.activityId,
              roleId: a.roleId,
              role: leaders.campRoles[a.roleId],
              teamGroup: a.teamGroup.trim(),
              tentNumber: a.roleId === 'leader' ? a.tentNumber ?? null : null
            };
          })
        };
      } else throw Error('إجراء غير صالح.');
      return {
        ...current,
        ...changes,
        auditLog: [...(current.auditLog || []), {
          at: new Date().toISOString(),
          action: 'leader_' + body.action,
          actor,
          before: {
            status: current.status,
            assignments: current.assignments,
            busActivities: current.busActivities
          },
          after: changes
        }]
      };
    });
    return reply({
      application
    });
  } catch (e) {
    return e.code ? unavailable() : reply({
      error: e.message || 'تعذّر الحفظ.'
    }, 409);
  }
}

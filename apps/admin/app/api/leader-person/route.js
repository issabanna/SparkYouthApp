import leaders from '../../../../../packages/shared/leaders';
import { reply, registrationContent, unavailable } from '../../../lib/registration-service';
import { leaderAccess, evaluationSubjects } from '../../../lib/leader-service';
import { listRegistrations, getRegistration } from '../../../lib/registration-store';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const normalizeId = v => String(v || '').replace(/[\s-]/g, '').toUpperCase();
export async function GET(request) {
  try {
    const p = new URL(request.url).searchParams,
      activity = p.get('activity'),
      section = p.get('section'),
      id = p.get('id'),
      access = await leaderAccess(request, activity);
    if (!access) return reply({
      error: 'لا توجد صلاحية لهذا النشاط.'
    }, 403);
    const subjects = await evaluationSubjects(access, activity, section);
    if (!subjects.some(s => s.id === id)) return reply({
      error: 'الشخص غير متاح ضمن تكليفك.'
    }, 403);
    const row = await getRegistration(id);
    if (!row) return reply({
      error: 'الشخص غير موجود.'
    }, 404);
    const subject = row.record,
      content = await registrationContent(),
      records = await listRegistrations(),
      nationalId = normalizeId(subject.details.nationalId);
    const account = (await listRegistrations(row.owner_hash)).find(r => r.activityId === leaders.accountActivityId && (section!=='campers'||nationalId&&normalizeId(r.details.nationalId)===nationalId));
    const visibleCampIds = new Set((access.record.assignments || []).map(a => a.activityId));
    const isCamper = section === 'campers',
      assigned = leaders.assignmentOf(subject, activity);
    const history = isCamper ? records.filter(r => visibleCampIds.has(r.activityId) && !r.activityId.startsWith('__') && (r.id === id || nationalId && normalizeId(r.details.nationalId) === nationalId) && !['Cancelled', 'Rejected'].includes(r.status)).map(r => ({
      id: r.id,
      title: content.activities.find(a => a.id === r.activityId)?.title || r.activityTitle,
      role: 'مخيم'
    })) : (subject.assignments || []).filter(a => visibleCampIds.has(a.activityId)).map(a => ({
      id: a.activityId,
      title: content.activities.find(e => e.id === a.activityId)?.title || 'نشاط سابق',
      role: a.role
    }));
    // Personal account photos only; identity document images are never portraits.
    const photo = isCamper ? account?.photo || '' : account?.photo || subject.photo || '';
    return reply({
      person: {
        id,
        name: subjects.find(s => s.id === id).name,
        role: isCamper ? 'مخيم' : assigned?.role || 'مرشد',
        phone: subject.details.phone || '',
        photo,
        history
      }
    });
  } catch (e) {
    return e.code ? unavailable() : reply({
      error: e.message || 'تعذّر تحميل معلومات الشخص.'
    }, 403);
  }
}

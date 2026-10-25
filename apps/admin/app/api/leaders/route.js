import { randomUUID } from 'node:crypto';
import leaders from '../../../../../packages/shared/leaders';
import service from '../../../lib/content-service.cjs';
import checker from '../../../lib/registration-image-check.cjs';
import { ownerHash, reply, registrationContent, unavailable } from '../../../lib/registration-service';
import { listRegistrations, getRegistration, mutateRegistration } from '../../../lib/registration-store';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
async function response(record, account) {
  const content = await registrationContent();
  const busActivities = (account?.busActivities || []).flatMap(id => {
    const a = content.activities.find(e => e.id === id);
    return a ? [{
      id: a.id,
      title: a.title
    }] : [];
  });
  if (!record) return {
    application: null,
    busActivities
  };
  const {
    auditLog,
    ...application
  } = record;
  const staff = (await listRegistrations()).filter(r => r.activityId === leaders.leaderActivityId && r.status === 'LeaderApproved');
  return {
    application,
    busActivities,
    portal: record.status === 'LeaderApproved' ? {
      links: leaders.safeLinks(content.leaderSettings?.generalLinks),
      activities: (record.assignments || []).flatMap(a => {
        const event = content.activities.find(e => e.id === a.activityId);
        return event ? [{
          id: event.id,
          title: event.title,
          image: event.image,
          date: event.date,
          location: event.location,
          role: a.role || '',
          roleId: a.roleId,
          tentNumber: a.tentNumber,
          evaluationSections: leaders.evaluationSections(a.roleId),
          team: staff.flatMap(r => {
            const assigned = leaders.assignmentOf(r, event.id);
            return assigned ? [{
              id: r.id,
              name: r.details.arabicFullName,
              role: assigned.role
            }] : [];
          }),
          links: leaders.safeLinks(event.leaderLinks),
          about: event.leaderAbout || '',
          teamImage: event.leaderTeamImage || ''
        }] : [];
      })
    } : null
  };
}
export async function GET(request) {
  const owner = await ownerHash(request);
  if (!owner) return reply({
    error: 'جلسة الحساب مطلوبة.'
  }, 401);
  try {
    const own = await listRegistrations(owner),
      summary = own.find(r => r.activityId === leaders.leaderActivityId);
    const row = summary ? await getRegistration(summary.id) : null;
    return reply(await response(row?.record, own.find(r => r.activityId === leaders.accountActivityId)));
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
      details = leaders.validateLeaderDetails(body.details);
    if (body.photo) checker.parseImage(body.photo);
    if (body.consent !== true) throw Error('الموافقة على إرسال البيانات مطلوبة.');
    const id = randomUUID();
    const savedAccount = (await listRegistrations(owner)).find(r => r.activityId === leaders.accountActivityId);
    if (!savedAccount) throw Error('أكمل بيانات حسابك أولًا.');
    const account = (await getRegistration(savedAccount.id)).record;
    const result = await mutateRegistration(leaders.leaderActivityId, owner, async records => {
      const own = (await listRegistrations(owner)).find(r => r.activityId === leaders.leaderActivityId);
      if (own && own.status !== 'LeaderRejected') throw Error('لديك طلب إرشاد بالفعل.');
      const previous = own ? (await getRegistration(own.id)).record : null;
      return {
        id: previous?.id || id,
        activityId: leaders.leaderActivityId,
        recordType: 'leader',
        status: 'LeaderPending',
        details: {
          ...account.details,
          ...details,
          arabicFullName: [account.details.englishFirstName, account.details.englishFatherName, account.details.englishLastName].join(' ')
        },
        photo: account.photo || '',
        assignments: previous?.assignments || [],
        busActivities: previous?.busActivities || [],
        createdAt: previous?.createdAt || new Date().toISOString(),
        auditLog: [...(previous?.auditLog || []), {
          at: new Date().toISOString(),
          action: 'leader_submitted',
          actor: {
            type: 'owner'
          }
        }]
      };
    });
    return reply(await response(result, account));
  } catch (e) {
    return e.code ? unavailable() : reply({
      error: e.message || 'تعذّر إرسال الطلب.'
    }, 400);
  }
}

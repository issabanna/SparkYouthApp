import { createHash } from 'node:crypto';
import leaders from '../../../../../packages/shared/leaders';
import service from '../../../lib/content-service.cjs';
import { reply, registrationContent, unavailable } from '../../../lib/registration-service';
import { leaderAccess, evaluationSubjects } from '../../../lib/leader-service';
import { listRegistrations, getRegistration, mutateRegistration } from '../../../lib/registration-store';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request) {
  try {
    const p = new URL(request.url).searchParams,
      activity = p.get('activity'),
      section = p.get('section'),
      access = await leaderAccess(request, activity);
    if (!access) return reply({
      error: 'لا توجد صلاحية لهذا النشاط.'
    }, 403);
    const content = await registrationContent(),
      year = leaders.evaluationYear(content.activities.find(a => a.id === activity));
    const subjects = await evaluationSubjects(access, activity, section),
      own = (await listRegistrations(access.owner)).filter(r => r.activityId === '__evaluations__:' + activity && r.section === section && r.campYear === year);
    return reply({
      subjects: subjects.map(s => ({
        ...s,
        evaluation: own.find(e => e.subjectId === s.id) ? {
          answers: own.find(e => e.subjectId === s.id).answers,
          notes: own.find(e => e.subjectId === s.id).details.notes,
          updatedAt: own.find(e => e.subjectId === s.id).updatedAt
        } : null
      }))
    });
  } catch (e) {
    return e.code ? unavailable() : reply({
      error: e.message
    }, 403);
  }
}
export async function POST(request) {
  if (!service.sameOrigin(request)) return reply({
    error: 'طلب غير مسموح.'
  }, 403);
  try {
    const text = await request.text();
    if (text.length > 8000) return reply({
      error: 'الملاحظات طويلة جدًا.'
    }, 413);
    const body = JSON.parse(text),
      access = await leaderAccess(request, body.activityId);
    if (!access) return reply({
      error: 'لا توجد صلاحية لهذا النشاط.'
    }, 403);
    const questions = leaders.evaluationQuestions[body.section];
    if (!questions?.length) throw Error('لم تعتمد أسئلة هذا التقييم بعد.');
    if (!body.answers || typeof body.answers !== 'object' || Array.isArray(body.answers) || Object.keys(body.answers).length !== questions.length + (body.section === 'campers' && body.answers.churchInvitation === 'نعم' ? 1 : 0) || questions.some(q => !leaders.choicesForQuestion(q).includes(body.answers[q[0]])) || typeof body.notes !== 'string' || body.notes.length > 2000) throw Error('أكمل جميع أسئلة التقييم. الملاحظات بحد أقصى 2000 حرف.');
    if (body.section === 'campers' && body.answers.churchInvitation === 'نعم' && (typeof body.answers.churchName !== 'string' || !body.answers.churchName.trim() || body.answers.churchName.length > 200)) throw Error('أدخل اسم الكنيسة التي دعوت المخيم إليها.');
    const content = await registrationContent(),
      event = content.activities.find(a => a.id === body.activityId);
    if (!event) throw Error('النشاط غير موجود.');
    const id = createHash('sha256').update([access.owner, body.activityId, leaders.evaluationYear(event), body.section, body.subjectId].join(':')).digest('hex'),
      activity = '__evaluations__:' + body.activityId;
    const updated = await mutateRegistration(activity, access.owner, async () => {
      const currentAccess = await leaderAccess(request, body.activityId);
      if (!currentAccess) throw Error('ألغيت صلاحية النشاط.');
      const subjects = await evaluationSubjects(currentAccess, body.activityId, body.section);
      if (!subjects.some(s => s.id === body.subjectId)) throw Error('هذا الشخص غير موجود ضمن صلاحياتك.');
      const subject = (await getRegistration(body.subjectId))?.record;
      if (!subject) throw Error('الشخص غير موجود.');
      const nationalId = String(subject.details.nationalId || '').replace(/[\s-]/g, '').toUpperCase();
      const evaluatedYear = Number(new Intl.DateTimeFormat('en', {
        year: 'numeric',
        timeZone: 'Asia/Amman'
      }).format(new Date()));
      const old = (await getRegistration(id))?.record;
      if ((old?.updatedAt || null) !== (body.expected || null)) throw Error('تغيّر التقييم. أعد تحميله قبل الحفظ.');
      return {
        id,
        activityId: activity,
        recordType: 'evaluation',
        schemaVersion: 1,
        campId: event.id,
        campTitle: event.title,
        campYear: leaders.evaluationYear(event),
        evaluatedYear,
        evaluatorId: access.record.id,
        evaluatorName: access.record.details.arabicFullName,
        evaluatorRole: currentAccess.assignment.roleId,
        subjectSnapshot: {
          name: subject.details.arabicFullName || subject.details.englishFullName || [subject.details.firstName, subject.details.lastName].filter(Boolean).join(' '),
          nationalId,
          identityKey: nationalId ? createHash('sha256').update(nationalId).digest('hex') : null
        },
        questionsSnapshot: questions,
        choicesSnapshot: leaders.evaluationChoices,
        status: 'EvaluationSaved',
        section: body.section,
        subjectId: body.subjectId,
        answers: body.answers,
        details: {
          notes: body.notes.trim()
        },
        updatedAt: new Date().toISOString(),
        auditLog: [...(old?.auditLog || []), {
          at: new Date().toISOString(),
          action: 'evaluation_saved',
          actor: {
            type: 'leader',
            id: access.record.id
          },
          before: old ? {
            answers: old.answers,
            notes: old.details.notes
          } : null,
          after: {
            answers: body.answers,
            notes: body.notes.trim()
          }
        }]
      };
    });
    return reply({
      evaluation: {
        answers: updated.answers,
        notes: updated.details.notes,
        updatedAt: updated.updatedAt
      }
    });
  } catch (e) {
    return e.code ? unavailable() : reply({
      error: e.message || 'تعذّر حفظ التقييم.'
    }, 409);
  }
}

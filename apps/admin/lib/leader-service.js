import leaders from '../../../packages/shared/leaders';
import { ownerHash } from './registration-service';
import { listRegistrations, getRegistration } from './registration-store';
export async function leaderAccess(request, activityId) {
  const owner = await ownerHash(request);
  if (!owner) return null;
  const own = (await listRegistrations(owner)).find(r => r.activityId === leaders.leaderActivityId);
  const assignment = leaders.assignmentOf(own, activityId);
  return assignment ? {
    owner,
    record: own,
    assignment
  } : null;
}
export async function evaluationSubjects(access, activityId, section) {
  if (!leaders.evaluationSections(access.assignment.roleId).includes(section)) throw Error('لا تملك صلاحية هذا التقييم.');
  const records = await listRegistrations();
  if (section === 'campers') {
    if (access.assignment.roleId !== 'manager' && !Number.isInteger(access.assignment.tentNumber)) return [];
    return records.filter(r => r.activityId === activityId && ['Pending', 'Confirmed'].includes(r.status) && (access.assignment.roleId === 'manager' || Number(r.details.tentNumber) === access.assignment.tentNumber && r.details.tentNumber != null)).map(r => ({
      id: r.id,
      name: r.details.arabicFullName || r.details.englishFullName || [r.details.firstName, r.details.lastName].filter(Boolean).join(' '),
      tentNumber: r.details.tentNumber
    }));
  }
  return records.filter(r => r.activityId === leaders.leaderActivityId).flatMap(r => {
    const a = leaders.assignmentOf(r, activityId);
    if (!a || r.id === access.record.id || a.roleId !== (section === 'support' ? 'supportTeam' : 'leader') || access.assignment.roleId !== 'manager' && a.teamGroup !== access.assignment.teamGroup) return [];
    return [{
      id: r.id,
      name: r.details.arabicFullName,
      role: a.role
    }];
  });
}

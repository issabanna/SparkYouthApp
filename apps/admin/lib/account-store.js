import leaders from '../../../packages/shared/leaders';
import {listRegistrations, getRegistration} from './registration-store';
export async function readAccount(owner) {
  const summary = (await listRegistrations(owner)).find(r => r.activityId === leaders.accountActivityId);
  const account = summary ? (await getRegistration(summary.id)).record : null;
  if (account) delete account.auditLog;
  return account;
}

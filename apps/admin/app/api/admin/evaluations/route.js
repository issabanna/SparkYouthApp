import service from '../../../../lib/content-service.cjs';
import { reply, unavailable } from '../../../../lib/registration-service';
import { listRegistrations } from '../../../../lib/registration-store';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request) {
  if (!service.authenticated(request)) return reply({
    error: 'تسجيل دخول الإدارة مطلوب.'
  }, 401);
  try {
    const params = new URL(request.url).searchParams,
      id = (params.get('nationalId') || '').replace(/[\s-]/g, '').toUpperCase(),
      year = params.get('year'),
      camp = params.get('camp'),
      section = params.get('section'),
      all = (await listRegistrations()).filter(r => r.recordType === 'evaluation');
    const records = all.filter(r => (!id || r.subjectSnapshot?.nationalId === id) && (!year || String(r.campYear) === year) && (!camp || r.campId === camp) && (!section || r.section === section));
    const page = Math.max(1, Math.min(Number(params.get('page')) || 1, Math.max(1, Math.ceil(records.length / 25))));
    return reply({
      total: records.length,
      page,
      pageSize: 25,
      unlinked: records.filter(r => !r.subjectSnapshot?.identityKey).length,
      years: [...new Set(all.map(r => r.campYear).filter(Boolean))].sort((a, b) => b - a),
      records: records.slice((page - 1) * 25, page * 25).map(({
        auditLog,
        ...r
      }) => r)
    });
  } catch {
    return unavailable();
  }
}

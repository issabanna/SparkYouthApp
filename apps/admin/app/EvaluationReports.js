'use client';

import { useState, useEffect } from 'react';
const labels = {
  support: 'فريق الدعم',
  team: 'المرشدون',
  campers: 'المخيمون'
};
export default function EvaluationReports({
  activities,
  cloud
}) {
  const [filters, setFilters] = useState({
      nationalId: '',
      year: '',
      camp: '',
      section: '',
      page: 1
    }),
    [data, setData] = useState(null),
    [error, setError] = useState('');
  useEffect(() => {
    if (cloud !== 'remote') return;
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const response = await fetch('/api/admin/evaluations?' + new URLSearchParams(filters), {
            cache: 'no-store'
          }),
          r = await response.json();
        if (!response.ok) throw Error(r.error);
        if (active) {
          setData(r);
          setError('');
        }
      } catch (e) {
        if (active) setError(e.message);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [filters, cloud]);
  const change = (key, value) => setFilters(f => ({
    ...f,
    [key]: value,
    page: 1
  }));
  return <section className="panel"><h2>تقارير التقييمات</h2><p>عرض سجل الشخص بالرقم الوطني عبر السنوات والمخيمات. التقييمات دون رقم هوية لا تربط تلقائيًا بالأسماء. الهوية المسجلة يقدّمها المستخدم ولم يتم التحقق منها رسميًا.</p>{cloud !== 'remote' ? <p>سجّل دخول الإدارة لعرض التقييمات.</p> : <><div className="registrationTools"><label>الرقم الوطني / الهوية<input value={filters.nationalId} onChange={e => change('nationalId', e.target.value)} placeholder="كل الأشخاص" /></label><label>السنة<select value={filters.year} onChange={e => change('year', e.target.value)}><option value="">كل السنوات</option>{data?.years.map(y => <option key={y} value={y}>{y}</option>)}</select></label><label>المخيم<select value={filters.camp} onChange={e => change('camp', e.target.value)}><option value="">كل الأنشطة</option>{activities.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}</select></label><label>الفئة<select value={filters.section} onChange={e => change('section', e.target.value)}><option value="">كل الفئات</option>{Object.entries(labels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label></div>{error && <p role="alert">{error}</p>}{data && <><p>{data.total} تقييم · {data.unlinked} دون ربط بالهوية</p>{data.records.map(r => <details key={r.id} className="panel"><summary>{r.subjectSnapshot?.name || 'اسم غير متوفر'} · {r.campTitle} · {r.campYear} · {labels[r.section]}</summary><p>الرقم الوطني: {r.subjectSnapshot?.nationalId || 'غير متوفر — غير مرتبط'}</p><p>المقيّم: {r.evaluatorName} · {r.evaluatorRole} · {new Date(r.updatedAt).toLocaleString('ar-JO', {
              timeZone: 'Asia/Amman'
            })}</p><dl>{(r.questionsSnapshot || []).map(([id, label]) => <div key={id}><dt>{label}</dt><dd>{r.answers?.[id] || '—'}</dd></div>)}</dl>{r.answers?.churchName && <p>الكنيسة: {r.answers.churchName}</p>}<p>الملاحظات: {r.details.notes || '—'}</p></details>)}{!data.records.length && <p>لا توجد تقييمات مطابقة.</p>}<div className="actions"><button disabled={data.page === 1} onClick={() => setFilters(f => ({
            ...f,
            page: data.page - 1
          }))}>السابق</button><span>{data.page}</span><button disabled={data.page * data.pageSize >= data.total} onClick={() => setFilters(f => ({
            ...f,
            page: data.page + 1
          }))}>التالي</button></div></>}</>}</section>;
}

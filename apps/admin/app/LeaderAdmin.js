'use client';

import { useEffect, useState, useRef } from 'react';
const {
  leaderFields,
  accountFields,
  campRoles
} = require('../../../packages/shared/leaders');
const labels = {
  LeaderPending: 'بانتظار الموافقة',
  LeaderApproved: 'مرشد معتمد',
  LeaderRejected: 'مرفوض'
};
export function LinkEditor({
  value = [],
  onChange,
  title
}) {
  return <fieldset><legend>{title}</legend>{value.map((link, i) => <div key={i} style={{
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap'
    }}><label>اسم الرابط<input value={link.title} onChange={e => onChange(value.map((l, n) => n === i ? {
          ...l,
          title: e.target.value
        } : l))} /></label><label>الرابط (HTTPS)<input type="url" dir="ltr" value={link.url} onChange={e => onChange(value.map((l, n) => n === i ? {
          ...l,
          url: e.target.value
        } : l))} /></label><button type="button" onClick={() => onChange(value.filter((_, n) => n !== i))}>حذف الرابط</button></div>)}<button type="button" onClick={() => onChange([...value, {
      title: '',
      url: ''
    }])}>إضافة رابط</button></fieldset>;
}
export default function LeaderAdmin({
  activities,
  cloud
}) {
  const [rows, setRows] = useState([]),
    [selected, setSelected] = useState(null),
    [assignments, setAssignments] = useState([]),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false),
    [query, setQuery] = useState(''),[selectedId,setSelectedId]=useState(null),[opening,setOpening]=useState(false);
  const dialog=useRef(null),detailRequest=useRef(0),detailController=useRef(null);
  useEffect(()=>{if(selectedId&&dialog.current&&!dialog.current.open)dialog.current.showModal();},[selectedId]);
  useEffect(()=>()=>detailController.current?.abort(),[]);
  const close=()=>{if(busy)return;detailRequest.current++;detailController.current?.abort();setSelectedId(null);setSelected(null);setOpening(false);setMessage('');};
  const load = async () => {
    try {
      const response = await fetch('/api/admin/leaders', {
          cache: 'no-store'
        }),
        r = await response.json();
      if (!response.ok) throw Error(r.error);
      setRows(r.applications);
    } catch (e) {
      setMessage(e.message);
    }
  };
  useEffect(() => {
    if (cloud === 'remote') load();
  }, [cloud]);
  const open = async id => {
    const request=++detailRequest.current;detailController.current?.abort();const controller=new AbortController();detailController.current=controller;
    setSelectedId(id);setSelected(null);setOpening(true);setMessage('');
    const timeout=setTimeout(()=>controller.abort(),15000);
    try {
      const response=await fetch('/api/admin/leaders?id='+encodeURIComponent(id),{cache:'no-store',signal:controller.signal}),r=await response.json();
      if(!response.ok||!r.application)throw Error(r.error||'تعذّر فتح تفاصيل المرشد.');
      if(request===detailRequest.current){setSelected(r.application);setAssignments(r.application.assignments||[]);}
    }catch(error){if(request===detailRequest.current)setMessage(error.name==='AbortError'?'استغرق فتح الطلب وقتًا طويلًا. أعد المحاولة.':error.message);}
    finally{clearTimeout(timeout);if(request===detailRequest.current)setOpening(false);}
  };
  const save = async body => {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/leaders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...body,
            id: selected.id,
            expected: JSON.stringify({
              status: selected.status,
              assignments: selected.assignments || [],
              busActivities: selected.busActivities || []
            })
          })
        }),
        r = await response.json();
      if (!response.ok) throw Error(r.error);
      setSelected(r.application);
      setAssignments(r.application.assignments || []);
      await load();
      setMessage('تم الحفظ.');
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  };
  return <section className="panel"><h2>طلبات المرشدين وتكليف الأنشطة</h2>{cloud !== 'remote' ? <p>سجّل دخول الإدارة للاتصال بالطلبات المشتركة.</p> : <><label>بحث باسم المرشد<input value={query} onChange={e => setQuery(e.target.value)} /></label><button disabled={busy} onClick={load}>تحديث</button>{message && !selectedId && <p role="status">{message}</p>}<table className="registrationTable"><thead><tr><th>الاسم</th><th>الحالة</th></tr></thead><tbody>{rows.filter(r => r.details.arabicFullName.includes(query)).map(r => <tr key={r.id} data-testid={"leader-row-"+r.id} onClick={()=>{if(!busy)open(r.id)}}><td><button type="button" disabled={busy} onClick={event=>{event.stopPropagation();open(r.id)}}>{r.details.arabicFullName}</button></td><td>{labels[r.status]}</td></tr>)}</tbody></table>{!rows.length && <p>لا توجد طلبات إرشاد بعد.</p>}{selectedId&&<dialog ref={dialog} className="registrationDialog" aria-labelledby="leader-detail-title" onCancel={event=>{event.preventDefault();close()}}><div className="registrationDialogHeader"><h2 id="leader-detail-title">تفاصيل طلب المرشد</h2><button type="button" disabled={busy} onClick={close}>إغلاق تفاصيل المرشد</button></div>{opening&&<p role="status">جارٍ فتح تفاصيل المرشد…</p>}{message&&<p role="status">{message}</p>}{!opening&&!selected&&<button type="button" onClick={()=>open(selectedId)}>إعادة فتح الطلب</button>}{selected&&<section className="panel editor"><h3>{selected.details.arabicFullName}</h3><p>{labels[selected.status]}</p><dl>{[...accountFields, ...leaderFields, ['dob', 'تاريخ الميلاد'], ['gender', 'الجنس']].map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{key === 'gender' ? selected.details[key] === 'male' ? 'ذكر' : 'أنثى' : selected.details[key] || '—'}</dd></div>)}</dl>{selected.photo && <img src={selected.photo} alt="صورة مقدم طلب الإرشاد" style={{
          width: 160,
          height: 160,
          objectFit: 'cover',
          borderRadius: 16
        }} />}<div className="actions"><button disabled={busy || selected.status === 'LeaderApproved'} onClick={() => save({
            action: 'status',
            status: 'LeaderApproved'
          })}>اعتماد المرشد</button><button disabled={busy || selected.status === 'LeaderRejected'} onClick={() => save({
            action: 'status',
            status: 'LeaderRejected'
          })}>رفض طلب الإرشاد</button><button disabled={busy || selected.status === 'LeaderPending'} onClick={() => save({
            action: 'status',
            status: 'LeaderPending'
          })}>إعادة إلى انتظار الموافقة</button></div>{selected.status === 'LeaderApproved' && <fieldset><legend>تكليف الأنشطة — يحددها المسؤول فقط</legend>{activities.map(a => {
            const assignment = assignments.find(x => x.activityId === a.id);
            return <div key={a.id}><label className="checkbox"><input type="checkbox" checked={!!assignment} onChange={e => setAssignments(e.target.checked ? [...assignments, {
                  activityId: a.id,
                  roleId: 'leader',
                  role: 'Leader',
                  teamGroup: 'main',
                  tentNumber: null
                }] : assignments.filter(x => x.activityId !== a.id))} />{a.title}</label>{assignment && <fieldset><label>الدور في النشاط<select value={assignment.roleId || 'leader'} onChange={e => setAssignments(assignments.map(x => x.activityId === a.id ? {
                    ...x,
                    roleId: e.target.value
                  } : x))}>{Object.entries(campRoles).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><label>مجموعة الفريق (نفس القيمة لرئيس الفريق وأعضائه)<input maxLength={100} value={assignment.teamGroup || 'main'} onChange={e => setAssignments(assignments.map(x => x.activityId === a.id ? {
                    ...x,
                    teamGroup: e.target.value
                  } : x))} /></label>{assignment.roleId === 'leader' && <label>الخيمة المكلف بها المرشد<select value={assignment.tentNumber ?? ''} onChange={e => setAssignments(assignments.map(x => x.activityId === a.id ? {
                    ...x,
                    tentNumber: e.target.value === '' ? null : Number(e.target.value)
                  } : x))}><option value="">دون تكليف خيمة</option>{Array.from({
                      length: 14
                    }, (_, i) => <option key={i} value={i}>الخيمة {i}</option>)}</select></label>}</fieldset>}</div>;
          })}<button disabled={busy} onClick={() => save({
            action: 'assign',
            assignments
          })}>حفظ تكليفات المرشد</button></fieldset>}<details><summary>سجل الإجراءات</summary>{(selected.auditLog || []).slice().reverse().map((a, i) => <p key={i}>{new Date(a.at).toLocaleString('ar-JO', {
              timeZone: 'Asia/Amman'
            })} · {a.action} · {a.actor?.session || 'مقدم الطلب'}</p>)}</details></section>}</dialog>}</>}</section>;
}

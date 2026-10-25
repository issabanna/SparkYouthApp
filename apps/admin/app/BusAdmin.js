'use client';

import { useState, useEffect } from 'react';
export default function BusAdmin({
  cloud,
  activities
}) {
  const [accounts, setAccounts] = useState([]),
    [selected, setSelected] = useState(null),
    [assigned, setAssigned] = useState([]),
    [query, setQuery] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  const load = async () => {
    try {
      const response = await fetch('/api/admin/accounts', {
          cache: 'no-store'
        }),
        r = await response.json();
      if (!response.ok) throw Error(r.error);
      setAccounts(r.accounts);
    } catch (e) {
      setMessage(e.message);
    }
  };
  useEffect(() => {
    if (cloud === 'remote') load();
  }, [cloud]);
  return <section className="panel"><h2>مسؤولو الحافلات</h2><p>امنح أي حساب صلاحية الحافلة لأنشطة محددة. لا يلزم أن يكون مرشدًا.</p>{cloud !== 'remote' ? <p>سجّل دخول الإدارة للاتصال بالحسابات.</p> : <><label>بحث باسم المستخدم<input value={query} onChange={e => setQuery(e.target.value)} /></label><button disabled={busy} onClick={load}>تحديث الحسابات</button>{message && <p role="status">{message}</p>}<table className="registrationTable"><thead><tr><th>الاسم</th><th>الأنشطة المكلف بها</th></tr></thead><tbody>{accounts.filter(a => a.name.toLowerCase().includes(query.toLowerCase())).map(a => <tr key={a.id}><td><button disabled={busy} onClick={() => {
                setSelected(a);
                setAssigned(a.busActivities);
                setMessage('');
              }}>{a.name}</button></td><td>{a.busActivities.length}</td></tr>)}</tbody></table>{selected && <fieldset><legend>{selected.name}</legend>{activities.map(a => <label key={a.id} className="checkbox"><input type="checkbox" checked={assigned.includes(a.id)} onChange={e => setAssigned(e.target.checked ? [...assigned, a.id] : assigned.filter(id => id !== a.id))} />{a.title}</label>)}<button disabled={busy} onClick={async () => {
          setBusy(true);
          setMessage('');
          try {
            const response = await fetch('/api/admin/accounts', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  id: selected.id,
                  busActivities: assigned,
                  expected: JSON.stringify(selected.busActivities)
                })
              }),
              r = await response.json();
            if (!response.ok) throw Error(r.error);
            setSelected({
              ...selected,
              ...r.account
            });
            await load();
            setMessage('تم حفظ صلاحيات الحافلة.');
          } catch (e) {
            setMessage(e.message);
          } finally {
            setBusy(false);
          }
        }}>حفظ صلاحيات الحافلة</button><button disabled={busy} onClick={() => setSelected(null)}>إغلاق</button></fieldset>}</>}</section>;
}

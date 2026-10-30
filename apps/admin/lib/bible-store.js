import {createClient} from '@supabase/supabase-js';
import {randomUUID} from 'node:crypto';
import {mutateRegistration} from './registration-store';
import bible from '../../../packages/shared/bible';
const client = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {auth: {persistSession: false, autoRefreshToken: false}});
const activity = owner => '__bible__:' + owner;
export async function readLibrary(owner) {
  const {data, error} = await client().from('spark_registrations').select('record').eq('activity_id', activity(owner)).eq('owner_hash', owner).maybeSingle();
  if (error) throw error;
  return data?.record || null;
}
export function privateLibrary(record) {
  return {revision: record?.revision || 0, notes: (record?.notes || []).filter(n => !n.deleted),
    highlights: record?.highlights || [], progress: record?.progress || bible.defaultReference, fontSize: record?.fontSize || 21};
}
export async function publicChapterNotes(ref, ownId) {
  const {data, error} = await client().from('spark_registrations').select('record')
    .contains('record', {recordType: 'bibleLibrary', notes: [{book: ref.book, chapter: ref.chapter, visibility: 'shared'}]})
    .order('updated_at', {ascending: false}).limit(100);
  if (error) throw error;
  // Only the explicit public-note projection leaves the server, never libraries,
  // owner hashes, account IDs, progress or neighboring private notes.
  return bible.sharedNotes((data || []).map(row => row.record), ref, ownId);
}
export async function updateLibrary(owner, body, author) {
  return mutateRegistration(activity(owner), owner, records => {
    const current = records[0] || {id: randomUUID(), activityId: activity(owner), recordType: 'bibleLibrary',
      status: 'BibleLibrary', details: {}, revision: 0, notes: [], progress: bible.defaultReference, fontSize: 21};
    if (body.action === 'progress') {
      return {...current, progress: bible.reference(body.reference), fontSize: [18,21,24,27,30].includes(body.fontSize) ? body.fontSize : current.fontSize,
        updatedAt: new Date().toISOString()};
    }
    if (!Number.isInteger(body.revision) || body.revision !== current.revision) {
      const error = Error('تغيّرت ملاحظاتك على جهاز آخر. حدّث القائمة ثم حاول مجددًا.'); error.status = 409; throw error;
    }
    if (body.action === 'highlight') {
      const ref = bible.reference(body.reference, true);
      if (body.remove !== undefined && typeof body.remove !== 'boolean') throw Error('اختر إجراء تظليل صحيحًا.');
      const key = bible.verseKey(ref), currentHighlights = current.highlights || [];
      const remaining = currentHighlights.filter(h => bible.verseKey(h) !== key);
      if (!body.remove && remaining.length >= 1000) throw Error('يمكن حفظ 1000 آية مظللة. أزل تظليلًا قديمًا لإضافة المزيد.');
      const highlights = body.remove ? remaining : [...remaining, {...ref, updatedAt: new Date().toISOString()}];
      return {...current, highlights, revision: current.revision + 1, updatedAt: new Date().toISOString()};
    }
    const existing = body.id && current.notes.find(n => n.id === body.id);
    if (body.id && !existing) {const error = Error('الملاحظة غير موجودة.'); error.status = 404; throw error;}
    let notes;
    if (body.action === 'delete') {
      if (!existing) throw Error('اختر الملاحظة المراد حذفها.');
      notes = current.notes.filter(n => n.id !== body.id);
    } else if (body.action === 'save') {
      const input = bible.noteInput(body.note);
      if (!existing && current.notes.length >= 300) throw Error('يمكن حفظ 300 ملاحظة. احذف ملاحظة قديمة لإضافة المزيد.');
      const now = new Date().toISOString();
      const note = {...input, id: existing?.id || randomUUID(), author,
        createdAt: existing?.createdAt || now, updatedAt: now};
      notes = [note, ...current.notes.filter(n => n.id !== note.id)];
    } else throw Error('الإجراء غير متاح.');
    if (Buffer.byteLength(JSON.stringify(notes), 'utf8') > 1500000) throw Error('مساحة الملاحظات ممتلئة. احذف ملاحظة قديمة قبل الحفظ.');
    return {...current, notes, revision: current.revision + 1, updatedAt: new Date().toISOString()};
  });
}

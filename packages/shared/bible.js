const catalog = require('./bible-catalog.json');
const translations = catalog.translations;
const defaultReference = {translation: 'ar-svd', book: 43, chapter: 1};
function reference(value, verseRequired = false) {
  const translation = translations.find(t => t.id === value?.translation);
  const book = catalog.books.find(b => b.id === value?.book);
  const chapter = value?.chapter, verse = value?.verse;
  const counts = book?.verses[translation?.id];
  if (!translation || !book || !Number.isInteger(chapter) || chapter < 1 || chapter > counts.length ||
      (verseRequired && (!Number.isInteger(verse) || verse < 1 || verse > counts[chapter - 1]))) {
    throw Error('اختر سفرًا وإصحاحًا وآية صحيحة.');
  }
  return {translation: translation.id, book: book.id, chapter, ...(verseRequired ? {verse} : {})};
}
function noteInput(value) {
  const ref = reference(value, true);
  const text = typeof value.text === 'string' ? value.text.trim() : '';
  if (!text || text.length > 3000) throw Error('اكتب ملاحظة من 1 إلى 3000 حرف.');
  if (value.visibility !== undefined && !['private', 'shared'].includes(value.visibility)) throw Error('اختر خصوصية الملاحظة.');
  return {...ref, text, visibility: value.visibility || 'private'};
}
function verseKey(ref) {return [ref.translation,ref.book,ref.chapter,ref.verse].join(':');}
function label(ref) {
  const book = catalog.books.find(b => b.id === ref.book);
  return `${book?.ar || ''} ${ref.chapter}${ref.verse ? ':' + ref.verse : ''}`;
}
function sharedNotes(records, ref, ownId) {
  return records.flatMap(record => (record.notes || []).filter(n => n.visibility === 'shared' &&
    n.book === ref.book && n.chapter === ref.chapter).map(n => ({
      id: n.id, translation: n.translation, book: n.book, chapter: n.chapter, verse: n.verse,
      text: n.text, author: n.author || 'مستخدم سبارك', updatedAt: n.updatedAt,
      mine: record.id === ownId
    }))).sort((a,b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 50);
}
module.exports = {catalog, translations, defaultReference, reference, noteInput, verseKey, label, sharedNotes};

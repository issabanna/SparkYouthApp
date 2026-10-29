const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const bible = require('../packages/shared/bible');
assert.equal(bible.catalog.books.length, 66);
for (const translation of bible.translations) {
  let count = 0, empty = [];
  for (const book of bible.catalog.books) {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../apps/admin/public/bible', translation.id, book.id + '.json')));
    assert.equal(Object.keys(data).length, book.verses[translation.id].length);
    for (const [chapter, verses] of Object.entries(data)) {
      const expected = book.verses[translation.id][Number(chapter) - 1];
      assert.equal(Object.keys(verses).length, expected);
      for (let verse = 1; verse <= expected; verse++) {
        assert.equal(typeof verses[verse], 'string'); if (!verses[verse].trim()) empty.push(`${book.id}:${chapter}:${verse}`);
        bible.reference({translation: translation.id, book: book.id, chapter: Number(chapter), verse}, true);
        count++;
      }
    }
  }
  assert.equal(count, 31102);
  assert.deepEqual(empty.sort(), translation.id === 'en-asv' ? ['40:17:21','40:18:11','40:23:14','41:7:16','41:9:44','41:9:46','41:11:26','41:15:28','42:17:36','42:23:17','43:5:4','44:8:37','44:15:34','44:24:7','44:28:29','45:16:24'].sort() : []);
}
assert.equal(bible.noteInput({translation:'ar-svd',book:43,chapter:3,verse:16,text:'  private  '}).visibility, 'private');
for (const value of [{translation:'../../secret',book:1,chapter:1}, {translation:'ar-svd',book:67,chapter:1}, {translation:'ar-svd',book:43,chapter:3,verse:999}]) assert.throws(() => bible.reference(value,true));
assert.throws(() => bible.noteInput({translation:'ar-svd',book:43,chapter:3,verse:16,text:'x'.repeat(3001)}));
const records=[{id:'owner',ownerHash:'secret',progress:{book:1},notes:[{id:'private',book:43,chapter:3,verse:16,visibility:'private',text:'secret'}, {id:'public',book:43,chapter:3,verse:16,translation:'ar-svd',visibility:'shared',text:'shared',author:'Spark',updatedAt:'2026-01-01'}]}];
const feed=bible.sharedNotes(records,{book:43,chapter:3},'owner');
assert.equal(feed.length,1); assert.equal(feed[0].id,'public'); assert.equal(feed[0].mine,true);
assert.ok(!JSON.stringify(feed).includes('secret')); assert.equal(feed[0].visibility,undefined);
assert.deepEqual(bible.sharedNotes(records,{book:43,chapter:4},'other'),[]);
console.log('PASS both complete Bible corpora, verse bounds, private default and shared-note projection');

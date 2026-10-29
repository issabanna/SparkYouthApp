import React, {useEffect, useRef, useState} from 'react';
import {View, Text, Pressable, TextInput, Switch, StyleSheet, ActivityIndicator, Linking} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {Picker} from './Picker';
import {apiRequest, authenticatedRequest} from './auth-client';
const bible = require('../../packages/shared/bible');
const write = body => authenticatedRequest('/api/bible', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
function Action({children, onPress, disabled, secondary}) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[s.button, secondary && s.secondary, disabled && {opacity: .45}]}><Text style={s.buttonText}>{children}</Text></Pressable>;
}
export default function BibleReader({onBack}) {
  const [ref, setRef] = useState(bible.defaultReference), [library, setLibrary] = useState(null),
    [chapter, setChapter] = useState(null), [chapterLoading, setChapterLoading] = useState(false),
    [error, setError] = useState(''), [chapterError, setChapterError] = useState(''), [notice, setNotice] = useState(''),
    [fontSize, setFontSize] = useState(21), [view, setView] = useState('read'), [draft, setDraft] = useState(null),
    [busy, setBusy] = useState(false), [shared, setShared] = useState(null), [feedError, setFeedError] = useState(''),
    [reload, setReload] = useState(0), [feedReload, setFeedReload] = useState(0);
  const requestId = useRef(0), feedId = useRef(0), alive = useRef(true), cache = useRef(new Map());
  const translation = bible.translations.find(t => t.id === ref.translation), book = bible.catalog.books[ref.book - 1];
  const rtl = translation.direction === 'rtl';
  useEffect(() => {alive.current = true; return () => {alive.current = false;};}, []);
  async function loadLibrary(restore = false) {
    try {
      const data = await authenticatedRequest('/api/bible');
      if (!alive.current) return;
      setLibrary(data); setError('');
      if (restore) {setRef(bible.reference(data.progress)); setFontSize(data.fontSize);}
    } catch (e) {if (alive.current) setError(e.message);}
  }
  useEffect(() => {loadLibrary(true);}, []);
  useEffect(() => {
    const id = ++requestId.current, key = ref.translation + '/' + ref.book;
    setChapterLoading(true); setChapterError(''); setChapter(null);
    (async () => {
      try {
        let data = cache.current.get(key);
        if (!data) {
          data = await apiRequest('/bible/' + key + '.json');
          cache.current.set(key, data);
          if (cache.current.size > 4) cache.current.delete(cache.current.keys().next().value);
        }
        if (!data[ref.chapter]) throw Error('تعذّر العثور على هذا الإصحاح.');
        if (id === requestId.current && alive.current) setChapter(data[ref.chapter]);
      } catch (e) {if (id === requestId.current && alive.current) setChapterError(e.message);}
      finally {if (id === requestId.current && alive.current) setChapterLoading(false);}
    })();
    return () => {requestId.current++;};
  }, [ref.translation, ref.book, ref.chapter, reload]);
  useEffect(() => {
    const id = ++feedId.current;
    setShared(null); setFeedError('');
    if (view !== 'shared') return;
    authenticatedRequest('/api/bible?' + new URLSearchParams({view: 'shared', translation: ref.translation, book: String(ref.book), chapter: String(ref.chapter)}))
      .then(data => {if (alive.current && feedId.current === id) setShared(data.notes);})
      .catch(e => {if (alive.current && feedId.current === id) setFeedError(e.message);});
    return () => {feedId.current++;};
  }, [view, ref.translation, ref.book, ref.chapter, feedReload]);
  async function act(fn) {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {await fn();} catch (e) {setError(e.message);} finally {if (alive.current) setBusy(false);}
  }
  function openNote(note) {setDraft({...note, visibility: note.visibility || 'private'}); setError(''); setNotice('');}
  function move(delta) {
    const count = book.verses[ref.translation].length;
    if (ref.chapter + delta >= 1 && ref.chapter + delta <= count) setRef({...ref, chapter: ref.chapter + delta});
    else if (ref.book + delta >= 1 && ref.book + delta <= 66) {
      const next = bible.catalog.books[ref.book + delta - 1];
      setRef({...ref, book: next.id, chapter: delta > 0 ? 1 : next.verses[ref.translation].length});
    }
    setNotice('');
  }
  async function saveNote() {
    const note = bible.noteInput(draft);
    const data = await write({action: 'save', revision: library.revision, ...(draft.id ? {id: draft.id} : {}), note});
    setLibrary(data); setDraft(null); setNotice(note.visibility === 'shared' ? 'تم حفظ الملاحظة ومشاركتها مع مستخدمي سبارك.' : 'تم حفظ ملاحظتك الخاصة.'); setFeedReload(n => n + 1);
  }
  return <View style={s.page}>
    <Pressable accessibilityRole="button" onPress={onBack} style={s.back}><Text style={s.muted}>العودة</Text><Ionicons name="arrow-forward" size={18} color="#716534" /></Pressable>
    <View style={s.hero}><View style={s.heroIcon}><Ionicons name="book-outline" size={28} color="#877022" /></View><Text style={s.title}>كتابي المقدس</Text><Text style={s.muted}>اقرأ، تأمل، واحتفظ بما يلمس قلبك.</Text></View>
    {!!error && <><Text accessibilityRole="alert" style={s.error}>{error}</Text><Action secondary disabled={busy} onPress={() => loadLibrary(!library)}>تحديث ملاحظاتي</Action></>}
    {!!notice && <Text role="status" accessibilityLiveRegion="polite" style={s.notice}>{notice}</Text>}
    <View style={s.panel}>
      <Text style={s.label}>الترجمة</Text><Picker accessibilityLabel="ترجمة الكتاب المقدس" selectedValue={ref.translation} enabled={!busy && !draft} onValueChange={translation => setRef({...ref, translation, chapter: Math.min(ref.chapter, book.verses[translation].length)})}>{bible.translations.map(t => <Picker.Item key={t.id} label={t.name} value={t.id} />)}</Picker>
      <Text style={s.label}>السفر</Text><Picker accessibilityLabel="سفر الكتاب المقدس" selectedValue={ref.book} enabled={!busy && !draft} onValueChange={value => setRef({...ref, book: Number(value), chapter: 1})}>{bible.catalog.books.map(b => <Picker.Item key={b.id} label={rtl ? b.ar : b.en} value={b.id} />)}</Picker>
      <Text style={s.label}>الإصحاح</Text><Picker accessibilityLabel="الإصحاح" selectedValue={ref.chapter} enabled={!busy && !draft} onValueChange={value => setRef({...ref, chapter: Number(value)})}>{book.verses[ref.translation].map((_, i) => <Picker.Item key={i} label={String(i + 1)} value={i + 1} />)}</Picker>
    </View>
    <View style={s.tabs}>{[['read','القراءة'],['notes','ملاحظاتي'],['shared','تأملات مشتركة']].map(([id, text]) => <Pressable key={id} accessibilityRole="tab" accessibilityLabel={text} accessibilityState={{selected: view === id}} disabled={!!draft || busy} onPress={() => setView(id)} style={[s.tab, view === id && s.activeTab]}><Text style={s.tabText}>{text}</Text></Pressable>)}</View>
    {draft ? <View style={s.panel}>
      <Text style={s.heading}>{draft.id ? 'تعديل الملاحظة' : 'ملاحظة جديدة'} · {bible.label(draft)}</Text>
      <Text style={s.muted}>{bible.translations.find(t => t.id === draft.translation)?.name}</Text>
      <TextInput accessibilityLabel="ملاحظتي على الآية" multiline maxLength={3000} editable={!busy} value={draft.text || ''} onChangeText={text => setDraft({...draft, text})} placeholder="ما الذي لمسك في هذه الآية؟" style={s.input} />
      <View style={s.shareRow}><View style={{flex: 1}}><Text style={s.label}>مشاركة هذه الملاحظة</Text><Text style={s.muted}>{draft.visibility === 'shared' ? 'ستظهر مع اسمك لجميع مستخدمي سبارك المسجلين. يمكنك جعلها خاصة مجددًا.' : 'خاصة بك فقط. لن تظهر للآخرين ما لم تفعّل المشاركة وتحفظ.'}</Text></View><Switch accessibilityLabel="مشاركة الملاحظة مع مستخدمي سبارك" disabled={busy} value={draft.visibility === 'shared'} onValueChange={value => setDraft({...draft, visibility: value ? 'shared' : 'private'})} trackColor={{true: '#ef8427', false: '#ddd8ca'}} /></View>
      <Action disabled={busy || !library || !draft.text?.trim()} onPress={() => act(saveNote)}>حفظ الملاحظة</Action>
      <Action secondary disabled={busy} onPress={() => {setDraft(null); setError('');}}>إلغاء</Action>
      {draft.id && <Action secondary disabled={busy} onPress={() => setDraft({...draft, confirmDelete: true})}>حذف الملاحظة</Action>}
      {draft.confirmDelete && <><Text style={s.error}>هل تريد حذف الملاحظة نهائيًا؟</Text><Action disabled={busy} onPress={() => act(async () => {setLibrary(await write({action: 'delete', id: draft.id, revision: library.revision})); setDraft(null); setNotice('تم حذف الملاحظة.'); setFeedReload(n => n + 1);})}>تأكيد الحذف</Action></>}
    </View> : <>
      {view === 'read' && <>
        <View style={s.readTools}><Pressable accessibilityRole="button" accessibilityLabel="تصغير خط الكتاب المقدس" disabled={fontSize === 18} onPress={() => setFontSize(n => Math.max(18,n - 3))} style={s.fontButton}><Text style={s.heading}>A−</Text></Pressable><Text style={s.muted}>حجم الخط</Text><Pressable accessibilityRole="button" accessibilityLabel="تكبير خط الكتاب المقدس" disabled={fontSize === 30} onPress={() => setFontSize(n => Math.min(30,n + 3))} style={s.fontButton}><Text style={s.heading}>A+</Text></Pressable></View>
        <Text style={s.heading}>{rtl ? book.ar : book.en} · {ref.chapter}</Text>
        <Text style={s.muted}>اضغط على آية لإضافة ملاحظة خاصة.</Text>
        {chapterLoading && <ActivityIndicator accessibilityLabel="تحميل الإصحاح" color="#b38b24" />}
        {!!chapterError && <><Text accessibilityRole="alert" style={s.error}>{chapterError}</Text><Action secondary onPress={() => setReload(n => n + 1)}>إعادة تحميل الإصحاح</Action></>}
        {chapter && <View style={s.scripture}>{Object.entries(chapter).map(([number, text]) => <Pressable key={number} accessibilityRole="button" accessibilityLabel={`إضافة ملاحظة على ${bible.label({...ref, verse: Number(number)})}`} onPress={() => openNote({...ref, verse: Number(number), text: '', visibility: 'private'})} style={s.verse}><Text style={[s.verseText, {fontSize, lineHeight: fontSize * 1.85, textAlign: rtl ? 'right' : 'left', writingDirection: rtl ? 'rtl' : 'ltr'}]}><Text style={s.verseNumber}>{number}  </Text>{text || (rtl ? 'لا يوجد نص لهذا الرقم في هذه الطبعة.' : '[This verse number has no text in this edition.]')}</Text>{library?.notes.some(n => n.book === ref.book && n.chapter === ref.chapter && n.verse === Number(number)) && <Text style={s.noteHint}>لديك ملاحظة على هذه الآية</Text>}</Pressable>)}</View>}
        <View style={s.navigation}><Action secondary disabled={ref.book === 1 && ref.chapter === 1} onPress={() => move(-1)}>الإصحاح السابق</Action><Action secondary disabled={ref.book === 66 && ref.chapter === book.verses[ref.translation].length} onPress={() => move(1)}>الإصحاح التالي</Action></View>
        <Action disabled={busy || !library || !chapter} secondary onPress={() => act(async () => {await write({action: 'progress', reference: ref, fontSize}); setNotice('تم حفظ موضع القراءة وحجم الخط لحسابك.');})}>حفظ موضع القراءة</Action>
      </>}
      {view === 'notes' && <><Text style={s.heading}>ملاحظاتي الشخصية</Text><Text style={s.muted}>ملاحظاتك من جميع الأسفار والترجمات. المشاركة اختيارية لكل ملاحظة.</Text>{!library ? <Action secondary onPress={() => loadLibrary()}>تحميل ملاحظاتي</Action> : !library.notes.length ? <Text style={s.empty}>لم تضف ملاحظات بعد. اختر آية أثناء القراءة لتبدأ.</Text> : library.notes.map(n => <View key={n.id} style={s.panel}><Text style={s.heading}>{bible.label(n)}</Text><Text style={s.muted}>{bible.translations.find(t => t.id === n.translation)?.name} · {n.visibility === 'shared' ? 'مشتركة' : 'خاصة'}</Text><Text style={s.noteText}>{n.text}</Text><View style={s.navigation}><Action secondary onPress={() => {setRef(bible.reference(n)); setView('read');}}>قراءة الإصحاح</Action><Action secondary onPress={() => openNote(n)}>تعديل الملاحظة</Action></View></View>)}</>}
      {view === 'shared' && <><Text style={s.heading}>تأملات على {bible.label(ref)}</Text><Text style={s.muted}>ملاحظات اختار أصحابها مشاركتها مع مستخدمي سبارك. تعرض آخر 50 ملاحظة متاحة لهذا الإصحاح.</Text><Action secondary onPress={() => setFeedReload(n => n + 1)}>تحديث التأملات</Action>{feedError ? <Text accessibilityRole="alert" style={s.error}>{feedError}</Text> : shared === null ? <ActivityIndicator accessibilityLabel="تحميل التأملات المشتركة" /> : !shared.length ? <Text style={s.empty}>لا توجد تأملات مشتركة لهذا الإصحاح بعد.</Text> : shared.map(n => <View key={n.id} style={s.panel}><Text style={s.heading}>{bible.label(n)}</Text><Text style={s.muted}>{n.author} · {bible.translations.find(t => t.id === n.translation)?.name}</Text><Text style={s.noteText}>{n.text}</Text>{n.mine && <Action secondary onPress={() => {const own = library?.notes.find(note => note.id === n.id); if (own) openNote(own); else {setError('حدّث ملاحظاتك لفتح هذه الملاحظة.');}}}>تعديل ملاحظتي</Action>}</View>)}</>}
    </>}
    <Text style={s.credit}>{translation.attribution}</Text>
    <Action secondary onPress={() => {Linking.openURL('https://sparkyouth.vercel.app/bible/NOTICE.txt').catch(() => setError('تعذّر فتح مصادر النصوص.'));}}>مصادر النصوص وحقوق الاستخدام</Action>
  </View>;
}
const s = StyleSheet.create({
  page:{gap:12,paddingBottom:24}, back:{flexDirection:'row-reverse',gap:8,alignItems:'center',alignSelf:'flex-end',minHeight:44},
  hero:{alignItems:'center',gap:8,paddingVertical:14},heroIcon:{backgroundColor:'#fff2c8',padding:16,borderRadius:22},
  title:{fontFamily:'TajawalBold',fontSize:28,color:'#302d26'},heading:{fontFamily:'TajawalBold',fontSize:19,color:'#39352c',textAlign:'right'},
  panel:{backgroundColor:'#fff',borderWidth:1,borderColor:'#ece6d9',padding:16,borderRadius:20,gap:10},
  label:{fontFamily:'TajawalBold',fontSize:15,textAlign:'right',color:'#4b4538'},muted:{fontFamily:'Tajawal',fontSize:14,lineHeight:23,color:'#847c6a',textAlign:'right'},
  tabs:{flexDirection:'row-reverse',backgroundColor:'#eee9dd',borderRadius:14,padding:4,gap:3},tab:{flex:1,paddingVertical:12,borderRadius:11},activeTab:{backgroundColor:'#fff'},tabText:{fontFamily:'TajawalBold',textAlign:'center',fontSize:13,color:'#5b523a'},
  button:{backgroundColor:'#ffda00',paddingVertical:14,paddingHorizontal:14,borderRadius:14,minHeight:48,marginVertical:3},secondary:{backgroundColor:'#efebe1'},buttonText:{fontFamily:'TajawalBold',fontSize:14,textAlign:'center',color:'#393225'},
  input:{fontFamily:'Tajawal',fontSize:17,lineHeight:27,textAlign:'right',textAlignVertical:'top',minHeight:150,padding:14,borderWidth:1,borderColor:'#e4dfd5',borderRadius:14},
  shareRow:{flexDirection:'row-reverse',gap:14,alignItems:'center'},error:{fontFamily:'Tajawal',color:'#b43024',textAlign:'right',lineHeight:24},notice:{fontFamily:'Tajawal',color:'#4b6d36',backgroundColor:'#edf4e7',padding:14,borderRadius:14,textAlign:'right'},
  readTools:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},fontButton:{backgroundColor:'#fff',paddingHorizontal:18,paddingVertical:8,borderRadius:12,minHeight:44},scripture:{backgroundColor:'#fffdf8',borderRadius:20,paddingHorizontal:16,paddingVertical:10},verse:{paddingVertical:8},verseText:{fontFamily:'Tajawal',color:'#39352e'},verseNumber:{color:'#ab8838',fontSize:14},noteHint:{fontFamily:'Tajawal',color:'#aa7721',fontSize:12,textAlign:'right'},
  navigation:{flexDirection:'row-reverse',justifyContent:'space-between',gap:8,flexWrap:'wrap'},noteText:{fontFamily:'Tajawal',fontSize:17,lineHeight:29,textAlign:'right',color:'#484238'},empty:{fontFamily:'Tajawal',fontSize:16,lineHeight:27,color:'#8d8471',textAlign:'center',padding:22},credit:{fontFamily:'Tajawal',fontSize:12,lineHeight:21,textAlign:'center',color:'#99907f',paddingTop:18}
});

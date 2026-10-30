import React,{useEffect,useRef,useState} from 'react';
import {View,Text,TextInput,StyleSheet,ActivityIndicator} from 'react-native';
import {Picker} from './Picker';
import {evaluationRequest,leaderPersonRequest} from './registration-client';
import {Surface,Badge,BackLink,PortalAction,SectionTitle,EmptyState,PersonAvatar,portalStyles as p} from './PortalUI';
const {evaluationQuestions,choicesForQuestion}=require('../../packages/shared/leaders');
export const evaluationLabels={support:'تقييم فريق الدعم',team:'تقييم فريق المرشدين',campers:'تقييم المخيمين'};
export default function LeaderEvaluation({activityId,section,onBack}) {
 const [subjects,setSubjects]=useState([]),[selected,setSelected]=useState(null),[answers,setAnswers]=useState({}),[notes,setNotes]=useState(''),
 [busy,setBusy]=useState(true),[error,setError]=useState(''),[message,setMessage]=useState(''),[person,setPerson]=useState(null),[editing,setEditing]=useState(false),[query,setQuery]=useState('');
 const active=useRef(true),sequence=useRef(0);
 async function loadSubjects(){const id=++sequence.current;setBusy(true);setError('');try{const r=await evaluationRequest(activityId,section);if(active.current&&id===sequence.current)setSubjects(r.subjects);}catch(e){if(active.current&&id===sequence.current)setError(e.message);}finally{if(active.current&&id===sequence.current)setBusy(false);}}
 useEffect(()=>{active.current=true;setSelected(null);setPerson(null);setEditing(false);setQuery('');loadSubjects();return()=>{active.current=false;sequence.current++;};},[activityId,section]);
 const questions=evaluationQuestions[section]||[],done=subjects.filter(s=>s.evaluation).length,answered=questions.filter(([id])=>answers[id]).length;
 async function openPerson(subject){setSelected(subject);setAnswers(subject.evaluation?.answers||{});setNotes(subject.evaluation?.notes||'');setMessage('');setError('');setPerson(null);setEditing(false);setBusy(true);const id=++sequence.current;try{const r=await leaderPersonRequest(activityId,section,subject.id);if(active.current&&sequence.current===id)setPerson(r.person);}catch(e){if(active.current&&sequence.current===id)setError(e.message);}finally{if(active.current&&sequence.current===id)setBusy(false);}}
 async function save(){setBusy(true);setError('');setMessage('');try{const r=await evaluationRequest(activityId,section,{subjectId:selected.id,answers,notes,expected:selected.evaluation?.updatedAt||null});if(!active.current)return;setSelected(value=>({...value,evaluation:r.evaluation}));setSubjects(values=>values.map(value=>value.id===selected.id?{...value,evaluation:r.evaluation}:value));setMessage('تم حفظ التقييم.');}catch(e){if(active.current)setError(e.message);}finally{if(active.current)setBusy(false);}}
 return <View style={p.page}>
  <BackLink label={editing?'العودة إلى الملف':selected?'العودة إلى الأسماء':'العودة إلى النشاط'} disabled={busy} onPress={()=>{if(editing)setEditing(false);else if(selected){setSelected(null);setPerson(null);setMessage('');setError('');}else onBack();}}/>
  <SectionTitle title={evaluationLabels[section]} subtitle={editing?'تقييم واضح يساعدنا على النمو':'الملفات الشخصية والتقييمات ضمن تكليفك'}/>
  {busy && <ActivityIndicator accessibilityLabel="جارٍ تحميل التقييم" color="#c29537"/>}
  {!selected ? <>
   <Surface style={s.summary}><View><Text style={s.count}>{subjects.length}</Text><Text style={p.muted}>ضمن تكليفك</Text></View><View><Text style={s.count}>{done}</Text><Text style={p.muted}>تم التقييم</Text></View><View><Text style={s.count}>{subjects.length-done}</Text><Text style={p.muted}>بانتظار التقييم</Text></View></Surface>
   <TextInput accessibilityLabel="البحث في أسماء التقييم" placeholder="ابحث بالاسم…" value={query} onChangeText={setQuery} style={s.input}/>
   {subjects.filter(subject=>(subject.name||'').toLowerCase().includes(query.trim().toLowerCase())).map(subject=><PortalAction key={subject.id} label={subject.name+(subject.evaluation?' · تم التقييم':'')} subtitle={subject.evaluation?'عرض الملف أو تعديل التقييم':'افتح الملف لبدء التقييم'} icon={subject.evaluation?'checkmark-circle-outline':'person-outline'} onPress={()=>openPerson(subject)} disabled={busy}/>)}
   {!busy&&!subjects.length&&<EmptyState>لا توجد أسماء ضمن تكليفك في هذا القسم.</EmptyState>}
   {!busy&&!!subjects.length&&!subjects.some(subject=>(subject.name||'').toLowerCase().includes(query.trim().toLowerCase()))&&<EmptyState icon="search-outline">لا توجد أسماء مطابقة للبحث.</EmptyState>}
  </> : !editing ? <>
   <Surface style={{alignItems:'center',paddingVertical:25}}><PersonAvatar name={person?.name||selected.name} photo={person?.photo} size={96}/><Text style={[p.title,{textAlign:'center'}]}>{person?.name||selected.name}</Text><Badge>{person?.role||'ملف المشارك'}</Badge><Text selectable style={[p.text,{textAlign:'center'}]}>{person?.phone||'رقم الهاتف غير متوفر'}</Text>{selected.evaluation&&<Badge complete>تم التقييم</Badge>}</Surface>
   <PortalAction accent label="التقييم والملاحظات" subtitle={selected.evaluation?'مراجعة التقييم المحفوظ وتحديثه':'ابدأ التقييم وأضف ملاحظاتك'} icon="clipboard-outline" disabled={busy||!person} onPress={()=>setEditing(true)}/>
   <SectionTitle title="المخيمات المسجل فيها" subtitle="سجل المشاركة والأدوار السابقة"/>
   {person?.history?.length ? person.history.map((camp,i)=><Surface key={camp.id+'-'+i}><Text style={p.heading}>{camp.title}</Text><Badge>{camp.role||'مشارك'}</Badge></Surface>) : !busy&&<EmptyState icon="calendar-outline">لا يوجد سجل مشاركات متاح.</EmptyState>}
   {!!error&&!person&&<PortalAction label="إعادة تحميل الملف" icon="refresh-outline" onPress={()=>openPerson(selected)} disabled={busy}/>}
  </> : <>
   <Surface><View style={p.row}><PersonAvatar name={selected.name} photo={person?.photo} size={46}/><View style={{flex:1}}><Text style={p.heading}>{selected.name}</Text><Text style={p.muted}>{answered} من {questions.length} أسئلة مكتملة</Text></View></View><View style={s.track}><View style={[s.fill,{width:`${questions.length?answered/questions.length*100:0}%`}]}/></View></Surface>
   {questions.length ? <>
    {questions.map((q,index)=>{const [id,label]=q;return <Surface key={id}><View style={p.row}><View style={s.questionNumber}><Text style={s.questionNumberText}>{index+1}</Text></View><Text style={[p.text,{flex:1,color:'#40382b'}]}>{label}</Text></View><Picker accessibilityLabel={label} enabled={!busy} selectedValue={answers[id]||''} onValueChange={value=>setAnswers(current=>{const next={...current,[id]:value};if(id==='churchInvitation'&&value!=='نعم')delete next.churchName;return next;})}><Picker.Item label="اختر التقييم" value=""/>{choicesForQuestion(q).map(value=><Picker.Item key={value} label={value} value={value}/>)}</Picker></Surface>;})}
    {section==='campers'&&answers.churchInvitation==='نعم'&&<Surface><Text style={p.heading}>اسم الكنيسة المدعو إليها</Text><TextInput accessibilityLabel="اسم الكنيسة المدعو إليها" editable={!busy} value={answers.churchName||''} onChangeText={value=>setAnswers(current=>({...current,churchName:value}))} maxLength={200} style={s.input}/></Surface>}
    <Surface><SectionTitle title="الملاحظات والتوصيات" subtitle="أضف أمثلة وخطوات عملية تساعد الشخص على التطور"/><TextInput accessibilityLabel="الملاحظات والتوصيات" editable={!busy} multiline value={notes} maxLength={2000} onChangeText={setNotes} placeholder="اكتب ملاحظاتك هنا…" style={[s.input,s.notes]}/></Surface>
    <PortalAction accent label={busy?'جارٍ الحفظ…':'حفظ التقييم'} icon="checkmark-circle-outline" disabled={busy||questions.some(([id])=>!answers[id])} onPress={save}/>
   </> : <EmptyState>سيُتاح النموذج بعد اعتماد أسئلة التقييم.</EmptyState>}
  </>}
  {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
  {!!error&&!selected&&<PortalAction label="إعادة تحميل الأسماء" icon="refresh-outline" onPress={loadSubjects} disabled={busy}/>}
  {!!message&&<Text role="status" accessibilityLiveRegion="polite" style={s.success}>{message}</Text>}
 </View>;
}
const s=StyleSheet.create({
 summary:{flexDirection:'row-reverse',justifyContent:'space-around',backgroundColor:'#fff8e8'},count:{fontFamily:'TajawalBold',fontSize:27,color:'#9a792f',textAlign:'center'},
 input:{fontFamily:'Tajawal',fontSize:16,textAlign:'right',padding:16,borderWidth:1,borderColor:'#e7dfd0',borderRadius:16,backgroundColor:'#fff'},notes:{minHeight:150,textAlignVertical:'top',lineHeight:26},
 track:{height:7,backgroundColor:'#f2ece0',borderRadius:4,overflow:'hidden',alignItems:'flex-end'},fill:{height:7,backgroundColor:'#e6b745',borderRadius:4},questionNumber:{width:30,height:30,borderRadius:10,backgroundColor:'#fff3cd',alignItems:'center',justifyContent:'center'},questionNumberText:{fontFamily:'TajawalBold',color:'#a08235'},
 error:{fontFamily:'Tajawal',color:'#b43024',textAlign:'right',lineHeight:24},success:{fontFamily:'Tajawal',color:'#46723b',backgroundColor:'#edf5e9',padding:16,borderRadius:16,textAlign:'right'}
});

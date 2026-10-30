import React,{useState} from 'react';
import {View,Text,Pressable,StyleSheet,Linking} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MediaImage from './MediaImage';
import LeaderEvaluation,{evaluationLabels} from './LeaderEvaluation';
import {Surface,Badge,BackLink,PortalAction,SectionTitle,EmptyState,PersonAvatar,portalStyles as p} from './PortalUI';
export default function LeaderPortal({portal,user,onInformation,onApplication}) {
 const [event,setEvent]=useState(null),[section,setSection]=useState(null),[team,setTeam]=useState(false),[error,setError]=useState('');
 const activities=portal?.activities || [],links=portal?.links || [];
 async function openLink(url) {try {if(!/^https:\/\//i.test(url||''))throw Error('الرابط غير متاح.');await Linking.openURL(url);}catch{setError('تعذّر فتح الرابط. حاول مجددًا.');}}
 const linkCards=list=>list?.length ? list.map((l,i)=><PortalAction key={i} label={l.title} icon="link-outline" onPress={()=>openLink(l.url)}/>) : <EmptyState icon="link-outline">لم تضف الإدارة روابط هنا بعد.</EmptyState>;
 if(section && event)return <LeaderEvaluation activityId={event.id} section={section} onBack={()=>setSection(null)}/>;
 return <View style={p.page}>
  {!event ? <>
   <Surface style={s.welcome}><View style={p.row}><View style={s.brandIcon}><Ionicons name="compass-outline" size={30} color="#a7751c"/></View><View style={{flex:1,gap:5}}><Text style={p.title}>بوابة المرشدين</Text><Text style={p.text}>أهلًا {user.name}، هنا تبدأ مهمتك.</Text></View></View><Badge complete>مرشد معتمد</Badge><View style={s.stats}><View style={s.stat}><Text style={s.number}>{activities.length}</Text><Text style={p.muted}>تكليفاتي</Text></View><View style={s.stat}><Text style={s.number}>{links.length}</Text><Text style={p.muted}>روابط عامة</Text></View></View></Surface>
   <SectionTitle title="مخيماتي وأنشطتي" subtitle="تكليفاتك المحددة من الإدارة"/>
   {activities.length ? activities.map(a=><Pressable key={a.id} accessibilityRole="button" accessibilityLabel={a.title} onPress={()=>{setEvent(a);setTeam(false);setError('');}} style={({pressed})=>[s.activity,pressed && {opacity:.75}]}><MediaImage path={a.image || '/media/camp.png'} resizeMode="cover" style={s.thumbnail}/><View style={{flex:1,gap:10}}><Text style={p.heading}>{a.title}</Text><Badge>{a.role || 'مرشد'}</Badge>{!!a.date && <Text style={p.muted}>{a.date}</Text>}<View style={p.row}><Text style={s.open}>فتح النشاط</Text><Ionicons name="arrow-back" size={16} color="#a67c25"/></View></View></Pressable>) : <EmptyState>لم تحدد الإدارة تكليفات لك بعد.</EmptyState>}
   <SectionTitle title="روابط مهمة" subtitle="موارد مشتركة لجميع المرشدين"/>{linkCards(links)}
   <SectionTitle title="ملفي كمرشد"/>
   <PortalAction label="معلوماتي" subtitle="بياناتك الشخصية وبيانات الإرشاد" icon="person-outline" onPress={onInformation}/>
   <PortalAction label="طلب الإرشاد المعتمد" subtitle="عرض تفاصيل الطلب الذي اعتمدته الإدارة" icon="document-text-outline" onPress={onApplication}/>
  </> : <>
   <BackLink label="جميع تكليفاتي" onPress={()=>{setEvent(null);setTeam(false);setError('');}}/>
   <Surface style={{padding:0,overflow:'hidden'}}><MediaImage accessibilityLabel="صورة المخيم" path={event.image || '/media/camp.png'} resizeMode="contain" style={s.cover}/><View style={{padding:20,gap:12}}><Text style={p.title}>{event.title}</Text><Badge>{event.role || 'مرشد'}</Badge>{!!event.date && <View style={p.row}><Ionicons name="calendar-outline" size={17} color="#a58a42"/><Text style={p.text}>{event.date}</Text></View>}{!!event.location && <View style={p.row}><Ionicons name="location-outline" size={17} color="#a58a42"/><Text style={[p.text,{flex:1}]}>{event.location}</Text></View>}{!!event.tentNumber && <Text style={p.muted}>الخيمة {event.tentNumber}</Text>}</View></Surface>
   <SectionTitle title="مساحة عملي" subtitle="الأدوات المتاحة حسب دورك في هذا النشاط"/>
   <PortalAction label="فريق المخيم" subtitle={`${event.team?.length || 0} من أعضاء الفريق`} icon="people-outline" onPress={()=>setTeam(value=>!value)}/>
   {team && <Surface>{event.teamImage && <MediaImage path={event.teamImage} resizeMode="contain" style={s.teamImage}/>}<SectionTitle title="فريق المخيم"/>{event.team?.length ? event.team.map(person=><View key={person.id} style={s.teamRow}><PersonAvatar name={person.name} size={44}/><View style={{flex:1,gap:4}}><Text style={p.heading}>{person.name || 'عضو الفريق'}</Text><Text style={p.muted}>{person.role}</Text></View></View>) : <Text style={p.text}>لم تُضف أسماء الفريق بعد.</Text>}</Surface>}
   {event.evaluationSections?.map(value=><PortalAction key={value} accent label={evaluationLabels[value]} subtitle="الملفات الشخصية، التقييمات والملاحظات" icon={value==='campers'?'happy-outline':'clipboard-outline'} onPress={()=>setSection(value)}/>)}
   <Surface><SectionTitle title="عن المخيم"/><Text style={p.text}>{event.about || 'ستضيف الإدارة تفاصيل النشاط هنا.'}</Text></Surface>
   <SectionTitle title="روابط النشاط"/>{linkCards(event.links)}
  </>}
  {!!error && <Text accessibilityRole="alert" style={{fontFamily:'Tajawal',color:'#b43024',textAlign:'right'}}>{error}</Text>}
 </View>;
}
const s=StyleSheet.create({
 welcome:{backgroundColor:'#fff8e9',borderColor:'#f0e2bf'},brandIcon:{backgroundColor:'#fff0cc',padding:13,borderRadius:20},
 stats:{flexDirection:'row-reverse',gap:10,marginTop:5},stat:{flex:1,alignItems:'center',backgroundColor:'#ffffffaa',padding:12,borderRadius:16},number:{fontFamily:'TajawalBold',fontSize:25,color:'#8a6b2b'},
 activity:{flexDirection:'row-reverse',gap:16,padding:14,borderRadius:24,borderWidth:1,borderColor:'#ebe5da',backgroundColor:'#fff',alignItems:'center'},thumbnail:{width:102,height:130,borderRadius:17},open:{fontFamily:'TajawalBold',fontSize:13,color:'#a67c25'},
 cover:{width:'100%',height:205,backgroundColor:'#f2ebdb'},teamImage:{width:'100%',height:155,borderRadius:16},teamRow:{flexDirection:'row-reverse',alignItems:'center',gap:12,paddingVertical:12,borderBottomWidth:1,borderBottomColor:'#f1ede5'}
});

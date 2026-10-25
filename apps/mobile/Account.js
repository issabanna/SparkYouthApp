import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, Modal, Image, Linking, StyleSheet, AppState } from 'react-native';
import {pickProfilePhoto} from './profile-photo';
import { leaderRequest, accountRequest } from './registration-client';
import AccountIdentity from './AccountIdentity';
import BirthDatePicker from './BirthDatePicker';
import {ChangePassword} from './AuthScreen';
import BusApp from './BusApp';
import LeaderEvaluation, { evaluationLabels } from './LeaderEvaluation';
import { Picker } from './Picker';
import MediaImage from './MediaImage';
const {
  leaderFields,
  leaderChoices,
  accountFields
} = require('../../packages/shared/leaders');
const Button = ({
  children,
  onPress,
  orange,
  disabled
}) => <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[s.button, orange && s.orange, disabled && {
  opacity: .55
}]}><Text style={[s.buttonText, orange && {
    color: '#fff'
  }]}>{children}</Text></Pressable>;
const empty = Object.fromEntries([...leaderFields.map(([k]) => [k, '']),['dob','']]);
export default function Account({
  user,
  profile,
  updateProfile,
  content,
  onNotifications,
  onLogout
}) {
  const [data, setData] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [photoMessage,setPhotoMessage] = useState(''),
    [screen, setScreen] = useState(null),
    [form, setForm] = useState(empty),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [selectedEvent, setSelectedEvent] = useState(null),
    [account, setAccount] = useState(profile.account || null),
    [evaluationSection, setEvaluationSection] = useState(null),
    [showCampTeam, setShowCampTeam] = useState(false);
  const refresh = async () => {
    try {
      const [result, saved] = await Promise.all([leaderRequest(), accountRequest()]);
      setData(result);
      setAccount(current=>current?.updatedAt&&saved.account?.updatedAt&&current.updatedAt>saved.account.updatedAt?current:saved.account);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 30000),
      sub = AppState.addEventListener('change', state => {
        if (state === 'active') refresh();
      });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, []);
  const application = data?.application,
    approved = application?.status === 'LeaderApproved',
    pending = application?.status === 'LeaderPending';
  const act = async fn => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const submit = () => act(async () => {
    const result = await leaderRequest({
      details: form,
      consent
    });
    setData(result);
    setScreen(null);
  });
  const openLink = async url => {
    if (!/^https:\/\//i.test(url || '')) {
      setError('لم تضف الإدارة رابطًا صالحًا بعد.');
      return;
    }
    try {
      await Linking.openURL(url);
    } catch {
      setError('تعذّر فتح الرابط.');
    }
  };
  const changePhoto=()=>act(async()=>{
      setPhotoMessage('');
      const uri = await pickProfilePhoto();
      if (uri) {
        if (!account) {
          setScreen('identity');
          throw Error('أكمل معلومات الحساب أولًا.');
        }
        const result = await accountRequest({
          details: account.details,
          photo: uri
        });
        setAccount(result.account);
        updateProfile({
          ...profile,
          account: result.account,
          photo: uri
        });
      }
      if(uri)setPhotoMessage('تم تحديث صورة الحساب.');
    });

  return <View style={s.account}><Text style={s.title}>حسابي</Text><View style={s.identity}><Pressable accessibilityRole="button" accessibilityLabel="تغيير صورة الملف الشخصي" disabled={busy} onPress={changePhoto}>{account?.photo || profile.photo ? <Image source={{
        uri: account?.photo || profile.photo
      }} style={s.avatar} /> : <View style={[s.avatar, {
        backgroundColor: '#fff0df',
        alignItems: 'center',
        justifyContent: 'center'
      }]}><Text style={{
          fontSize: 34
        }}>☺</Text></View>}</Pressable><Text style={s.title}>{user.name}</Text></View>
 <Button onPress={() => setScreen('identity')}>معلومات الحساب</Button>
 <Button onPress={() => setScreen('password')}>تعديل كلمة السر</Button>
 <Button disabled={busy} onPress={changePhoto}>{busy?'جارٍ تحديث الصورة…':'تعديل صورة الحساب'}</Button>
 {!!photoMessage&&<Text accessibilityRole="status" style={s.text}>{photoMessage}</Text>}
 <Button onPress={onNotifications}>الإشعارات</Button>
 <Button onPress={() => setScreen('privacy')}>سياسة الخصوصية</Button>
 <Button onPress={() => setScreen('contact')}>تواصل معنا</Button>
 <Button orange disabled={loading || busy} onPress={() => {
      if (!data) {
        refresh();
        return;
      }
      if (approved) setScreen('portal');else if (pending) setScreen('pending');else {
        if (!account) {
          setScreen('identity');
          setError('أكمل معلومات الحساب أولًا.');
          return;
        }
        setForm({
          ...empty,
          ...account?.details,
          ...application?.details
        });
        setConsent(false);
        setScreen('apply');
      }
    }}>{loading ? 'جارٍ تحميل حالة الإرشاد…' : approved ? 'بوابة المرشدين' : pending ? 'طلب الإرشاد بانتظار الموافقة' : application?.status === 'LeaderRejected' ? 'إعادة تقديم طلب الإرشاد' : 'التسجيل كمرشد'}</Button>
 {!!data?.busActivities?.length && <><View style={{
        height: 18
      }} /><Button onPress={() => setScreen('bus')}>Bus App</Button></>}
 {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
 <Button onPress={onLogout}>تسجيل الخروج</Button>
 <Modal visible={!!screen} animationType="slide" onRequestClose={() => {
      if (!busy) {
        setScreen(null);
        setSelectedEvent(null);
      }
    }}><View style={s.modal}><ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled"><Button disabled={busy} onPress={() => {
            setScreen(null);
            setSelectedEvent(null);
            setEvaluationSection(null);
            setShowCampTeam(false);
            setError('');
          }}>العودة إلى حسابي</Button>
 {screen === 'identity' && <AccountIdentity initial={account?.details} cityOptions={content.registrationOptions?.cityOptions || []} onSaved={value => {
            setAccount(value);
            updateProfile({
              ...profile,
              account: value,
              user: {
                ...user,
                name: value.details.englishFirstName
              }
            });
            setScreen(null);
            setError('');
          }} />}
 {screen === 'bus' && !!data?.busActivities?.length && <BusApp activities={data.busActivities} />}
 {screen === 'password' && <ChangePassword/>}
 {screen === 'privacy' && <><Text style={s.title}>سياسة الخصوصية</Text><Text style={s.text}>{content.accountSettings?.privacyText || 'لم تنشر الإدارة سياسة الخصوصية بعد.'}</Text></>}
 {screen === 'contact' && <><Text style={s.title}>تواصل معنا</Text><Text selectable style={s.text}>{content.accountSettings?.contactText || 'لم تضف الإدارة تفاصيل التواصل بعد.'}</Text></>}
 {screen === 'pending' && <><Text style={s.title}>طلبك بانتظار موافقة الإدارة</Text><Text style={s.text}>استلمنا طلب الإرشاد. عند اعتماده سيظهر زر بوابة المرشدين في حسابك.</Text><Button disabled={busy} onPress={() => act(refresh)}>تحديث الحالة</Button></>}
 {screen === 'apply' && <><Text style={s.title}>طلب التسجيل كمرشد</Text><Text style={s.heading}>معلومات الحساب</Text>{[...accountFields, ['gender', 'الجنس']].map(([key, label]) => <View key={key}><Text style={s.label}>{label}</Text><Text style={s.text}>{key === 'gender' ? account?.details[key] === 'male' ? 'ذكر' : 'أنثى' : account?.details[key] || '—'}</Text></View>)}<Button onPress={() => setScreen('identity')}>تعديل معلومات الحساب</Button><Text style={s.heading}>معلومات إضافية للإرشاد</Text>{leaderFields.map(([key, label]) => <View key={key}><Text style={s.label}>{label}</Text>{leaderChoices[key] ? <Picker accessibilityLabel={label} selectedValue={form[key]} onValueChange={v => setForm(f => ({
                ...f,
                [key]: v
              }))}><Picker.Item label="اختر" value="" />{leaderChoices[key].map(v => <Picker.Item key={v} label={v} value={v} />)}</Picker> : <TextInput accessibilityLabel={label} value={form[key]} maxLength={500} onChangeText={v => setForm(f => ({
                ...f,
                [key]: v
              }))} keyboardType={key==='phone'?'phone-pad':'default'} style={s.input} />}</View>)}<BirthDatePicker value={form.dob} onChange={dob=>setForm(f=>({...f,dob}))}/><Pressable accessibilityRole="checkbox" accessibilityState={{
              checked: consent
            }} onPress={() => setConsent(!consent)} style={s.button}><Text style={s.text}>{consent ? '☑' : '☐'} أوافق على إرسال هذه المعلومات للإدارة لمراجعة طلب الإرشاد.</Text></Pressable><Button orange disabled={busy || !consent} onPress={submit}>{busy ? 'جارٍ إرسال الطلب…' : 'إرسال طلب الإرشاد'}</Button></>}
 {screen === 'portal' && approved && <>{!selectedEvent ? <><Text style={s.title}>بوابة المرشدين</Text><Text style={s.heading}>مخيماتي وأنشطتي</Text><Text style={s.text}>تكليفاتك المحددة من الإدارة</Text><ScrollView horizontal showsHorizontalScrollIndicator={false}>{(data.portal?.activities || []).map(a => <Pressable key={a.id} accessibilityRole="button" onPress={() => {
                  setSelectedEvent(a);
                  setEvaluationSection(null);
                  setShowCampTeam(false);
                }} style={s.camp}><MediaImage path={a.image || '/media/camp.png'} style={s.campImage} /><Text style={s.heading}>{a.title}</Text><Text style={s.text}>{a.role || 'مرشد'}</Text><Text style={s.text}>{a.date || ''}</Text></Pressable>)}</ScrollView>{!data.portal?.activities?.length && <Text style={s.text}>لم تحدد الإدارة تكليفات لك بعد.</Text>}<Text style={s.heading}>روابط مهمة</Text>{data.portal?.links?.map((link, i) => <Button key={i} onPress={() => openLink(link.url)}>{link.title}</Button>)}<Button onPress={() => setScreen('information')}>معلوماتي</Button><Button onPress={() => setScreen('leaderApplication')}>التسجيل</Button></> : evaluationSection ? <LeaderEvaluation activityId={selectedEvent.id} section={evaluationSection} onBack={() => setEvaluationSection(null)} /> : <><Button onPress={() => setSelectedEvent(null)}>جميع تكليفاتي</Button>{selectedEvent.teamImage && <MediaImage path={selectedEvent.teamImage} style={{
                height: 170,
                borderRadius: 16,
                marginBottom: 24
              }} />}<MediaImage path={selectedEvent.image || '/media/camp.png'} style={{
                height: 150,
                width: 150,
                alignSelf: 'flex-end',
                borderRadius: 22
              }} /><Text style={s.title}>{selectedEvent.title}</Text><Text style={s.heading}>الدور في المخيم</Text><Text style={s.text}>{selectedEvent.role} · {selectedEvent.date} · {selectedEvent.location}</Text><Button onPress={() => setShowCampTeam(!showCampTeam)}>فريق المخيم</Button>{showCampTeam && selectedEvent.team?.map(person => <View key={person.id}><Text style={s.heading}>{person.name}</Text><Text style={s.text}>{person.role}</Text></View>)}{selectedEvent.evaluationSections?.map(section => <Button key={section} onPress={() => setEvaluationSection(section)}>{evaluationLabels[section]}</Button>)}<Text style={s.heading}>عن المخيم</Text><Text style={s.text}>{selectedEvent.about}</Text><Text style={s.heading}>روابط مهمة</Text>{selectedEvent.links.map((link, i) => <Button key={i} onPress={() => openLink(link.url)}>{link.title}</Button>)}</>}</>}
 {['information', 'leaderApplication'].includes(screen) && <><Text style={s.title}>{screen === 'information' ? 'معلوماتي' : 'طلب الإرشاد المعتمد'}</Text>{[...accountFields, ...leaderFields, ['dob', 'تاريخ الميلاد'], ['gender', 'الجنس']].map(([key, label]) => <View key={key}><Text style={s.label}>{label}</Text><Text style={s.text}>{key === 'gender' ? application?.details[key] === 'male' ? 'ذكر' : 'أنثى' : application?.details[key] || '—'}</Text></View>)}<Button onPress={() => setScreen('portal')}>العودة إلى بوابة المرشدين</Button></>}
 {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
 </ScrollView></View></Modal></View>;
}
const s = StyleSheet.create({
  account: {
    gap: 4
  },
  identity: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 20
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: 'center'
  },
  title: {
    fontFamily: 'TajawalBold',
    fontSize: 25,
    textAlign: 'right',
    color: '#28251f',
    marginVertical: 14
  },
  heading: {
    fontFamily: 'TajawalBold',
    fontSize: 19,
    textAlign: 'right',
    marginVertical: 14
  },
  button: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#f0eee9',
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#e7e2d8'
  },
  orange: {
    backgroundColor: '#ef8427',
    borderColor: '#ef8427'
  },
  buttonText: {
    fontFamily: 'TajawalBold',
    fontSize: 16,
    textAlign: 'center',
    color: '#292720'
  },
  text: {
    fontFamily: 'Tajawal',
    fontSize: 16,
    lineHeight: 25,
    textAlign: 'right',
    color: '#59554d'
  },
  label: {
    fontFamily: 'TajawalBold',
    textAlign: 'right',
    marginVertical: 10
  },
  input: {
    fontFamily: 'Tajawal',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    borderColor: '#e4dfd5',
    borderWidth: 1,
    textAlign: 'right',
    fontSize: 16
  },
  error: {
    color: '#b43024',
    fontFamily: 'Tajawal',
    textAlign: 'right',
    padding: 12
  },
  modal: {
    flex: 1,
    backgroundColor: '#faf8f4'
  },
  body: {
    padding: 24,
    paddingTop: 44,
    paddingBottom: 60,
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center'
  },
  camp: {
    width: 220,
    padding: 12,
    margin: 8,
    borderRadius: 24,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e4dfd5'
  },
  campImage: {
    width: '100%',
    height: 150,
    borderRadius: 18
  }
});

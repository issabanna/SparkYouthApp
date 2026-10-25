import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, Image } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { evaluationRequest, leaderPersonRequest } from './registration-client';
const {
  evaluationQuestions,
  choicesForQuestion
} = require('../../packages/shared/leaders');
export const evaluationLabels = {
  support: 'تقييم فريق الدعم',
  team: 'تقييم فريق المرشدين',
  campers: 'تقييم المخيمين'
};
export default function LeaderEvaluation({
  activityId,
  section,
  onBack
}) {
  const [subjects, setSubjects] = useState([]),
    [selected, setSelected] = useState(null),
    [answers, setAnswers] = useState({}),
    [notes, setNotes] = useState(''),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [person, setPerson] = useState(null),
    [editing, setEditing] = useState(false);
  useEffect(() => {
    let active = true;
    evaluationRequest(activityId, section).then(r => {
      if (active) setSubjects(r.subjects);
    }).catch(e => {
      if (active) setError(e.message);
    }).finally(() => {
      if (active) setBusy(false);
    });
    return () => {
      active = false;
    };
  }, [activityId, section]);
  const button = (label, fn, disabled = false) => <Pressable accessibilityRole="button" disabled={disabled} onPress={fn} style={{
    padding: 16,
    borderRadius: 16,
    marginVertical: 7,
    backgroundColor: '#ffda00',
    opacity: disabled ? .5 : 1
  }}><Text style={{
      fontFamily: 'TajawalBold',
      textAlign: 'center'
    }}>{label}</Text></Pressable>;
  const questions = evaluationQuestions[section] || [];
  return <View>{button(editing ? 'العودة إلى الملف' : selected ? 'العودة إلى الأسماء' : 'العودة إلى النشاط', () => {
      if (editing) {
        setEditing(false);
      } else if (selected) {
        setSelected(null);
        setPerson(null);
        setMessage('');
        setError('');
      } else onBack();
    }, busy)}<Text style={{
      fontFamily: 'TajawalBold',
      fontSize: 22,
      textAlign: 'right',
      marginVertical: 16
    }}>{evaluationLabels[section]}</Text>{busy && <Text>جارٍ التحميل…</Text>}{!selected ? <>{subjects.map(person => <View key={person.id}>{button(person.name + (person.evaluation ? ' · تم التقييم' : ''), async () => {
          setSelected(person);
          setAnswers(person.evaluation?.answers || {});
          setNotes(person.evaluation?.notes || '');
          setMessage('');
          setPerson(null);
          setEditing(false);
          setBusy(true);
          try {
            const r = await leaderPersonRequest(activityId, section, person.id);
            setPerson(r.person);
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        })}</View>)}{!busy && !subjects.length && <Text style={{
        fontFamily: 'Tajawal',
        textAlign: 'right'
      }}>لا توجد أسماء ضمن تكليفك في هذا القسم.</Text>}</> : !editing ? <View style={{
      alignItems: 'stretch'
    }}><Text style={{
        fontFamily: 'TajawalBold',
        fontSize: 24,
        textAlign: 'center',
        marginVertical: 18
      }}>{person?.name || selected.name}</Text>{person?.photo ? <Image source={{
        uri: person.photo
      }} style={{
        width: 110,
        height: 110,
        borderRadius: 32,
        alignSelf: 'center',
        marginBottom: 14
      }} /> : <View style={{
        width: 110,
        height: 110,
        borderRadius: 32,
        alignSelf: 'center',
        backgroundColor: '#e9e6e1',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14
      }}><Text style={{
          fontSize: 40,
          color: '#868078'
        }}>☺</Text></View>}<Text style={{
        fontFamily: 'TajawalBold',
        textAlign: 'center',
        fontSize: 18
      }}>{person?.role || ''}</Text><Text selectable style={{
        fontFamily: 'Tajawal',
        textAlign: 'right',
        paddingVertical: 18
      }}>{person?.phone || 'رقم الهاتف غير متوفر'}</Text>{button('التقييم والملاحظات', () => setEditing(true), busy || !person)}<Text style={{
        fontFamily: 'TajawalBold',
        fontSize: 20,
        textAlign: 'right',
        marginVertical: 20
      }}>المخيمات المسجل فيها</Text>{person?.history.map((camp, i) => <View key={camp.id + '-' + i} style={{
        borderBottomWidth: 1,
        borderBottomColor: '#e4dfd5',
        paddingVertical: 18
      }}><Text style={{
          fontFamily: 'TajawalBold',
          textAlign: 'right'
        }}>{camp.title}</Text><Text style={{
          fontFamily: 'Tajawal',
          textAlign: 'right'
        }}>{camp.role}</Text></View>)}</View> : <><Text style={{
        fontFamily: 'TajawalBold',
        fontSize: 20,
        textAlign: 'right'
      }}>{selected.name}</Text>{questions.length ? <>{questions.map(q => {
          const [id, label] = q;
          return <View key={id}><Text style={{
              fontFamily: 'Tajawal',
              textAlign: 'right',
              marginVertical: 12
            }}>{label}</Text><Picker accessibilityLabel={label} selectedValue={answers[id] || ''} onValueChange={v => setAnswers(a => {
              const next = {
                ...a,
                [id]: v
              };
              if (id === 'churchInvitation' && v !== 'نعم') delete next.churchName;
              return next;
            })}><Picker.Item label="اختر التقييم" value="" />{choicesForQuestion(q).map(c => <Picker.Item key={c} label={c} value={c} />)}</Picker></View>;
        })}{section === 'campers' && answers.churchInvitation === 'نعم' && <View><Text style={{
            textAlign: 'right',
            marginVertical: 12
          }}>اسم الكنيسة المدعو إليها</Text><TextInput accessibilityLabel="اسم الكنيسة المدعو إليها" value={answers.churchName || ''} onChangeText={v => setAnswers(a => ({
            ...a,
            churchName: v
          }))} maxLength={200} style={{
            borderWidth: 1,
            borderColor: '#ded9cf',
            padding: 16,
            borderRadius: 16,
            textAlign: 'right'
          }} /></View>}<Text style={{
          fontFamily: 'Tajawal',
          textAlign: 'right',
          marginVertical: 12
        }}>الملاحظات والتوصيات</Text><TextInput accessibilityLabel="الملاحظات والتوصيات" multiline value={notes} maxLength={2000} onChangeText={setNotes} style={{
          fontFamily: 'Tajawal',
          minHeight: 120,
          borderWidth: 1,
          borderColor: '#ded9cf',
          borderRadius: 16,
          padding: 16,
          textAlign: 'right',
          backgroundColor: '#fff'
        }} />{button(busy ? 'جارٍ الحفظ…' : 'حفظ التقييم', async () => {
          setBusy(true);
          setError('');
          setMessage('');
          try {
            const r = await evaluationRequest(activityId, section, {
              subjectId: selected.id,
              answers,
              notes,
              expected: selected.evaluation?.updatedAt || null
            });
            setSelected(p => ({
              ...p,
              evaluation: r.evaluation
            }));
            setSubjects(s => s.map(p => p.id === selected.id ? {
              ...p,
              evaluation: r.evaluation
            } : p));
            setMessage('تم حفظ التقييم.');
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }, busy || questions.some(([id]) => !answers[id]))}</> : <Text style={{
        fontFamily: 'Tajawal',
        textAlign: 'right',
        paddingVertical: 20
      }}>سيُتاح النموذج بعد اعتماد أسئلة التقييم.</Text>}</>}{!!error && <Text accessibilityRole="alert" style={{
      color: '#b32e20',
      textAlign: 'right'
    }}>{error}</Text>}{!!message && <Text accessibilityRole="status" style={{
      color: '#217047',
      textAlign: 'right'
    }}>{message}</Text>}</View>;
}

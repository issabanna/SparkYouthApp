import React, {useState} from 'react';
import {View, Text, Pressable, StyleSheet} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {apiRequest} from './auth-client';
const version = require('./app.json').expo.version;
export default function ConnectionRecovery({error, onRetry, onLogin}) {
  const [checking, setChecking] = useState(false), [result, setResult] = useState('');
  return <View style={s.card}>
    <View style={s.icon}><Ionicons name="cloud-offline-outline" size={30} color="#9c7520" /></View>
    <Text style={s.title}>تعذّر استعادة اتصال حسابك</Text>
    <Text style={s.body}>لم يكتمل التحقق من جلستك. يمكنك إعادة الاتصال أو العودة إلى تسجيل الدخول. بيانات حسابك المحفوظة على الخادم باقية.</Text>
    <Text accessibilityRole="alert" style={s.error}>{error}</Text>
    <Pressable accessibilityRole="button" disabled={checking} onPress={onRetry} style={s.primary}><Text style={s.label}>إعادة الاتصال</Text></Pressable>
    <Pressable accessibilityRole="button" disabled={checking} onPress={onLogin} style={s.secondary}><Text style={s.label}>العودة إلى تسجيل الدخول</Text></Pressable>
    <Pressable accessibilityRole="button" disabled={checking} style={s.secondary} onPress={async () => {
      setChecking(true);setResult('');
      try {
        const status = await apiRequest('/api/auth', {credentials: 'omit'});
        setResult(status.configured ? 'الوصول العام للخادم ناجح. أعد الاتصال بحسابك.' : 'خدمة الحسابات غير جاهزة.');
      } catch (e) {setResult(`${e.message}${e.diagnostic ? '\n' + e.diagnostic : ''}`);}
      finally {setChecking(false);}
    }}><Text style={s.label}>{checking ? 'جارٍ فحص الاتصال…' : 'فحص اتصال التطبيق'}</Text></Pressable>
    {!!result && <Text role="status" accessibilityLiveRegion="polite" selectable style={s.body}>{result}</Text>}
    <Text style={s.version}>Android / Web · {version}</Text>
  </View>;
}
const s = StyleSheet.create({
  card:{backgroundColor:'#fff',borderRadius:24,padding:22,gap:14,borderWidth:1,borderColor:'#e9e2d4'},
  icon:{alignSelf:'center',backgroundColor:'#fff4d4',padding:16,borderRadius:22},
  title:{fontFamily:'TajawalBold',fontSize:22,textAlign:'right',color:'#393429'},
  body:{fontFamily:'Tajawal',fontSize:16,lineHeight:26,textAlign:'right',color:'#817765'},
  error:{fontFamily:'Tajawal',fontSize:14,textAlign:'right',color:'#b43024'},
  primary:{backgroundColor:'#ffda00',borderRadius:15,padding:16},secondary:{backgroundColor:'#f3efe5',borderRadius:15,padding:16},
  label:{fontFamily:'TajawalBold',fontSize:16,textAlign:'center',color:'#4b412b'},version:{fontSize:12,color:'#9a927f',textAlign:'center'}
});

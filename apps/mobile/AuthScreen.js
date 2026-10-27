import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Platform } from 'react-native';
import { signIn, signUp, changePassword, apiRequest } from './auth-client';
const Button = ({
  children,
  onPress,
  disabled,
  secondary
}) => <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[s.button, secondary && {
  backgroundColor: '#eeeae2'
}, disabled && {
  opacity: .5
}]}><Text style={[s.buttonText, secondary && {
    color: '#3b372f'
  }]}>{children}</Text></Pressable>;
export default function AuthScreen({
  onAuthenticated
}) {
  const [mode, setMode] = useState('login'),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [confirm, setConfirm] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const submit = async () => {
    setError('');
    setMessage('');
    if (mode === 'signup' && (password.length < 8 || password !== confirm)) {
      setError('اختر كلمة سر من 8 أحرف على الأقل وتأكد من تطابقها.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'login') {
        const user = await signIn(email.trim(), password);
        setPassword('');
        setConfirm('');
        await onAuthenticated(user);
      } else {
        const result = await signUp(email.trim(), password);
        setPassword('');
        setConfirm('');
        if (result.user) await onAuthenticated(result.user);else {
          setMode('login');
          setMessage('أرسلنا رسالة تأكيد إلى بريدك الإلكتروني. افتح الرابط ثم سجّل الدخول.');
        }
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return <View style={s.card}><Text style={s.title}>{mode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}</Text><Text style={s.label}>البريد الإلكتروني</Text><TextInput accessibilityLabel="البريد الإلكتروني" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" maxLength={254} style={s.input} /><Text style={s.label}>كلمة السر</Text><TextInput accessibilityLabel="كلمة السر" value={password} onChangeText={setPassword} secureTextEntry autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} maxLength={128} style={s.input} />{mode === 'signup' && <><Text style={s.label}>تأكيد كلمة السر</Text><TextInput accessibilityLabel="تأكيد كلمة السر" value={confirm} onChangeText={setConfirm} secureTextEntry autoComplete="new-password" maxLength={128} style={s.input} /><Text style={s.text}>8 أحرف على الأقل.</Text></>}{!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}{!!message && <Text accessibilityRole="status" style={s.text}>{message}</Text>}{Platform.OS !== 'web' && !!error && <Button secondary disabled={busy} onPress={async () => {
      setBusy(true);
      setMessage('');
      try {
        const result = await apiRequest('/api/auth');
        setMessage(result.configured ? 'الاتصال بالخادم ناجح. جرّب تسجيل الدخول مجددًا. (Android 0.1.5)' : 'خدمة الحسابات غير جاهزة. (Android 0.1.5)');
      } catch (e) {
        setMessage(`فحص الاتصال: ${e.message} — Android 0.1.5`);
      } finally { setBusy(false); }
    }}>فحص اتصال التطبيق</Button>}<Button disabled={busy || !email.trim() || !password} onPress={submit}>{busy ? 'جارٍ المتابعة…' : mode === 'login' ? 'دخول' : 'إنشاء الحساب'}</Button><Button secondary disabled={busy} onPress={() => {
      setMode(mode === 'login' ? 'signup' : 'login');
      setPassword('');
      setConfirm('');
      setError('');
      setMessage('');
    }}>{mode === 'login' ? 'إنشاء حساب جديد' : 'لديّ حساب — تسجيل الدخول'}</Button></View>;
}
export function ChangePassword() {
  const [old, setOld] = useState(''),
    [password, setPassword] = useState(''),
    [confirm, setConfirm] = useState(''),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  return <View style={s.card}><Text style={s.title}>تعديل كلمة السر</Text>{[['كلمة السر الحالية', old, setOld], ['كلمة السر الجديدة', password, setPassword], ['تأكيد كلمة السر الجديدة', confirm, setConfirm]].map(([label, value, set]) => <View key={label}><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={set} secureTextEntry maxLength={128} style={s.input} /></View>)}{!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}{!!message && <Text accessibilityRole="status" style={s.text}>{message}</Text>}<Button disabled={busy || !old || !password || !confirm} onPress={async () => {
      setError('');
      setMessage('');
      if (password.length < 8 || password !== confirm) {
        setError('كلمة السر الجديدة يجب أن تتطابق وتكون 8 أحرف على الأقل.');
        return;
      }
      setBusy(true);
      try {
        await changePassword(old, password);
        setOld('');
        setPassword('');
        setConfirm('');
        setMessage('تم تحديث كلمة السر.');
      } catch (e) {
        setError(e.message);
      } finally {
        setBusy(false);
      }
    }}>{busy ? 'جارٍ الحفظ…' : 'حفظ كلمة السر'}</Button></View>;
}
const s = StyleSheet.create({
  card: {
    gap: 10,
    marginVertical: 14
  },
  title: {
    fontFamily: 'TajawalBold',
    fontSize: 24,
    textAlign: 'right'
  },
  label: {
    fontFamily: 'Tajawal',
    fontSize: 15,
    textAlign: 'right',
    marginTop: 8
  },
  input: {
    fontFamily: 'Tajawal',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ded9cf',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#fff'
  },
  button: {
    backgroundColor: '#ef8427',
    padding: 16,
    borderRadius: 16,
    marginVertical: 5
  },
  buttonText: {
    fontFamily: 'TajawalBold',
    color: '#fff',
    textAlign: 'center',
    fontSize: 16
  },
  text: {
    fontFamily: 'Tajawal',
    textAlign: 'right',
    lineHeight: 24,
    color: '#555047'
  },
  error: {
    fontFamily: 'Tajawal',
    textAlign: 'right',
    lineHeight: 24,
    color: '#b33022'
  }
});

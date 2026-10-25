import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { accountRequest } from './registration-client';
const {
  accountFields
} = require('../../packages/shared/leaders');
export default function AccountIdentity({
  initial,
  onSaved,
  cityOptions = []
}) {
  const [details, setDetails] = useState(initial || Object.fromEntries([...accountFields.map(([k]) => [k, '']), ['gender', '']])),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => { if (initial) setDetails(initial); }, [initial]);
  const update = (k, v) => setDetails(d => ({
    ...d,
    [k]: v
  }));
  const input = {
    fontFamily: 'Tajawal',
    borderWidth: 1,
    borderColor: '#ded9cf',
    padding: 14,
    borderRadius: 15,
    backgroundColor: '#fff',
    textAlign: 'right',
    fontSize: 16
  };
  return <View style={{
    gap: 12
  }}><Text style={{
      fontFamily: 'TajawalBold',
      fontSize: 22,
      textAlign: 'right'
    }}>معلومات الحساب</Text>{accountFields.map(([key, label]) => <View key={key}><Text style={{
        fontFamily: 'Tajawal',
        textAlign: 'right',
        marginVertical: 8
      }}>{label}</Text>{key === 'city' && cityOptions.length ? <Picker accessibilityLabel={label} selectedValue={details[key]} onValueChange={v => update(key, v)}><Picker.Item label="اختر المدينة" value="" />{cityOptions.map(c => <Picker.Item key={c} label={c} value={c} />)}</Picker> : <TextInput accessibilityLabel={label} style={input} value={details[key]} maxLength={200} keyboardType={key === 'phone' ? 'phone-pad' : 'default'} onChangeText={v => update(key, v)} />}</View>)}<Text style={{
      fontFamily: 'Tajawal',
      textAlign: 'right'
    }}>الجنس</Text><Picker accessibilityLabel="الجنس" selectedValue={details.gender} onValueChange={v => update('gender', v)}><Picker.Item label="اختر الجنس" value="" /><Picker.Item label="ذكر" value="male" /><Picker.Item label="أنثى" value="female" /></Picker>{!!error && <Text accessibilityRole="alert" style={{
      color: '#b32e20',
      textAlign: 'right'
    }}>{error}</Text>}<Pressable accessibilityRole="button" disabled={busy} onPress={async () => {
      setBusy(true);
      setError('');
      try {
        const result = await accountRequest({
          details
        });
        onSaved(result.account);
      } catch (e) {
        setError(e.message);
      } finally {
        setBusy(false);
      }
    }} style={{
      backgroundColor: '#ef8427',
      padding: 16,
      borderRadius: 16
    }}><Text style={{
        fontFamily: 'TajawalBold',
        textAlign: 'center',
        color: '#fff'
      }}>{busy ? 'جارٍ الحفظ…' : 'حفظ ومتابعة'}</Text></Pressable></View>;
}

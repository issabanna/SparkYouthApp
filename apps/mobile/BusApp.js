import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, TextInput, Platform } from 'react-native';
import { busRequest } from './registration-client';
function CameraScanner({
  onScan,
  onClose
}) {
  const video = useRef(null),
    [error, setError] = useState('');
  useEffect(() => {
    let stream,
      active = true,
      timer,
      reading = false;
    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia || !globalThis.BarcodeDetector) throw Error('المسح المباشر غير مدعوم في هذا المتصفح. استخدم Chrome على أندرويد أو أدخل محتوى QR أدناه.');
        const detector = new globalThis.BarcodeDetector({
          formats: ['qr_code']
        });
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment'
          },
          audio: false
        });
        if (!active) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        video.current.srcObject = stream;
        await video.current.play();
        const detect = async () => {
          if (!active) return;
          if (!reading) {
            reading = true;
            try {
              const codes = await detector.detect(video.current);
              if (codes.length) {
                onScan(codes[0].rawValue);
                return;
              }
            } catch {} finally {
              reading = false;
            }
          }
          timer = setTimeout(detect, 250);
        };
        detect();
      } catch (e) {
        if (active) setError(e.message);
      }
    }
    start();
    return () => {
      active = false;
      clearTimeout(timer);
      stream?.getTracks().forEach(t => t.stop());
    };
  }, []);
  return <View>{!error && React.createElement('video', {
      ref: video,
      autoPlay: true,
      playsInline: true,
      muted: true,
      style: {
        width: '100%',
        maxHeight: 320,
        borderRadius: 18
      }
    })}{!!error && <Text style={{
      color: '#b32e20',
      textAlign: 'right'
    }}>{error}</Text>}<Pressable accessibilityRole="button" onPress={onClose} style={{
      padding: 16
    }}><Text>إغلاق الكاميرا</Text></Pressable></View>;
}
export default function BusApp({
  activities
}) {
  const [activity, setActivity] = useState(null),
    [totals, setTotals] = useState(null),
    [camper, setCamper] = useState(null),
    [code, setCode] = useState(''),
    [scanning, setScanning] = useState(false),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const requestId = useRef(0);
  const refresh = async () => {
    if (!activity) return;
    const id = ++requestId.current;
    try {
      const r = await busRequest(null, activity.id);
      if (id === requestId.current) {
        setTotals(r.totals);
        setError('');
      }
    } catch (e) {
      if (id === requestId.current) setError(e.message);
    }
  };
  useEffect(() => {
    setCamper(null);
    setTotals(null);
    setCode('');
    setScanning(false);
    refresh();
    const t = setInterval(refresh, 15000);
    return () => {
      clearInterval(t);
      requestId.current++;
    };
  }, [activity?.id]);
  const act = async body => {
    setBusy(true);
    setError('');
    setScanning(false);
    if (body.action === 'scan') setCamper(null);
    try {
      const r = await busRequest({
        ...body,
        activityId: activity.id
      });
      setCamper(r.camper);
      setTotals(r.totals);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const button = (label, onPress, disabled = false) => <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={{
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#ef8427',
    marginVertical: 7,
    opacity: disabled ? .5 : 1
  }}><Text style={{
      fontFamily: 'TajawalBold',
      color: '#fff',
      textAlign: 'center'
    }}>{label}</Text></Pressable>;
  return <View><Text style={{
      fontFamily: 'TajawalBold',
      fontSize: 24,
      textAlign: 'right',
      marginVertical: 20
    }}>إدارة الحافلات</Text>{!activity ? <><Text style={{
        fontFamily: 'Tajawal',
        textAlign: 'right'
      }}>اختر المخيم / النشاط المكلف به</Text>{activities.map(a => <View key={a.id}>{button(a.title, () => setActivity(a))}</View>)}</> : <>{button('تغيير المخيم', () => setActivity(null), busy)}<Text style={{
        fontFamily: 'TajawalBold',
        fontSize: 20,
        textAlign: 'right'
      }}>{activity.title}</Text>{totals && <View style={{
        padding: 18,
        backgroundColor: '#fff1e0',
        borderRadius: 18,
        marginVertical: 12
      }}><Text style={{
          fontFamily: 'Tajawal',
          textAlign: 'right'
        }}>المسجلون: {totals.registered} · صعدوا: {totals.boarded} · المتبقون: {totals.pending}</Text></View>}{button('مسح QR', () => {
        setCamper(null);
        setError('');
        setScanning(true);
      }, busy)}{scanning && (Platform.OS === 'web' ? <CameraScanner onScan={value => act({
        action: 'scan',
        code: value
      })} onClose={() => setScanning(false)} /> : <Text>المسح متاح حاليًا من موقع التطبيق في Chrome على أندرويد.</Text>)}<TextInput accessibilityLabel="محتوى رمز QR" value={code} onChangeText={setCode} placeholder="محتوى QR للتحقق اليدوي" style={{
        borderWidth: 1,
        borderColor: '#ded9cf',
        padding: 15,
        borderRadius: 15,
        backgroundColor: '#fff'
      }} />{button('التحقق من الرمز', () => act({
        action: 'scan',
        code
      }), busy || !code.trim())}{camper && <View style={{
        padding: 20,
        borderRadius: 18,
        backgroundColor: '#fff',
        marginTop: 14
      }}><Text style={{
          fontFamily: 'TajawalBold',
          fontSize: 24,
          textAlign: 'right'
        }}>{camper.name}</Text><Text style={{
          fontFamily: 'Tajawal',
          textAlign: 'right'
        }}>حالة التسجيل: {camper.statusLabel}</Text><Text style={{
          fontFamily: 'Tajawal',
          textAlign: 'right'
        }}>{camper.boarded ? 'تم تسجيل صعوده للحافلة' : camper.canBoard ? 'لم يصعد بعد' : 'التسجيل غير معتمد؛ لا يسمح بتسجيل الصعود'}</Text>{button(camper.boarded ? 'تم الصعود' : 'تسجيل الصعود للحافلة', () => act({
          action: 'board',
          id: camper.id
        }), busy || !camper.canBoard)}</View>}{button('تحديث الأعداد', refresh, busy)}</>}{!!error && <Text accessibilityRole="alert" style={{
      fontFamily: 'Tajawal',
      color: '#b32e20',
      textAlign: 'right',
      padding: 12
    }}>{error}</Text>}</View>;
}

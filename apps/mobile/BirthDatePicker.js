import React, { useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
const iso = (year, month, day) => `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
export default function BirthDatePicker({ value, minimum, maximum, onChange, error }) {
  const today = new Date().toISOString().slice(0,10);
  const min = minimum || '1900-01-01', max = maximum && maximum < today ? maximum : today;
  const [open,setOpen]=useState(false),[year,setYear]=useState(2000),[month,setMonth]=useState(1);
  const firstYear=Number(min.slice(0,4)), lastYear=Number(max.slice(0,4));
  const show=()=>{const date=value || min;setYear(Number(date.slice(0,4)));setMonth(Number(date.slice(5,7)));setOpen(true)};
  const days=new Date(year,month,0).getDate(), offset=new Date(year,month-1,1).getDay();
  return <View>
    <Text style={s.label}>تاريخ الميلاد</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="اختيار تاريخ الميلاد" onPress={show} style={s.input}><Text>{value || 'اختر تاريخ الميلاد'} ▦</Text></Pressable>
    {!!error && <Text style={s.error}>{error}</Text>}
    <Modal visible={open} transparent animationType="fade" onRequestClose={()=>setOpen(false)}>
      <View style={s.overlay}><View style={s.panel}><ScrollView>
        <Text style={s.title}>اختيار تاريخ الميلاد</Text>
        <Text>اختر السنة والشهر ثم اضغط على اليوم</Text>
        <View style={s.row}>
          <Picker accessibilityLabel="سنة الميلاد" selectedValue={year} onValueChange={setYear} style={s.picker}>
            {Array.from({length:Math.max(0,lastYear-firstYear+1)},(_,i)=>firstYear+i).map(y=><Picker.Item key={y} label={String(y)} value={y}/>)}
          </Picker>
          <Picker accessibilityLabel="شهر الميلاد" selectedValue={month} onValueChange={setMonth} style={s.picker}>
            {Array.from({length:12},(_,i)=>i+1).map(m=><Picker.Item key={m} label={String(m)} value={m}/>)}
          </Picker>
        </View>
        <View style={s.grid}>
          {['أحد','إثن','ثلا','أرب','خمي','جمع','سبت'].map(d=><Text key={d} style={s.weekday}>{d}</Text>)}
          {Array.from({length:offset},(_,i)=><View key={'empty'+i} style={s.day}/>)}
          {Array.from({length:days},(_,i)=>i+1).map(day=>{const date=iso(year,month,day),disabled=date<min||date>max;return <Pressable key={day} accessibilityRole="button" accessibilityLabel={date} disabled={disabled} style={[s.day,disabled&&s.disabled,value===date&&s.selected]} onPress={()=>{onChange(date);setOpen(false)}}><Text>{day}</Text></Pressable>})}
        </View>
        <Pressable accessibilityRole="button" onPress={()=>setOpen(false)} style={s.close}><Text>إلغاء</Text></Pressable>
      </ScrollView></View></View>
    </Modal>
  </View>;
}
const s=StyleSheet.create({label:{textAlign:'right',marginVertical:8,color:'#625f55'},input:{padding:16,borderWidth:1,borderColor:'#e6e0d3',borderRadius:18,backgroundColor:'#fff',alignItems:'flex-end'},error:{color:'#b53b30'},overlay:{flex:1,backgroundColor:'rgba(0,0,0,.35)',justifyContent:'center',padding:20},panel:{backgroundColor:'#fff',borderRadius:24,padding:20,maxHeight:'90%',width:'100%',maxWidth:420,alignSelf:'center'},title:{fontSize:20,fontWeight:'700',textAlign:'right',marginBottom:12},row:{flexDirection:'row'},picker:{flex:1},grid:{flexDirection:'row',flexWrap:'wrap'},weekday:{width:'14.2857%',textAlign:'center',fontSize:11,paddingVertical:10},day:{width:'14.2857%',height:42,alignItems:'center',justifyContent:'center',borderRadius:12},disabled:{opacity:.2},selected:{backgroundColor:'#ffda00'},close:{padding:16,alignItems:'center',marginTop:12}});

import React,{forwardRef} from 'react';
import {View,Platform,StyleSheet} from 'react-native';
import {Picker as NativePicker} from '@react-native-picker/picker';
export const Picker=forwardRef(function SparkPicker({style,enabled=true,itemStyle,...props},ref){
 if(Platform.OS==='web')return <NativePicker ref={ref} {...props} enabled={enabled} style={[s.control,style]}/>;
 const flat=StyleSheet.flatten(style)||{},layout={};
 for(const key of ['flex','flexGrow','flexShrink','width','minWidth','maxWidth','margin','marginTop','marginBottom','marginHorizontal'])if(flat[key]!==undefined)layout[key]=flat[key];
 return <View style={[s.frame,layout,!enabled&&{opacity:.5}]}><NativePicker ref={ref} {...props} enabled={enabled} mode="dropdown" dropdownIconColor="#6e685d" itemStyle={[{fontFamily:'Tajawal',fontSize:16},itemStyle]} style={[s.control,style,{height:Platform.OS==='ios'?180:54,width:'100%',backgroundColor:'transparent'}]}/></View>;
});
Picker.Item=NativePicker.Item;
const s=StyleSheet.create({frame:{minHeight:54,borderWidth:1,borderColor:'#ded9cf',borderRadius:16,backgroundColor:'#fff',overflow:'hidden'},control:{fontFamily:'Tajawal',fontSize:16,color:'#302e28',height:54,minHeight:52,width:'100%',backgroundColor:'#fff'}});

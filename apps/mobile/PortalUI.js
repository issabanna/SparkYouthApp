import React from 'react';
import {View, Text, Pressable, Image, StyleSheet} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
export const portalStyles = StyleSheet.create({
  page:{gap:18}, card:{backgroundColor:'#fff',borderRadius:22,borderWidth:1,borderColor:'#ece6dc',padding:18,gap:12},
  title:{fontFamily:'TajawalBold',fontSize:26,textAlign:'right',color:'#302c25'},heading:{fontFamily:'TajawalBold',fontSize:19,textAlign:'right',color:'#39342b'},
  text:{fontFamily:'Tajawal',fontSize:16,lineHeight:26,textAlign:'right',color:'#70695d'},muted:{fontFamily:'Tajawal',fontSize:13,lineHeight:21,textAlign:'right',color:'#938a79'},
  row:{flexDirection:'row-reverse',alignItems:'center',gap:12},badge:{fontFamily:'TajawalBold',fontSize:12,color:'#8b6a19',backgroundColor:'#fff1c9',paddingHorizontal:12,paddingVertical:6,borderRadius:12,overflow:'hidden',alignSelf:'flex-end'},
  action:{flexDirection:'row-reverse',alignItems:'center',gap:12,backgroundColor:'#fff',borderRadius:18,borderWidth:1,borderColor:'#ece6dc',padding:15,minHeight:64},
  icon:{width:40,height:40,borderRadius:13,backgroundColor:'#faf3df',alignItems:'center',justifyContent:'center'},actionTitle:{fontFamily:'TajawalBold',fontSize:16,textAlign:'right',color:'#40392d'},
  back:{flexDirection:'row-reverse',alignItems:'center',gap:8,minHeight:44,alignSelf:'flex-end',paddingVertical:7},
  empty:{padding:24,alignItems:'center',gap:12,backgroundColor:'#f8f5ec',borderRadius:20},
  avatar:{width:76,height:76,borderRadius:25,backgroundColor:'#f7efd9',alignItems:'center',justifyContent:'center'},
  label:{fontFamily:'TajawalMedium',fontSize:14,color:'#8b8170',textAlign:'right'},
});
export function Surface({children,style}) {return <View style={[portalStyles.card,style]}>{children}</View>;}
export function Badge({children,complete=false}) {return <Text style={[portalStyles.badge,complete && {backgroundColor:'#edf5e9',color:'#507444'}]}>{children}</Text>;}
export function BackLink({label,onPress,disabled}) {return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={[portalStyles.back,disabled && {opacity:.45}]}><Ionicons name="arrow-forward" size={18} color="#84733b"/><Text style={portalStyles.text}>{label}</Text></Pressable>;}
export function PortalAction({label,subtitle,icon='chevron-back',onPress,disabled,accent=false}) {
 return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={({pressed})=>[portalStyles.action,accent && {backgroundColor:'#fff5dc',borderColor:'#efdfad'},pressed && {opacity:.7},disabled && {opacity:.45}]}>
  <View style={portalStyles.icon}><Ionicons name={icon} size={21} color="#9a792a"/></View><View style={{flex:1,gap:4}}><Text style={portalStyles.actionTitle}>{label}</Text>{!!subtitle && <Text style={portalStyles.muted}>{subtitle}</Text>}</View><Ionicons name="chevron-back" size={17} color="#b4aa96"/>
 </Pressable>;
}
export function SectionTitle({title,subtitle}) {return <View style={{gap:5}}><Text style={portalStyles.heading}>{title}</Text>{!!subtitle && <Text style={portalStyles.muted}>{subtitle}</Text>}</View>;}
export function EmptyState({icon='leaf-outline',children}) {return <View style={portalStyles.empty}><Ionicons name={icon} size={30} color="#b59b55"/><Text style={[portalStyles.text,{textAlign:'center'}]}>{children}</Text></View>;}
export function PersonAvatar({name,photo,size=76}) {return photo ? <Image source={{uri:photo}} style={[portalStyles.avatar,{width:size,height:size,borderRadius:size*.3}]} /> : <View style={[portalStyles.avatar,{width:size,height:size,borderRadius:size*.3}]}><Text style={{fontFamily:'TajawalBold',fontSize:size*.34,color:'#a58a42'}}>{name?.trim()?.[0] || '•'}</Text></View>;}
export function InfoLine({label,value}) {return <View style={{gap:5,paddingVertical:9}}><Text style={portalStyles.label}>{label}</Text><Text selectable style={portalStyles.text}>{value || '—'}</Text></View>;}

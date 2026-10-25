import {Platform} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
const key='spark-registration-session-v1';
const origin=Platform.OS==='web'?'':'https://sparkyouth.vercel.app';
let session;
async function token(){
 if(session)return session;
 let saved;
 if(Platform.OS==='web')saved=localStorage.getItem(key);
 else try{saved=await FileSystem.readAsStringAsync(FileSystem.documentDirectory+key);}catch{}
 if(/^[a-f0-9]{64}$/.test(saved||'')){session=saved;return saved;}
 const result=await request('/api/registrations/session',{method:'POST'});
 if(result.shared===false)return null;
 if(!/^[a-f0-9]{64}$/.test(result.token||''))throw Error('تعذّر فتح جلسة التسجيل.');
 if(Platform.OS==='web')localStorage.setItem(key,result.token);
 else await FileSystem.writeAsStringAsync(FileSystem.documentDirectory+key,result.token);
 session=result.token;return session;
}
async function request(path,options={}){
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),30000);
 try{
  const response=await fetch(origin+path,{cache:'no-store',...options,signal:controller.signal});
  const result=await response.json();if(!response.ok)throw Error(result.error||'تعذّر الاتصال بخادم التسجيل.');return result;
 }finally{clearTimeout(timeout)}
}
export async function registrationRequest(body){
 const value=await token();if(!value)return {shared:false};
 return request('/api/registrations',{method:body?'POST':'GET',headers:{Authorization:'Bearer '+value,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
}

export async function leaderRequest(body){const value=await token();if(!value)throw Error('خدمة المرشدين تحتاج اتصالًا بالخادم.');return request('/api/leaders',{method:body?'POST':'GET',headers:{Authorization:'Bearer '+value,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});}

export async function accountRequest(body){const value=await token();if(!value)throw Error('خدمة الحساب تحتاج اتصالًا بالخادم.');return request('/api/account',{method:body?'POST':'GET',headers:{Authorization:'Bearer '+value,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});}
export async function busRequest(body,activityId){const value=await token();if(!value)throw Error('خدمة الحافلات تحتاج اتصالًا بالخادم.');return request('/api/bus'+(activityId?'?activity='+encodeURIComponent(activityId):''),{method:body?'POST':'GET',headers:{Authorization:'Bearer '+value,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});}

export async function evaluationRequest(activity,section,body){const value=await token();if(!value)throw Error('التقييم يحتاج اتصالًا بالخادم.');return request('/api/leader-evaluations'+(!body?'?activity='+encodeURIComponent(activity)+'&section='+encodeURIComponent(section):''),{method:body?'POST':'GET',headers:{Authorization:'Bearer '+value,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify({...body,activityId:activity,section})}:{})});}
export async function leaderPersonRequest(activity,section,id){const value=await token();if(!value)throw Error('يلزم الاتصال بالخادم.');return request('/api/leader-person?'+new URLSearchParams({activity,section,id}),{headers:{Authorization:'Bearer '+value}});}

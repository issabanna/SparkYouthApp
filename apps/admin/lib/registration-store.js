import {createClient} from '@supabase/supabase-js';
const client=()=>createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
async function rpc(name,args){const {data,error}=await client().rpc(name,args);if(error)throw error;return data;}
export const listRegistrations=(owner=null)=>rpc('spark_registration_list',{p_owner_hash:owner});
export const registrationOccupancy=()=>rpc('spark_registration_occupancy');
export async function getRegistration(id){const {data,error}=await client().from('spark_registrations').select('owner_hash,record').eq('id',id).maybeSingle();if(error)throw error;return data;}
export async function mutateRegistration(activityId,ownerHash,transform){
 for(let attempt=0;attempt<5;attempt++){
  const snapshot=await rpc('spark_registration_snapshot',{p_activity:activityId});
  const record=await transform(snapshot.records);
  if(await rpc('spark_registration_commit',{p_activity:activityId,p_version:snapshot.version,p_owner_hash:ownerHash,p_record:record}))return record;
 }
 throw new Error('تغيرت الأماكن أثناء التسجيل. يرجى إعادة المحاولة.');
}
export function displayRegistration(record,admin=false){
 const {ownerKey,hasReceipt,hasIdDocument,auditLog,paymentWaiver,...safe}=record;
 if(admin){safe.auditLog=auditLog||[];if(paymentWaiver)safe.paymentWaiver=paymentWaiver;}
 if(hasReceipt)safe.receipt=admin?{uri:`/api/admin/registrations/${encodeURIComponent(record.id)}/image?kind=receipt`}:{};
 if(hasIdDocument)safe.details={...safe.details,idDocument:admin?{uri:`/api/admin/registrations/${encodeURIComponent(record.id)}/image?kind=id`}:{}};
 return safe;
}

export function registrationIndex(records,{page=1,query='',activity='',status=''}={}){
 const matches=records.filter(r=>(!activity||r.activityId===activity)&&(!status||r.status===status)&&(!query||[r.details.arabicFullName,r.details.englishFullName,r.details.firstName,r.details.lastName,r.reference].filter(Boolean).join(' ').toLocaleLowerCase().includes(query.toLocaleLowerCase())));
 const pageSize=25,total=matches.length,current=Math.max(1,Math.min(Number(page)||1,Math.max(1,Math.ceil(total/pageSize))));
 return {page:current,total,pageSize,records:matches.slice((current-1)*pageSize,current*pageSize).map(r=>({id:r.id,activityId:r.activityId,activityTitle:r.activityTitle,status:r.status,receiptStatus:r.receiptStatus,paymentRequired:r.paymentRequired,details:{arabicFullName:r.details.arabicFullName,englishFullName:r.details.englishFullName,firstName:r.details.firstName,lastName:r.details.lastName}})),
 occupancy:records.map(r=>({id:r.id,activityId:r.activityId,status:r.status,receiptStatus:r.receiptStatus,paymentRequired:r.paymentRequired,details:{tentNumber:r.details.tentNumber}}))};
}

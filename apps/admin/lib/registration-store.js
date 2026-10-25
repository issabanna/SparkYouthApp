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
 const {ownerKey,hasReceipt,hasIdDocument,...safe}=record;
 if(hasReceipt)safe.receipt=admin?{uri:`/api/admin/registrations/${encodeURIComponent(record.id)}/image?kind=receipt`}:{};
 if(hasIdDocument)safe.details={...safe.details,idDocument:admin?{uri:`/api/admin/registrations/${encodeURIComponent(record.id)}/image?kind=id`}:{}};
 return safe;
}

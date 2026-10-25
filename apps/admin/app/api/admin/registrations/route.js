import shared from '../../../../../../packages/shared';
import service from '../../../../lib/content-service.cjs';
import {reply,registrationContent,unavailable} from '../../../../lib/registration-service';
import {listRegistrations,getRegistration,mutateRegistration,displayRegistration} from '../../../../lib/registration-store';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request){
 if(!service.authenticated(request))return reply({error:'تسجيل دخول الإدارة مطلوب.'},401);
 try{return reply({records:(await listRegistrations()).map(r=>displayRegistration(r,true))});}catch{return unavailable();}
}
export async function POST(request){
 if(!service.authenticated(request)||!service.sameOrigin(request))return reply({error:'تسجيل دخول الإدارة مطلوب.'},401);
 let body;try{body=await request.json();}catch{return reply({error:'طلب غير صالح.'},400);}
 try{
  const row=await getRegistration(body.id);if(!row)return reply({error:'الطلب غير موجود.'},404);
  const content=await registrationContent();
  await mutateRegistration(row.record.activityId,row.owner_hash,async records=>{
   const fresh=await getRegistration(body.id);if(!fresh)throw Error('الطلب غير موجود.');
   const current=records.map(r=>r.id===body.id?fresh.record:r);
   let result,action,reason='';
   const actor=service.adminSessionActor(request);
   if(body.action==='receipt'){
    action=body.decision==='accepted'?'receipt_accepted_and_approved':'receipt_rejected';
    reason=String(body.note||'').slice(0,1000);
    result=shared.reviewReceipt(current,body.id,body.decision,String(body.note||'').slice(0,1000));
    if(!result.error&&body.decision==='accepted')result=shared.changeRegistrationStatus(result.records,body.id,'Confirmed',content.activities);
   }else if(body.action==='approveWithoutReceipt'){
    action='approved_without_receipt';reason=typeof body.reason==='string'?body.reason.trim():'';
    result=shared.approveWithoutReceipt(current,body.id,content.activities,reason,actor,body.tent);
   }else if(body.action==='status'&&['Pending','Confirmed','Rejected'].includes(body.status)){
    if(body.status==='Confirmed'&&fresh.record.receiptStatus!=='accepted')throw Error('لتأكيد طلب بدون وصل، استخدم تأكيد الطلب بدون وصل وأدخل السبب.');
    action=body.status==='Pending'?'seat_allocated_payment_requested':body.status==='Confirmed'?'approved':'rejected';
    result=shared.changeRegistrationStatus(current,body.id,body.status,content.activities,body.tent);
   }else throw Error('إجراء غير صالح.');
   if(result.error)throw Error(result.error);
   return shared.appendRegistrationAction(result.records.find(r=>r.id===body.id),{action,actor,before:fresh.record,reason});
  });
  return reply({records:(await listRegistrations()).map(r=>displayRegistration(r,true))});
 }catch(error){if(error.code)return unavailable();return reply({error:error.message||'تعذّر تحديث الطلب.'},409);}
}

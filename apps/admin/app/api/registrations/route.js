import shared from '../../../../../packages/shared';
import service from '../../../lib/content-service.cjs';
import checker from '../../../lib/registration-image-check.cjs';
import {ownerHash,reply,registrationContent,ownerResponse,unavailable} from '../../../lib/registration-service';
import {getRegistration,mutateRegistration} from '../../../lib/registration-store';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request){
 if(!service.configured())return reply({shared:false});
 const owner=ownerHash(request);if(!owner)return reply({error:'جلسة التسجيل مطلوبة.'},401);
 try{return reply(await ownerResponse(owner));}catch{return unavailable();}
}
export async function POST(request){
 if(!service.configured())return reply({shared:false},503);
 const owner=ownerHash(request);if(!owner||!service.sameOrigin(request))return reply({error:'جلسة التسجيل مطلوبة.'},401);
 if(Number(request.headers.get('content-length'))>1600000)return reply({error:'الطلب كبير جدًا.'},413);
 let body;
 try{const text=await request.text();if(text.length>1600000)return reply({error:'الطلب كبير جدًا.'},413);body=JSON.parse(text);}catch{return reply({error:'طلب غير صالح.'},400);}
 try{
  if(body.action==='receipt')checker.parseImage(body.image?.uri);
  if(body.action==='submit'&&body.details?.idDocument)checker.parseImage(body.details.idDocument.uri);
  const content=await registrationContent();
  let row,activityId=body.activityId;
  if(body.action!=='submit'){
   row=await getRegistration(body.id);
   if(!row||row.owner_hash!==owner)return reply({error:'الطلب غير موجود.'},404);
   activityId=row.record.activityId;
  }
  const activity=content.activities.find(a=>a.id===activityId);
  if(!activity)return reply({error:'النشاط غير متاح.'},404);
  const user={id:owner,name:String(body.name||'مشارك').slice(0,120)};
  if(body.action==='submit'){
   if(!activity.published)return reply({error:'النشاط غير متاح.'},404);
   if(body.details?.idDocument&&activity.idImageCheckPolicy==='reject'){
    if(!process.env.OPENAI_API_KEY)return reply({error:'تعذّر فحص الصورة الآن. حاول لاحقًا.'},503);
    if(!checker.allowImageCheck(request))return reply({error:'وصلت للحد المؤقت لفحص الصور. حاول لاحقًا.'},429);
    body.details.idDocument.aiCheck=await checker.checkImage(body.details.idDocument.uri,{apiKey:process.env.OPENAI_API_KEY});
   }
  }
  const record=await mutateRegistration(activityId,owner,async records=>{
   let result;
   if(body.action==='submit'){
    if(records.filter(r=>r.ownerKey===owner).length>=50)throw Error('تجاوزت حد التسجيلات لهذا النشاط.');
    result=shared.submitRegistration({...activity,registrationTestMode:content.registrationTestMode===true},user,body.details||{},records,body.consent===true);
    if(result.error)throw Error(result.error);return result.record;
   }
   const fresh=await getRegistration(body.id);
   if(!fresh||fresh.owner_hash!==owner)throw Error('الطلب غير موجود.');
   const current=records.map(r=>r.id===body.id?fresh.record:r);
   if(body.action==='receipt')result=shared.saveReceipt(current,body.id,user,body.image,body.reference);
   else if(body.action==='cancel')result=shared.changeRegistrationStatus(current,body.id,'Cancelled',content.activities);
   else throw Error('إجراء غير صالح.');
   if(result.error)throw Error(result.error);
   return result.records.find(r=>r.id===body.id);
  });
  return reply({...await ownerResponse(owner),recordId:record.id});
 }catch(error){
  if(error.code||String(error.message).includes('fetch'))return unavailable();
  return reply({error:error.message||'تعذّر حفظ الطلب.'},409);
 }
}
